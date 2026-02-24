import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { useLanguage } from '../contexts/LanguageContext';
import SummaryCardViewer from './SummaryCardViewer';
import './ReadingResult.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';



// 안전한 마크다운 파서 (XSS 방어)
const parseMarkdown = (text) => {
    if (!text) return '';

    const parsed = text
        .replace(/## (.*?)(\n|$)/g, '<h2 class="md-h2">$1</h2>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/---/g, '<hr class="md-hr" />')
        .replace(/\n/g, '<br />');

    // XSS 방어: DOMPurify로 sanitize
    return DOMPurify.sanitize(parsed, {
        ALLOWED_TAGS: ['h2', 'strong', 'em', 'hr', 'br'],
        ALLOWED_ATTR: ['class']
    });
};

// 숫자를 로마 숫자로 변환
const toRoman = (num) => {
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    return romanNumerals[num] || (num + 1).toString();
};

const ReadingResult = ({ selectedCards, category, situation, onRestart, language }) => {
    const { t, language: currentLang } = useLanguage();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [streamingText, setStreamingText] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamComplete, setStreamComplete] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [summaryText, setSummaryText] = useState('');
    const [isSummaryStreaming, setIsSummaryStreaming] = useState(false);
    const [summaryComplete, setSummaryComplete] = useState(false);
    const interpretationRef = useRef(null);
    const summaryRef = useRef(null);

    const currentCard = selectedCards?.[currentIndex];
    const isLastCard = currentIndex === (selectedCards?.length || 0) - 1;

    // 스트리밍 AI 해석 요청
    const fetchStreamingInterpretation = async () => {
        if (!currentCard) return;

        setIsStreaming(true);
        setStreamingText('');
        setStreamComplete(false);

        try {
            const response = await fetch(`${API_URL}/api/interpret-card`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    card: {
                        id: currentCard.id,
                        isReversed: currentCard.isReversed || false
                    },
                    cardIndex: currentIndex,
                    category: category || {},
                    situation: situation || '',
                    language: language || 'ko',
                    allCards: selectedCards.map(c => ({
                        id: c.id,
                        isReversed: c.isReversed || false
                    }))
                })
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
                                setStreamingText(prev => prev + data.content);
                            }
                            if (data.done) {
                                setStreamComplete(true);
                            }
                            if (data.error) {
                                setStreamingText(prev => prev + `\n\n⚠️ 오류: ${data.error}`);
                            }
                        } catch (e) {
                            // JSON 파싱 오류 무시
                        }
                    }
                }
            }
        } catch (err) {
            setStreamingText(`⚠️ 서버 연결에 실패했습니다: ${err.message}`);
        } finally {
            setIsStreaming(false);
            setStreamComplete(true);
        }
    };

    // 스크롤 자동 이동
    useEffect(() => {
        if (interpretationRef.current && streamingText) {
            interpretationRef.current.scrollTop = interpretationRef.current.scrollHeight;
        }
    }, [streamingText]);

    useEffect(() => {
        if (summaryRef.current && summaryText) {
            summaryRef.current.scrollTop = summaryRef.current.scrollHeight;
        }
    }, [summaryText]);

    // 최종 결과 요약 요청
    const fetchFinalSummary = async () => {
        setShowSummary(true);
        setIsSummaryStreaming(true);
        setSummaryText('');
        setSummaryComplete(false);

        try {
            const response = await fetch(`${API_URL}/api/interpret-card`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    card: {
                        id: selectedCards[0].id,
                        isReversed: selectedCards[0].isReversed || false
                    },
                    cardIndex: 10,
                    category: category || {},
                    situation: situation || '',
                    language: language || 'ko',
                    allCards: selectedCards.map(c => ({
                        id: c.id,
                        isReversed: c.isReversed || false
                    }))
                })
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
                                setSummaryText(prev => prev + data.content);
                            }
                            if (data.done) {
                                setSummaryComplete(true);
                            }
                            if (data.error) {
                                setSummaryText(prev => prev + `\n\n⚠️ 오류: ${data.error}`);
                            }
                        } catch (e) { }
                    }
                }
            }
        } catch (err) {
            setSummaryText(`⚠️ 서버 연결에 실패했습니다: ${err.message}`);
        } finally {
            setIsSummaryStreaming(false);
            setSummaryComplete(true);
        }
    };

    // 카드가 없으면 렌더링하지 않음 (화면 전환 중 방지)
    if (!selectedCards || selectedCards.length === 0 || !currentCard) {
        return null;
    }

    const handleCardClick = () => {
        if (!isFlipped && !isTransitioning && !isStreaming) {
            setIsFlipped(true);
            // 카드가 뒤집히면 AI 해석 요청
            setTimeout(() => {
                fetchStreamingInterpretation();
            }, 400); // 뒤집힘 애니메이션 후 시작
        }
    };

    const handleNextCard = () => {
        if (!isLastCard && !isTransitioning && streamComplete) {
            setIsTransitioning(true);

            setTimeout(() => {
                setCurrentIndex(currentIndex + 1);
                setIsFlipped(false);
                setStreamingText('');
                setStreamComplete(false);

                setTimeout(() => {
                    setIsTransitioning(false);
                }, 100);
            }, 300);
        }
    };

    // 최종 요약 화면
    if (showSummary) {
        return (
            <section className="result-screen summary-mode" aria-label="Final Reading">
                <header className="result-header">
                    <h2 className="result-title">{t('summary.title')}</h2>
                    <p className="result-subtitle">
                        {t('summary.subtitle')}
                    </p>
                </header>

                <SummaryCardViewer selectedCards={selectedCards} />

                <div className="interpretation-panel">
                    <article className="card-interpretation">
                        <div className="interpretation-body">
                            <div
                                className={`streaming-content ${isSummaryStreaming ? 'streaming' : ''}`}
                                ref={summaryRef}
                            >
                                {isSummaryStreaming && !summaryText && (
                                    <div className="streaming-loading">
                                        <span className="typing-indicator">
                                            <span></span><span></span><span></span>
                                        </span>
                                        {t('summary.loading')}
                                    </div>
                                )}
                                <div
                                    className="markdown-content"
                                    dangerouslySetInnerHTML={{ __html: parseMarkdown(summaryText) }}
                                />
                            </div>
                        </div>

                        {summaryComplete && (
                            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                <div className="complete-section">
                                    <p className="complete-message"></p>
                                    <button className="mystical-button" onClick={onRestart}>
                                        {t('summary.restart')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </article>
                </div>
            </section>
        );
    }

    return (
        <section className="result-screen" aria-label="Tarot Reading">
            <header className="result-header">
                <h2 className="result-title">{t('reading.title')}</h2>
                <p className="result-subtitle">
                    <span style={{ color: 'var(--color-accent-rose)', fontWeight: 'bold' }}>{t('reading.cardCount', { current: currentIndex + 1 })}</span> / {t('reading.totalCards')}
                </p>
            </header>

            <div className={`single-card-container ${isTransitioning ? 'transitioning' : ''}`}>
                <div
                    className={`single-card ${isFlipped ? 'flipped' : ''}`}
                    onClick={handleCardClick}
                >
                    <div className="single-card-inner">
                        <div className="single-card-back">
                            <img src="/cards/back.png" alt={t('reading.cardBack')} />
                            {!isFlipped && <div className="click-hint">{t('reading.flipHint')}</div>}
                        </div>
                        <div className="single-card-front">
                            {isFlipped && (
                                <img
                                    src={currentCard.image || "/cards/back.png"}
                                    alt={currentCard[`name_${currentLang}`] || currentCard.name || currentCard.name_kr}
                                    className={currentCard.isReversed ? 'reversed' : ''}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="interpretation-panel">
                {isFlipped ? (
                    <article className="card-interpretation">
                        <div className="interpretation-header">
                            <span className="position-number">{toRoman(currentIndex)}</span>
                            <div className="position-info">
                                <h3 className="position-title">{t(`reading.positions`)[currentIndex]?.title}</h3>
                                <p className="position-desc">{t(`reading.positions`)[currentIndex]?.description}</p>
                            </div>
                        </div>
                        <div className="interpretation-body">
                            <p className="card-selected-name">
                                <strong>{currentCard[`name_${currentLang}`] || currentCard.name || currentCard.name_kr}</strong>
                                {currentCard.isReversed && (
                                    <span className="reversed-badge">{t('reading.reversed')}</span>
                                )}
                            </p>

                            {/* 스트리밍 마크다운 해석 */}
                            <div
                                className={`streaming-content ${isStreaming ? 'streaming' : ''}`}
                                ref={interpretationRef}
                            >
                                {isStreaming && !streamingText && (
                                    <div className="streaming-loading">
                                        <span className="typing-indicator">
                                            <span></span><span></span><span></span>
                                        </span>
                                        {t('reading.loading')}
                                    </div>
                                )}
                                <div
                                    className="markdown-content"
                                    dangerouslySetInnerHTML={{ __html: parseMarkdown(streamingText) }}
                                />
                            </div>
                        </div>

                        <div style={{ textAlign: 'center', marginTop: '20px' }}>
                            {!isLastCard && streamComplete && (
                                <button className="mystical-button next-button" onClick={handleNextCard}>
                                    {t('reading.nextCard')}
                                </button>
                            )}
                            {isLastCard && streamComplete && (
                                <button className="mystical-button glow-pulse" onClick={fetchFinalSummary}>
                                    {t('reading.viewSummary')}
                                </button>
                            )}
                        </div>
                    </article>
                ) : (
                    <div className="interpretation-placeholder">
                        <p>{t('reading.placeholder')}</p>
                    </div>
                )}
            </div>

            {!isStreaming && (
                <div style={{ textAlign: 'center', marginTop: '15px' }}>
                    <button className="skip-to-summary-btn" onClick={fetchFinalSummary}>
                        {t('reading.skipToSummary')}<br />
                        <span className="skip-label">Skip</span>
                    </button>
                </div>
            )}

            {!isFlipped && <footer className="result-footer"></footer>}
        </section>
    );
};

export default ReadingResult;
