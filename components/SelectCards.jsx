import React, { useState, useEffect, useMemo, memo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './SelectCards.css';
import MobileCarousel from './MobileCarousel';



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
                    <img src="/cards/back.png" alt="Card back" className="card-back-image" />
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
    const { t } = useLanguage();
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

    // 한번에 모두 뽑기 (랜덤 10장)
    const handleSelectAll = () => {
        if (selectedCards.length > 0) return;
        const shuffled = [...cards].sort(() => Math.random() - 0.5);
        const picked = shuffled.slice(0, maxCards).map(card => ({
            ...card,
            isReversed: Math.random() < 0.5
        }));
        setSelectedCards(picked);
    };

    // 전체 카드 너비 계산
    const totalWidth = (shuffledCards.length - 1) * visibleWidth + cardWidth;

    // 다음 카드 의미 가져오기
    const cardMeanings = t('select.cardMeanings');
    const nextCardMeaning = Array.isArray(cardMeanings) ? cardMeanings[selectedCards.length] : null;

    return (
        <section className="select-screen" aria-label="Card Selection">
            <header className="select-header">
                <h2 className="select-title">{t('select.title')}</h2>
                <p className="select-subtitle">
                    {t('select.subtitle', { count: maxCards })}
                </p>
                <div className="selection-counter">
                    <span className="counter-current">{selectedCards.length}</span>
                    <span className="counter-divider">/</span>
                    <span className="counter-max">{maxCards}</span>
                </div>
            </header>

            {/* 다음 카드 의미 표시 */}
            {nextCardMeaning && (
                <div className="card-meaning">
                    <p className="meaning-text">
                        {nextCardMeaning}
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

            <footer className="select-footer">
                {isMobile && selectedCards.length === 0 && (
                    <button
                        className="select-all-btn"
                        onClick={handleSelectAll}
                    >
                        {t('select.selectAll')}
                    </button>
                )}
                <button
                    className={`mystical-button ${selectedCards.length === maxCards ? 'ready' : 'disabled'}`}
                    onClick={handleConfirm}
                    disabled={selectedCards.length !== maxCards}
                    aria-label={selectedCards.length === maxCards ? t('select.confirm') : t('select.moreCards', { count: maxCards - selectedCards.length })}
                >
                    {selectedCards.length === maxCards
                        ? t('select.confirm')
                        : t('select.moreCards', { count: maxCards - selectedCards.length })}
                </button>
            </footer>
        </section>
    );
};

export default SelectCards;
