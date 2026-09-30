import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { useLanguage } from '../contexts/LanguageContext';
import { getSummaryCardIndex } from '../lib/spreads';
import SummaryCardViewer from './SummaryCardViewer';
import './ReadingResult.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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

const splitByPunctuation = (text) => {
    const sentences = [];
    const pattern = /[^.!?…。]+[.!?…。]+/g;
    let lastIndex = 0;
    let match = pattern.exec(text);

    while (match) {
        const sentence = match[0].trim();
        if (sentence) sentences.push(sentence);
        lastIndex = pattern.lastIndex;
        match = pattern.exec(text);
    }

    const remainder = text.slice(lastIndex).trim();
    if (remainder) sentences.push(remainder);

    return sentences;
};

const splitIntoSentences = (text) => {
    if (!text?.trim()) return [];

    const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);

    if (lines.length >= 3) {
        return lines;
    }

    return splitByPunctuation(text);
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

const getWindowView = () => ({ viewTop: 0, viewBottom: window.innerHeight });

const getScrollPosition = (target) => {
    if (target === document || target === document.documentElement || target === document.body) {
        return { scrollTop: window.scrollY, ...getWindowView() };
    }
    const rect = target.getBoundingClientRect();
    return { scrollTop: target.scrollTop, viewTop: rect.top, viewBottom: rect.bottom };
};

const InterpretationContent = ({ sentences }) => {
    const [revealedCount, setRevealedCount] = useState(1);
    const lastRevealAtRef = useRef(0);
    const spacerRef = useRef(null);

    const hasMore = revealedCount < sentences.length;

    // Which element scrolls depends on layout (window, shell, or inner panel),
    // so listen to every scroll in the document during capture and decide by geometry.
    // Wheel/touch gestures are also counted: once the page bottom is reached no
    // scroll events fire, yet a downward gesture should keep revealing.
    useEffect(() => {
        if (!hasMore) return undefined;

        const lastTops = new WeakMap();
        let touchY = null;

        const tryReveal = ({ viewTop, viewBottom }) => {
            const now = Date.now();
            if (now - lastRevealAtRef.current < REVEAL_COOLDOWN_MS) return;

            const spacer = spacerRef.current;
            if (!spacer) return;
            const triggerLine = viewTop + (viewBottom - viewTop) * REVEAL_TRIGGER_RATIO;
            if (spacer.getBoundingClientRect().top > triggerLine) return;

            lastRevealAtRef.current = now;
            setRevealedCount((count) => Math.min(count + 1, sentences.length));
        };

        const handleScroll = (event) => {
            const target = event.target;
            const key = target === document ? document.documentElement : target;
            const { scrollTop, viewTop, viewBottom } = getScrollPosition(target);
            const previousTop = lastTops.get(key) ?? scrollTop;
            lastTops.set(key, scrollTop);
            if (scrollTop > previousTop) tryReveal({ viewTop, viewBottom });
        };

        const handleWheel = (event) => {
            if (event.deltaY > 0) tryReveal(getWindowView());
        };

        const handleTouchStart = (event) => {
            touchY = event.touches[0]?.clientY ?? null;
        };

        const handleTouchMove = (event) => {
            const y = event.touches[0]?.clientY;
            if (touchY === null || y === undefined) return;
            if (touchY - y > 8) {
                touchY = y;
                tryReveal(getWindowView());
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
    const hasFetchedRef = useRef(false);

    const totalCards = selectedCards?.length || 0;
    const summaryIndex = getSummaryCardIndex(spread);
    const sentences = useMemo(
        () => (summaryComplete ? splitIntoSentences(summaryText) : []),
        [summaryText, summaryComplete]
    );

    const fetchFinalSummary = useCallback(async () => {
        if (!selectedCards?.length) return;

        setIsLoading(true);
        setSummaryText('');
        setSummaryComplete(false);

        let fullText = '';

        try {
            const response = await fetch(`${API_URL}/api/interpret-card`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
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
                }),
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.content) {
                                fullText += data.content;
                            }
                            if (data.error) {
                                fullText += `\n\n⚠️ 오류: ${data.error}`;
                            }
                        } catch {
                            // ignore parse errors
                        }
                    }
                }
            }
        } catch (err) {
            fullText = `⚠️ 서버 연결에 실패했습니다: ${err.message}`;
        } finally {
            setSummaryText(trimToCompleteSentences(fullText));
            setSummaryComplete(true);
            setIsLoading(false);
        }
    }, [language, selectedCards, situation, spread, summaryIndex]);

    useEffect(() => {
        if (hasFetchedRef.current || !selectedCards?.length) return;
        hasFetchedRef.current = true;
        fetchFinalSummary();
    }, [fetchFinalSummary, selectedCards]);

    if (!selectedCards || selectedCards.length === 0) {
        return null;
    }

    return (
        <section className="result-screen result-screen--summary mobile-screen" aria-label="Final Reading">
            <header className="result-header">
                <h2 className="result-title">{t('summary.title')}</h2>
                <p className="result-subtitle">{t('summary.subtitle', { count: totalCards })}</p>
            </header>

            <SummaryCardViewer selectedCards={selectedCards} />

            <div className="mobile-screen-scroll result-scroll">
                <div className="interpretation-panel">
                    <article className="card-interpretation">
                        <div className="interpretation-body">
                            {isLoading && (
                                <div className="interpretation-loading">
                                    <span className="typing-indicator" aria-hidden="true">
                                        <span></span><span></span><span></span>
                                    </span>
                                    <span className="interpretation-loading-text">{t('summary.loading')}</span>
                                </div>
                            )}
                            {!isLoading && sentences.length > 0 && (
                                <InterpretationContent sentences={sentences} />
                            )}
                        </div>
                    </article>
                </div>
            </div>

            {summaryComplete && (
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
