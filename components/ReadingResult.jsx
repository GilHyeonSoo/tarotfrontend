import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import SummaryCardViewer from './SummaryCardViewer';
import './ReadingResult.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// 카드 위치별 의미 (켈트 십자가 스프레드)
const positionMeanings = [
    { title: "현재 상황", description: "질문하는 사람의 현재 상황을 나타냅니다." },
    { title: "방해 요소", description: "현재 상황을 가로막는 방해 요소, 장애물을 나타냅니다." },
    { title: "잠재의식", description: "무의식, 잠재의식, 문제의 본질, 욕망 등을 나타냅니다." },
    { title: "과거", description: "가까운 과거의 상황을 나타냅니다." },
    { title: "가능성", description: "현재 드러난 영향력, 앞으로 발전할 가능성을 나타냅니다." },
    { title: "가까운 미래", description: "가까운 미래의 상황입니다." },
    { title: "자기 인식", description: "질문자 스스로 인식하는 자신의 감정, 자기 자신을 어떻게 생각하는지 나타냅니다." },
    { title: "주변 환경", description: "질문자를 바라보는 주변사람들의 생각이나 영향력, 상황 혹은 주변환경을 의미합니다." },
    { title: "희망과 두려움", description: "질문자의 마음가짐, 혹은 바라는 점, 두려워하는 것, 희망을 나타냅니다." },
    { title: "최종 결과", description: "최종적인 결과, 결론입니다." }
];

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

const ReadingResult = ({ selectedCards, category, situation, onRestart }) => {
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
            <section className="result-screen summary-mode" aria-label="최종 결과 요약">
                <header className="result-header">
                    <h2 className="result-title">종합 운세 요약</h2>
                    <p className="result-subtitle">
                        10장의 카드가 전하는 메시지
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
                                        전문가가 종합 해석 중...
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
                                    <p className="complete-message">모든 해석이 완료되었습니다</p>
                                    <button className="mystical-button" onClick={onRestart}>
                                        다시 시작하기
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
        <section className="result-screen" aria-label="타로 카드 해석 결과">
            <header className="result-header">
                <h2 className="result-title">당신의 운명</h2>
                <p className="result-subtitle">
                    <span style={{ color: 'var(--color-accent-rose)', fontWeight: 'bold' }}>{currentIndex + 1}번째 카드</span> / 10장
                </p>
            </header>

            <div className={`single-card-container ${isTransitioning ? 'transitioning' : ''}`}>
                <div
                    className={`single-card ${isFlipped ? 'flipped' : ''}`}
                    onClick={handleCardClick}
                >
                    <div className="single-card-inner">
                        <div className="single-card-back">
                            <img src="/cards/back.png" alt="카드 뒷면" />
                            {!isFlipped && <div className="click-hint">클릭하여 뒤집기</div>}
                        </div>
                        <div className="single-card-front">
                            {isFlipped && (
                                <img
                                    src={currentCard.image || "/cards/back.png"}
                                    alt={currentCard.name_kr}
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
                                <h3 className="position-title">{positionMeanings[currentIndex].title}</h3>
                                <p className="position-desc">{positionMeanings[currentIndex].description}</p>
                            </div>
                        </div>
                        <div className="interpretation-body">
                            <p className="card-selected-name">
                                <strong>{currentCard.name_kr}</strong>
                                {currentCard.isReversed && (
                                    <span className="reversed-badge">역방향</span>
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
                                        전문가가 해석 중...
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
                                    다음 카드
                                </button>
                            )}
                            {isLastCard && streamComplete && (
                                <button className="mystical-button glow-pulse" onClick={fetchFinalSummary}>
                                    종합 운세 보기
                                </button>
                            )}
                        </div>
                    </article>
                ) : (
                    <div className="interpretation-placeholder">
                        <p>카드를 클릭하여 운명을 확인하세요</p>
                    </div>
                )}
            </div>

            {!isStreaming && (
                <div style={{ textAlign: 'center', marginTop: '15px' }}>
                    <button className="skip-to-summary-btn" onClick={fetchFinalSummary}>
                        최종 운세 보기<br />
                        <span className="skip-label">Skip</span>
                    </button>
                </div>
            )}

            {!isFlipped && <footer className="result-footer"></footer>}
        </section>
    );
};

export default ReadingResult;
