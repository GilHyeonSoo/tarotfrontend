import React, { useState, useEffect, useMemo, memo } from 'react';
import './SelectCards.css';
import MobileCarousel from './MobileCarousel';

// 카드 위치별 의미
const cardMeanings = [
    "첫번째 카드는 당신의 현재 상황을 나타냅니다.",
    "두번째 카드는 현재 상황을 가로막는 방해 요소, 장애물을 나타냅니다.",
    "세번째 카드는 무의식, 잠재의식, 문제의 본질, 욕망 등을 나타냅니다.",
    "네번째 카드는 가까운 과거의 상황을 나타냅니다.",
    "다섯번째 카드는 현재 드러난 영향력, 앞으로 발전할 가능성을 나타냅니다.",
    "여섯번째 카드는 가까운 미래의 상황입니다.",
    "일곱번째 카드는 당신이 스스로 인식하는 자신의 감정, 자기 자신을 어떻게 생각하는지 나타냅니다.",
    "여덟번째 카드는 당신이 바라보는 주변사람들의 생각이나 영향력, 상황 혹은 주변환경을 의미합니다.",
    "아홉번째 카드는 당신의 마음가짐, 혹은 바라는 점, 두려워하는 것, 희망을 나타냅니다.",
    "열번째 카드는 최종적인 결과, 결론입니다.",
    "당신의 운명을 확인해보세요."
];

// 개별 카드 컴포넌트
const FanCard = memo(({ card, isSelected, selectedIndex, offsetX, isHovered, onClick }) => {
    return (
        <div
            className={`fan-card ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
            onClick={onClick}
            style={{
                '--offset-x': `${offsetX}px`,
                '--z-index': isHovered ? 100 : (isSelected ? 90 + selectedIndex : 'var(--base-z)'),
            }}
        >
            <div className="fan-card-inner">
                <div className="fan-card-back">
                    <img src="/cards/back.png" alt="카드 뒷면" className="card-back-image" />
                </div>
            </div>
            {isSelected && (
                <div className="selected-badge">
                    {selectedIndex + 1}
                </div>
            )}
        </div>
    );
});

const SelectCards = ({ cards, onComplete }) => {
    const [selectedCards, setSelectedCards] = useState([]);
    const [shuffledCards, setShuffledCards] = useState([]);
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);
    const maxCards = 10;

    useEffect(() => {
        const shuffled = [...cards].sort(() => Math.random() - 0.5);
        setShuffledCards(shuffled);

        // 모바일 감지
        const handleResize = () => setIsMobile(window.innerWidth <= 600);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [cards]);

    // 가로 배치 계산
    const cardWidth = 80;
    const overlap = 50; // 겹치는 픽셀 (카드 폭 - 보이는 부분)
    const visibleWidth = cardWidth - overlap; // 각 카드가 보이는 폭 = 15px

    // 벌어짐 효과 계산
    const getSpreadOffset = (cardIndex) => {
        if (hoveredIndex === null) return 0;

        const distance = cardIndex - hoveredIndex;
        const maxSpread = 40; // 최대 벌어짐 픽셀
        const spreadRange = 5; // 영향 범위

        if (Math.abs(distance) > spreadRange) return 0;
        if (distance === 0) return 0;

        const intensity = 1 - (Math.abs(distance) / spreadRange);
        const direction = distance > 0 ? 1 : -1;

        return direction * maxSpread * intensity;
    };

    const handleCardClick = (card) => {
        if (selectedCards.find(c => c.id === card.id)) {
            setSelectedCards(selectedCards.filter(c => c.id !== card.id));
        } else if (selectedCards.length < maxCards) {
            // 50% 확률로 역방향 결정
            const cardWithReversed = {
                ...card,
                isReversed: Math.random() < 0.5
            };
            setSelectedCards([...selectedCards, cardWithReversed]);
        }
    };

    const handleConfirm = () => {
        if (selectedCards.length === maxCards) {
            onComplete(selectedCards);
        }
    };

    // 전체 카드 너비 계산
    const totalWidth = (shuffledCards.length - 1) * visibleWidth + cardWidth;

    // 다음 카드 의미 가져오기 (11번째 항목은 10장 선택 후 표시)
    const nextCardMeaning = cardMeanings[selectedCards.length] || null;

    return (
        <div className="select-screen">
            <div className="select-header">
                <h2 className="select-title">카드를 선택하세요</h2>
                <p className="select-subtitle">
                    직관에 따라 <span className="highlight">{maxCards}장</span>의 카드를 선택하세요
                </p>
                <div className="selection-counter">
                    <span className="counter-current">{selectedCards.length}</span>
                    <span className="counter-divider">/</span>
                    <span className="counter-max">{maxCards}</span>
                </div>
            </div>

            {/* 다음 카드 의미 표시 */}
            {nextCardMeaning && (
                <div className="card-meaning">
                    <p className="meaning-text">
                        {(() => {
                            const match = nextCardMeaning.match(/^(.+카드는?\s*)/);
                            if (match) {
                                return (
                                    <>
                                        <span style={{ color: 'var(--color-accent-rose)', fontWeight: 'bold' }}>{match[1]}</span>
                                        {nextCardMeaning.slice(match[1].length)}
                                    </>
                                );
                            }
                            return nextCardMeaning;
                        })()}
                    </p>
                </div>
            )}

            {/* 모바일: 3D 캐러셀 / PC: 기존 레이아웃 */}
            {isMobile ? (
                <MobileCarousel
                    cards={shuffledCards}
                    selectedCards={selectedCards}
                    onCardSelect={setSelectedCards}
                    maxCards={maxCards}
                />
            ) : (
                <>

                    <div className="cards-horizontal-container">
                        {/* 첫 번째 줄: 0-38 (39장) */}
                        <div
                            className="cards-horizontal cards-row"
                            style={{ width: `${(39 - 1) * visibleWidth + cardWidth}px` }}
                        >
                            {shuffledCards.slice(0, 39).map((card, index) => {
                                const selectedIndex = selectedCards.findIndex(c => c.id === card.id);
                                const isSelected = selectedIndex !== -1;
                                const isHovered = hoveredIndex === index;
                                const baseX = index * visibleWidth;
                                const spreadOffset = getSpreadOffset(index);

                                return (
                                    <div
                                        key={card.id}
                                        className="card-wrapper"
                                        style={{
                                            '--base-z': index,
                                            left: `${baseX}px`
                                        }}
                                        onMouseEnter={() => setHoveredIndex(index)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                    >
                                        <FanCard
                                            card={card}
                                            isSelected={isSelected}
                                            selectedIndex={selectedIndex}
                                            offsetX={spreadOffset}
                                            isHovered={isHovered}
                                            onClick={() => handleCardClick(card)}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {/* 두 번째 줄: 39-77 (39장) */}
                        <div
                            className="cards-horizontal cards-row"
                            style={{ width: `${(39 - 1) * visibleWidth + cardWidth}px` }}
                        >
                            {shuffledCards.slice(39, 78).map((card, index) => {
                                const globalIndex = index + 39;
                                const selectedIndex = selectedCards.findIndex(c => c.id === card.id);
                                const isSelected = selectedIndex !== -1;
                                const isHovered = hoveredIndex === globalIndex;
                                const baseX = index * visibleWidth;
                                const spreadOffset = getSpreadOffset(globalIndex);

                                return (
                                    <div
                                        key={card.id}
                                        className="card-wrapper"
                                        style={{
                                            '--base-z': index,
                                            left: `${baseX}px`
                                        }}
                                        onMouseEnter={() => setHoveredIndex(globalIndex)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                    >
                                        <FanCard
                                            card={card}
                                            isSelected={isSelected}
                                            selectedIndex={selectedIndex}
                                            offsetX={spreadOffset}
                                            isHovered={isHovered}
                                            onClick={() => handleCardClick(card)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            <div className="select-footer">
                <button
                    className={`mystical-button ${selectedCards.length === maxCards ? 'ready' : 'disabled'}`}
                    onClick={handleConfirm}
                    disabled={selectedCards.length !== maxCards}
                >
                    {selectedCards.length === maxCards
                        ? '운명 확인하기'
                        : `${maxCards - selectedCards.length}장 더 선택하세요`}
                </button>
            </div>
        </div>
    );
};

export default SelectCards;
