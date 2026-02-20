import React, { useState, useRef, useEffect } from 'react';
import './MobileCarousel.css';

const MobileCarousel = ({ cards, selectedCards, onCardSelect, maxCards }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [offsetX, setOffsetX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    const startX = useRef(0);
    const lastX = useRef(0);
    const velocity = useRef(0);
    const lastTime = useRef(0);
    const animationRef = useRef(null);

    const totalCards = cards.length;

    // 모멘텀 애니메이션
    const animateMomentum = (initialVelocity) => {
        let vel = initialVelocity * 0.2; // 속도 더 줄임
        let pos = 0;
        const friction = 0.90; // 마찰력 더 증가
        const minVelocity = 0.02;
        let accumulatedCards = 0;

        setIsAnimating(true);

        const animate = () => {
            vel *= friction;
            pos += vel * 10; // 프레임당 이동량 줄임

            // 카드 단위로 인덱스 변경
            const cardsPassed = Math.floor(Math.abs(pos) / 90) * Math.sign(pos);

            if (cardsPassed !== accumulatedCards) {
                const diff = cardsPassed - accumulatedCards;
                accumulatedCards = cardsPassed;

                setCurrentIndex(prev => {
                    let newIndex = prev - diff;
                    while (newIndex < 0) newIndex += totalCards;
                    while (newIndex >= totalCards) newIndex -= totalCards;
                    return newIndex;
                });
            }

            if (Math.abs(vel) > minVelocity) {
                setOffsetX((pos % 90) * 0.5);
                animationRef.current = requestAnimationFrame(animate);
            } else {
                // 애니메이션 종료
                setOffsetX(0);
                setIsAnimating(false);
            }
        };

        animationRef.current = requestAnimationFrame(animate);
    };

    // 터치 시작
    const handleStart = (clientX) => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }
        setIsAnimating(false);
        setIsDragging(true);
        startX.current = clientX;
        lastX.current = clientX;
        lastTime.current = Date.now();
        velocity.current = 0;
    };

    // 터치 이동
    const handleMove = (clientX) => {
        if (!isDragging) return;

        const now = Date.now();
        const dt = now - lastTime.current;

        if (dt > 0) {
            velocity.current = (clientX - lastX.current) / dt;
        }

        lastX.current = clientX;
        lastTime.current = now;

        const diff = clientX - startX.current;
        setOffsetX(diff);

        // 드래그 중 카드 인덱스 업데이트
        const cardsPassed = Math.round(diff / 90);
        if (cardsPassed !== 0) {
            let newIndex = currentIndex - cardsPassed;
            while (newIndex < 0) newIndex += totalCards;
            while (newIndex >= totalCards) newIndex -= totalCards;
            setCurrentIndex(newIndex);
            startX.current = clientX;
            setOffsetX(0);
        }
    };

    // 터치 종료
    const handleEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);

        // 속도가 충분하면 모멘텀 애니메이션
        if (Math.abs(velocity.current) > 0.3) {
            animateMomentum(velocity.current);
        } else {
            setOffsetX(0);
        }
    };

    // 터치 이벤트
    const handleTouchStart = (e) => handleStart(e.touches[0].clientX);
    const handleTouchMove = (e) => handleMove(e.touches[0].clientX);
    const handleTouchEnd = () => handleEnd();

    // 마우스 이벤트
    const handleMouseDown = (e) => handleStart(e.clientX);
    const handleMouseMove = (e) => {
        if (isDragging) handleMove(e.clientX);
    };
    const handleMouseUp = () => handleEnd();
    const handleMouseLeave = () => {
        if (isDragging) handleEnd();
    };

    // 카드 선택
    const centerCard = cards[currentIndex];
    const handleSelectCard = () => {
        if (!centerCard || isAnimating) return;

        const isAlreadySelected = selectedCards.find(c => c.id === centerCard.id);
        if (isAlreadySelected) {
            onCardSelect(selectedCards.filter(c => c.id !== centerCard.id));
        } else if (selectedCards.length < maxCards) {
            const cardWithReversed = {
                ...centerCard,
                isReversed: Math.random() < 0.5
            };
            onCardSelect([...selectedCards, cardWithReversed]);
        }
    };

    const isCenterSelected = selectedCards.find(c => c.id === centerCard?.id);
    const selectedCardIndex = selectedCards.findIndex(c => c.id === centerCard?.id);

    // 표시할 카드 계산 (-2 ~ +2)
    const getVisibleCards = () => {
        const visible = [];
        for (let i = -2; i <= 2; i++) {
            let cardIndex = currentIndex + i;
            if (cardIndex < 0) cardIndex += totalCards;
            if (cardIndex >= totalCards) cardIndex -= totalCards;

            const card = cards[cardIndex];
            if (card) {
                visible.push({ card, position: i });
            }
        }
        return visible;
    };

    const visibleCards = getVisibleCards();

    // 클린업
    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    return (
        <div className="mobile-carousel-container">
            <div
                className="carousel-wheel"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
                <div className="carousel-cards">
                    {visibleCards.map(({ card, position }) => {
                        const isSelected = selectedCards.find(c => c.id === card.id);
                        const cardSelectedIdx = selectedCards.findIndex(c => c.id === card.id);

                        // 드래그/애니메이션 중 오프셋 적용
                        const dragOffset = (isDragging || isAnimating) ? offsetX * 0.5 : 0;
                        const translateX = position * 90 + dragOffset;
                        const scale = position === 0 ? 1 : 0.7;
                        const opacity = position === 0 ? 1 : 0.4;
                        const zIndex = 10 - Math.abs(position);

                        // 항상 부드러운 트랜지션 사용
                        const transitionSpeed = isDragging ? '0.15s' : '0.6s';

                        return (
                            <div
                                key={card.id}
                                className={`carousel-card ${isSelected ? 'selected' : ''} ${position === 0 ? 'center' : ''}`}
                                style={{
                                    transform: `translateX(${translateX}px) scale(${scale})`,
                                    opacity: opacity,
                                    zIndex: zIndex,
                                    transition: `transform ${transitionSpeed} cubic-bezier(0.25, 0.1, 0.25, 1), opacity ${transitionSpeed} ease, scale ${transitionSpeed} ease`
                                }}
                            >
                                <img src="/cards/back.png" alt="카드" />
                                {isSelected && (
                                    <div className="carousel-badge">{cardSelectedIdx + 1}</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="carousel-center-indicator">
                <div className="center-arrow">▼</div>
            </div>

            <button
                className={`carousel-select-btn ${isCenterSelected ? 'cancel' : ''} ${selectedCards.length >= maxCards && !isCenterSelected ? 'disabled' : ''}`}
                onClick={handleSelectCard}
                disabled={(selectedCards.length >= maxCards && !isCenterSelected) || isAnimating}
            >
                {isCenterSelected ? `${selectedCardIndex + 1}번 카드 취소` : '이 카드 선택'}
            </button>

            <p className="carousel-hint">← 스와이프하여 카드 탐색 →</p>
        </div>
    );
};

export default MobileCarousel;
