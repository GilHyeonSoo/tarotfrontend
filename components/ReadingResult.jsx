import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { useLanguage } from '../contexts/LanguageContext';
import { getSummaryCardIndex } from '../lib/spreads';
import { formatSpreadLabel, postSessionLog } from '../lib/sessionLog';
import SummaryCardViewer from './SummaryCardViewer';
import { API_URL } from '../lib/api';
import { requestReading } from '../lib/readingApi.mjs';
import { splitIntoSentences } from '../lib/readingText.mjs';
import './ReadingResult.css';

const parseMarkdown = (text) => {
    if (!text) return '';

    const parsed = text
        .replace(/## (.*?)(\n|$)/g, '<h2 class="md-h2">$1</h2>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/---/g, '<hr class="md-hr" />')
        .replace(/\n/g, '<br />');

    return DOMPurify.sanitize(parsed, {
        ALLOWED_TAGS: ['h2', 'strong', 'em', 'hr', 'br'],
        ALLOWED_ATTR: ['class'],
    });
};

const trimToCompleteSentences = (text) => {
    if (!text?.trim()) return text || '';
    const stripped = text.replace(/\s+$/u, '');
    if (/[.!?…。]["'”’」』]*\s*$/u.test(stripped)) return stripped;

    let lastEnd = -1;
    const pattern = /[.!?…。]["'”’」』]*/gu;
    let match = pattern.exec(stripped);
    while (match) {
        lastEnd = match.index + match[0].length;
        match = pattern.exec(stripped);
    }
    if (lastEnd <= 0) return stripped;
    return stripped.slice(0, lastEnd).replace(/\s+$/u, '');
};

// The end of the revealed text must rise to this fraction of the visible area
// (0 = top edge, 1 = bottom edge). Lower values reveal later, but the line must stay
// reachable at max scroll, which depends on the reveal spacer's min(55vh, 420px) height.
const REVEAL_TRIGGER_RATIO = 0.6;
const REVEAL_COOLDOWN_MS = 900;

const isDocumentScroller = (el) =>
    !el || el === document || el === document.documentElement || el === document.body;

const findScrollContainer = (node) => {
    for (let el = node?.parentElement; el && !isDocumentScroller(el); el = el.parentElement) {
        const { overflowY } = window.getComputedStyle(el);
        if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
            return el;
        }
    }
    return document.documentElement;
};

// Visible band of the scroller, clipped to the window (browser toolbars shrink it).
const getScrollView = (scroller) => {
    if (isDocumentScroller(scroller)) {
        return { scrollTop: window.scrollY, viewTop: 0, viewBottom: window.innerHeight };
    }
    const rect = scroller.getBoundingClientRect();
    return {
        scrollTop: scroller.scrollTop,
        viewTop: Math.max(rect.top, 0),
        viewBottom: Math.min(rect.bottom, window.innerHeight),
    };
};

const InterpretationContent = ({ sentences }) => {
    const [revealedCount, setRevealedCount] = useState(1);
    const lastRevealAtRef = useRef(0);
    const spacerRef = useRef(null);

    const hasMore = revealedCount < sentences.length;

    // Reveal is measured against the element that actually scrolls the text (the shell
    // content on the summary screen). Wheel/touch gestures are also counted: once the
    // scroller hits its bottom no scroll events fire, yet a downward gesture should
    // keep revealing.
    useEffect(() => {
        if (!hasMore) return undefined;

        let lastTop = null;
        let touchY = null;
        const getScroller = () => findScrollContainer(spacerRef.current);

        const tryReveal = () => {
            const now = Date.now();
            if (now - lastRevealAtRef.current < REVEAL_COOLDOWN_MS) return;

            const spacer = spacerRef.current;
            if (!spacer) return;
            const { viewTop, viewBottom } = getScrollView(getScroller());
            const triggerLine = viewTop + (viewBottom - viewTop) * REVEAL_TRIGGER_RATIO;
            if (spacer.getBoundingClientRect().top > triggerLine) return;

            lastRevealAtRef.current = now;
            setRevealedCount((count) => Math.min(count + 1, sentences.length));
        };

        const handleScroll = (event) => {
            const scroller = getScroller();
            const target = event.target === document ? document.documentElement : event.target;
            if (target !== scroller) return;
            const { scrollTop } = getScrollView(scroller);
            const previousTop = lastTop ?? scrollTop;
            lastTop = scrollTop;
            if (scrollTop > previousTop) tryReveal();
        };

        const handleWheel = (event) => {
            if (event.deltaY > 0) tryReveal();
        };

        const handleTouchStart = (event) => {
            touchY = event.touches[0]?.clientY ?? null;
        };

        const handleTouchMove = (event) => {
            const y = event.touches[0]?.clientY;
            if (touchY === null || y === undefined) return;
            if (touchY - y > 8) {
                touchY = y;
                tryReveal();
            }
        };

        const options = { capture: true, passive: true };
        document.addEventListener('scroll', handleScroll, options);
        document.addEventListener('wheel', handleWheel, options);
        document.addEventListener('touchstart', handleTouchStart, options);
        document.addEventListener('touchmove', handleTouchMove, options);
        return () => {
            document.removeEventListener('scroll', handleScroll, options);
            document.removeEventListener('wheel', handleWheel, options);
            document.removeEventListener('touchstart', handleTouchStart, options);
            document.removeEventListener('touchmove', handleTouchMove, options);
        };
    }, [hasMore, sentences.length]);

    const visibleSentences = sentences.slice(0, revealedCount);

    return (
        <div className="interpretation-content markdown-content">
            {visibleSentences.map((sentence, index) => (
                <div
                    key={index}
                    className="interpretation-sentence interpretation-sentence--revealed"
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(sentence) }}
                />
            ))}
            {hasMore && <div ref={spacerRef} className="interpretation-reveal-spacer" aria-hidden="true" />}
        </div>
    );
};

const ReadingResult = ({ selectedCards, spread, situation, onRestart, language }) => {
    const { t } = useLanguage();
    const [summaryText, setSummaryText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [summaryComplete, setSummaryComplete] = useState(false);
    const [scrollHintDismissed, setScrollHintDismissed] = useState(false);
    const [readingError, setReadingError] = useState(null);
    const [isRetrying, setIsRetrying] = useState(false);
    const requestRef = useRef(null);
    const sectionRef = useRef(null);

    const totalCards = selectedCards?.length || 0;
    const summaryIndex = getSummaryCardIndex(spread);
    const sentences = useMemo(
        () => (summaryComplete ? splitIntoSentences(summaryText) : []),
        [summaryText, summaryComplete]
    );
    const showScrollHint = sentences.length > 0 && !scrollHintDismissed;

    useEffect(() => {
        if (!summaryComplete) return;
        postSessionLog({
            completed: true,
            situation,
            spreadLabel: formatSpreadLabel(spread, t),
            language,
        });
    }, [summaryComplete, situation, spread, language, t]);

    // Hide the scroll cue on the first downward intent: a scroll of the summary's
    // scroller, a downward wheel, or an upward finger swipe.
    useEffect(() => {
        if (!showScrollHint) return undefined;

        const scroller = findScrollContainer(sectionRef.current);
        const startTop = getScrollView(scroller).scrollTop;
        let touchStart = null;
        const dismiss = () => setScrollHintDismissed(true);

        const handleScroll = (event) => {
            const target = event.target === document ? document.documentElement : event.target;
            if (target === scroller && getScrollView(scroller).scrollTop > startTop) dismiss();
        };
        const handleWheel = (event) => {
            if (event.deltaY > 0) dismiss();
        };
        const handleTouchStart = (event) => {
            const touch = event.touches[0];
            touchStart = touch ? { x: touch.clientX, y: touch.clientY } : null;
        };
        const handleTouchMove = (event) => {
            const touch = event.touches[0];
            if (!touchStart || !touch) return;
            const dy = touchStart.y - touch.clientY;
            if (dy > 8 && dy > Math.abs(touch.clientX - touchStart.x)) dismiss();
        };

        const options = { capture: true, passive: true };
        document.addEventListener('scroll', handleScroll, options);
        document.addEventListener('wheel', handleWheel, options);
        document.addEventListener('touchstart', handleTouchStart, options);
        document.addEventListener('touchmove', handleTouchMove, options);
        return () => {
            document.removeEventListener('scroll', handleScroll, options);
            document.removeEventListener('wheel', handleWheel, options);
            document.removeEventListener('touchstart', handleTouchStart, options);
            document.removeEventListener('touchmove', handleTouchMove, options);
        };
    }, [showScrollHint]);

    const fetchFinalSummary = useCallback(async () => {
        if (!selectedCards?.length) return;
        requestRef.current?.abort();
        const controller = new AbortController();
        requestRef.current = controller;
        setIsLoading(true);
        setIsRetrying(false);
        setReadingError(null);
        setSummaryText('');
        setSummaryComplete(false);
        setScrollHintDismissed(false);

        try {
            const text = await requestReading(`${API_URL}/api/interpret-card`, {
                card: {
                    id: selectedCards[0].id,
                    isReversed: selectedCards[0].isReversed || false,
                },
                cardIndex: summaryIndex,
                spread: spread || 'celtic',
                category: {},
                situation: situation || '',
                language: language || 'ko',
                allCards: selectedCards.map((c) => ({
                    id: c.id,
                    isReversed: c.isReversed || false,
                })),
            }, {
                signal: controller.signal,
                onRetry: () => {
                    if (!controller.signal.aborted) setIsRetrying(true);
                },
            });
            if (controller.signal.aborted) return;
            setSummaryText(trimToCompleteSentences(text));
            setSummaryComplete(true);
        } catch (error) {
            if (controller.signal.aborted) return;
            const code = ['busy', 'timeout', 'connection', 'interrupted'].includes(error.code)
                ? error.code : 'server';
            setReadingError(code);
        } finally {
            if (!controller.signal.aborted) setIsLoading(false);
        }
    }, [language, selectedCards, situation, spread, summaryIndex]);

    useEffect(() => {
        let cancelled = false;
        // Avoid a second request during React's development effect replay.
        queueMicrotask(() => {
            if (!cancelled) fetchFinalSummary();
        });
        return () => {
            cancelled = true;
            requestRef.current?.abort();
        };
    }, [fetchFinalSummary]);

    if (!selectedCards || selectedCards.length === 0) {
        return null;
    }

    return (
        <section ref={sectionRef} className="result-screen result-screen--summary mobile-screen" aria-label="Final Reading">
            <header className="result-header">
                <h2 className="result-title">{t('summary.title')}</h2>
                <p className="result-subtitle">{t('summary.subtitle', { count: totalCards })}</p>
            </header>

            <SummaryCardViewer selectedCards={selectedCards} />

            {showScrollHint && (
                <div className="summary-scroll-hint" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                        <path className="summary-scroll-hint-chevron" d="M6 7l6 6 6-6" />
                        <path className="summary-scroll-hint-chevron" d="M6 13l6 6 6-6" />
                    </svg>
                </div>
            )}

            <div className="mobile-screen-scroll result-scroll">
                <div className="interpretation-panel">
                    <article className="card-interpretation">
                        <div className="interpretation-body">
                            {isLoading && (
                                <div className="interpretation-loading">
                                    <span className="typing-indicator" aria-hidden="true">
                                        <span></span><span></span><span></span>
                                    </span>
                                    <span className="interpretation-loading-text">{t(isRetrying ? 'summary.reconnecting' : 'summary.loading')}</span>
                                </div>
                            )}
                            {!isLoading && readingError && (
                                <div className="interpretation-error" role="alert">
                                    <p>{t(`summary.errors.${readingError}`)}</p>
                                    <button type="button" className="mystical-button" onClick={fetchFinalSummary}>
                                        {t('summary.retry')}
                                    </button>
                                </div>
                            )}
                            {!isLoading && sentences.length > 0 && (
                                <InterpretationContent sentences={sentences} />
                            )}
                        </div>
                    </article>
                </div>
            </div>

            {(summaryComplete || readingError) && (
                <footer className="summary-footer">
                    <button type="button" className="mystical-button" onClick={onRestart}>
                        {t('summary.restart')}
                    </button>
                </footer>
            )}
        </section>
    );
};

export default ReadingResult;
