import React, { useState, useRef, useEffect, useCallback } from 'react';
import './MobileCarousel.css';

const MobileCarousel = ({ cards, selectedCards, onCardSelect, maxCards }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    const carouselRef = useRef(null);
    const startX = useRef(0);
    const lastX = useRef(0);
    const velocity = useRef(0);
    const lastTime = useRef(0);
    const animationRef = useRef(null);
    const isDraggingRef = useRef(false);
    const currentIndexRef = useRef(0);
    const dragOffsetRef = useRef(0); // 픽셀 단위 누적 드래그

    const totalCards = cards.length;
    const CARD_SPACING = 85;
    // 충분히 많은 카드를 렌더해서 드래그 중 빈 공간 방지
    const VISIBLE_RANGE = 20;

    const wrapIndex = (idx) => {
        let i = idx % totalCards;
        if (i < 0) i += totalCards;
        return i;
    };

    // 카드 스타일 계산
    const getCardStyle = (fractionalOffset) => {
        const baseX = fractionalOffset * CARD_SPACING;
        const dist = Math.abs(fractionalOffset);
        const scale = Math.max(0.55, 1 - dist * 0.15);
        const opacity = Math.max(0.08, 1 - dist * 0.25);
        const translateY = dist * dist * 3;
        const rotateZ = fractionalOffset * 2.5;

        return {
            transform: `translate3d(${baseX}px, ${translateY}px, 0) scale(${scale}) rotate(${rotateZ}deg)`,
            opacity,
            zIndex: 10 - Math.round(dist)
        };
    };

    // DOM 직접 업데이트 (React 리렌더 없음)
    const updateDOM = useCallback((pixelOffset) => {
        const container = carouselRef.current;
        if (!container) return;

        const fraction = pixelOffset / CARD_SPACING;
        const cardElements = container.querySelectorAll('.carousel-card');

        cardElements.forEach((el) => {
            const slot = parseInt(el.dataset.slot);
            const effectivePos = slot + fraction;
            const style = getCardStyle(effectivePos);

            el.style.transform = style.transform;
            el.style.opacity = style.opacity;
            el.style.zIndex = style.zIndex;
            el.style.transition = 'none';
        });
    }, []);

    // 스냅 애니메이션 (드래그 끝난 후)
    const snapToNearest = useCallback((fromPixel) => {
        const fromFraction = fromPixel / CARD_SPACING;
        const targetCards = Math.round(fromFraction);
        const targetPixel = targetCards * CARD_SPACING;

        const startTime = performance.now();
        const duration = 280;
        setIsAnimating(true);

        const animate = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            const current = fromPixel + (targetPixel - fromPixel) * eased;

            updateDOM(current);

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                // 최종: 인덱스 반영
                const shift = Math.round(targetPixel / CARD_SPACING);
                currentIndexRef.current = wrapIndex(currentIndexRef.current - shift);
                setCurrentIndex(currentIndexRef.current);
                dragOffsetRef.current = 0;
                setIsAnimating(false);
            }
        };

        animationRef.current = requestAnimationFrame(animate);
    }, [updateDOM, totalCards]);

    // 모멘텀 애니메이션
    const animateMomentum = useCallback((initialVelocity) => {
        let vel = initialVelocity; // px/ms
        let pos = dragOffsetRef.current; // 현재 픽셀 오프셋에서 시작
        const friction = 0.97;
        const minVelocity = 0.05;

        setIsAnimating(true);

        const animate = () => {
            vel *= friction;
            pos += vel * 16; // ~60fps

            updateDOM(pos);

            if (Math.abs(vel) > minVelocity) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                // 모멘텀 끝 → 가장 가까운 카드로 스냅
                dragOffsetRef.current = pos;
                snapToNearest(pos);
            }
        };

        animationRef.current = requestAnimationFrame(animate);
    }, [updateDOM, snapToNearest]);

    // 터치 이벤트 (native)
    useEffect(() => {
        const el = carouselRef.current;
        if (!el) return;

        const handleTouchStart = (e) => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
            setIsAnimating(false);
            isDraggingRef.current = true;

            const touch = e.touches[0];
            startX.current = touch.clientX;
            lastX.current = touch.clientX;
            lastTime.current = performance.now();
            velocity.current = 0;
            dragOffsetRef.current = 0;
        };

        const handleTouchMove = (e) => {
            if (!isDraggingRef.current) return;
            e.preventDefault();

            const touch = e.touches[0];
            const clientX = touch.clientX;
            const now = performance.now();
            const dt = now - lastTime.current;

            if (dt > 0) {
                const instantVel = (clientX - lastX.current) / dt;
                velocity.current = velocity.current * 0.3 + instantVel * 0.7;
            }

            lastX.current = clientX;
            lastTime.current = now;

            // 순수 픽셀 오프셋 - setState 절대 안 함
            dragOffsetRef.current = clientX - startX.current;
            updateDOM(dragOffsetRef.current);
        };

        const handleTouchEnd = () => {
            if (!isDraggingRef.current) return;
            isDraggingRef.current = false;

            if (Math.abs(velocity.current) > 0.15) {
                animateMomentum(velocity.current);
            } else {
                snapToNearest(dragOffsetRef.current);
            }
        };

        el.addEventListener('touchstart', handleTouchStart, { passive: true });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        el.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
            el.removeEventListener('touchend', handleTouchEnd);
        };
    }, [updateDOM, animateMomentum, snapToNearest]);

    // 마우스 이벤트 (데스크톱)
    const handleMouseDown = (e) => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }
        setIsAnimating(false);
        isDraggingRef.current = true;
        startX.current = e.clientX;
        lastX.current = e.clientX;
        lastTime.current = performance.now();
        velocity.current = 0;
        dragOffsetRef.current = 0;
    };

    const handleMouseMove = (e) => {
        if (!isDraggingRef.current) return;
        const clientX = e.clientX;
        const now = performance.now();
        const dt = now - lastTime.current;

        if (dt > 0) {
            const instantVel = (clientX - lastX.current) / dt;
            velocity.current = velocity.current * 0.3 + instantVel * 0.7;
        }

        lastX.current = clientX;
        lastTime.current = now;

        dragOffsetRef.current = clientX - startX.current;
        updateDOM(dragOffsetRef.current);
    };

    const handleMouseUp = () => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;

        if (Math.abs(velocity.current) > 0.15) {
            animateMomentum(velocity.current);
        } else {
            snapToNearest(dragOffsetRef.current);
        }
    };

    const handleMouseLeave = () => {
        if (isDraggingRef.current) handleMouseUp();
    };

    // 동기화
    useEffect(() => {
        currentIndexRef.current = currentIndex;
    }, [currentIndex]);

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

    // 넉넉하게 카드 렌더 (-10 ~ +10 = 21장)
    const getVisibleCards = () => {
        const visible = [];
        for (let i = -VISIBLE_RANGE; i <= VISIBLE_RANGE; i++) {
            const cardIndex = wrapIndex(currentIndex + i);
            const card = cards[cardIndex];
            if (card) {
                visible.push({ card, slot: i });
            }
        }
        return visible;
    };

    const visibleCards = getVisibleCards();

    useEffect(() => {
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, []);

    return (
        <div className="mobile-carousel-container">
            <div
                ref={carouselRef}
                className="carousel-wheel"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                style={{ cursor: isDraggingRef.current ? 'grabbing' : 'grab' }}
            >
                <div className="carousel-cards">
                    {visibleCards.map(({ card, slot }) => {
                        const isSelected = selectedCards.find(c => c.id === card.id);
                        const cardSelectedIdx = selectedCards.findIndex(c => c.id === card.id);
                        const style = getCardStyle(slot);

                        return (
                            <div
                                key={`${currentIndex}-${slot}`}
                                data-slot={slot}
                                className={`carousel-card ${isSelected ? 'selected' : ''} ${slot === 0 ? 'center' : ''}`}
                                style={{
                                    ...style,
                                    transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease',
                                    willChange: 'transform, opacity'
                                }}
                            >
                                <img src="/cards/back.png" alt="카드" draggable="false" />
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
