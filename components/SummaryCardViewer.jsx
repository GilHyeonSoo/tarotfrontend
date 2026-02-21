import React, { useState, useRef, useEffect, useCallback } from 'react';
import './SummaryCardViewer.css';

const SummaryCardViewer = ({ selectedCards }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const carouselRef = useRef(null);
    const startX = useRef(0);
    const lastX = useRef(0);
    const velocity = useRef(0);
    const lastTime = useRef(0);
    const animationRef = useRef(null);
    const isDraggingRef = useRef(false);
    const currentIndexRef = useRef(0);
    const dragOffsetRef = useRef(0);

    const totalCards = selectedCards.length;
    const CARD_SPACING = 90;
    const maxIndex = totalCards - 1;

    // 순환 없이 0~maxIndex로 제한
    const clampIndex = (idx) => Math.max(0, Math.min(maxIndex, idx));

    // 경계 체크: 현재 인덱스 기준으로 드래그 가능한 픽셀 범위 계산
    const getClampedOffset = (rawOffset) => {
        const maxRight = currentIndexRef.current * CARD_SPACING; // 왼쪽 끝까지 가능한 양
        const maxLeft = -(maxIndex - currentIndexRef.current) * CARD_SPACING; // 오른쪽 끝까지 가능한 양

        if (rawOffset > maxRight) {
            // 왼쪽 끝 도달 → 저항감 (rubber band)
            const overflow = rawOffset - maxRight;
            return maxRight + overflow * 0.2;
        }
        if (rawOffset < maxLeft) {
            // 오른쪽 끝 도달 → 저항감
            const overflow = rawOffset - maxLeft;
            return maxLeft + overflow * 0.2;
        }
        return rawOffset;
    };

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

    const updateDOM = useCallback((pixelOffset) => {
        const container = carouselRef.current;
        if (!container) return;

        const fraction = pixelOffset / CARD_SPACING;
        const cardElements = container.querySelectorAll('.viewer-card');

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

    const snapToNearest = useCallback((fromPixel) => {
        const fromFraction = fromPixel / CARD_SPACING;
        let targetCards = Math.round(fromFraction);

        // 경계 제한: 스냅 후 인덱스가 0~maxIndex 안에 있도록
        const newIndex = currentIndexRef.current - targetCards;
        if (newIndex < 0) targetCards = currentIndexRef.current;
        if (newIndex > maxIndex) targetCards = currentIndexRef.current - maxIndex;

        const targetPixel = targetCards * CARD_SPACING;

        const startTime = performance.now();
        const duration = 400;

        const animate = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = fromPixel + (targetPixel - fromPixel) * eased;

            updateDOM(current);
            dragOffsetRef.current = current;

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                const shift = Math.round(targetPixel / CARD_SPACING);
                currentIndexRef.current = clampIndex(currentIndexRef.current - shift);
                setCurrentIndex(currentIndexRef.current);
                dragOffsetRef.current = 0;
            }
        };

        animationRef.current = requestAnimationFrame(animate);
    }, [updateDOM, totalCards]);

    const animateMomentum = useCallback((initialVelocity) => {
        let vel = initialVelocity;
        let pos = dragOffsetRef.current;
        const friction = 0.93;
        const minVelocity = 0.05;

        const maxRight = currentIndexRef.current * CARD_SPACING;
        const maxLeft = -(maxIndex - currentIndexRef.current) * CARD_SPACING;

        const animate = () => {
            vel *= friction;
            pos += vel * 16;

            // 경계에 도달하면 모멘텀 중단
            if (pos > maxRight + 20 || pos < maxLeft - 20) {
                pos = Math.max(maxLeft, Math.min(maxRight, pos));
                dragOffsetRef.current = pos;
                snapToNearest(pos);
                return;
            }

            updateDOM(pos);
            dragOffsetRef.current = pos;

            if (Math.abs(vel) > minVelocity) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                dragOffsetRef.current = pos;
                snapToNearest(pos);
            }
        };

        animationRef.current = requestAnimationFrame(animate);
    }, [updateDOM, snapToNearest]);

    // 터치 이벤트
    useEffect(() => {
        const el = carouselRef.current;
        if (!el) return;

        const handleTouchStart = (e) => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
                const shift = Math.round(dragOffsetRef.current / CARD_SPACING);
                if (shift !== 0) {
                    currentIndexRef.current = clampIndex(currentIndexRef.current - shift);
                    setCurrentIndex(currentIndexRef.current);
                }
            }
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

            const rawOffset = clientX - startX.current;
            dragOffsetRef.current = getClampedOffset(rawOffset);
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
            const shift = Math.round(dragOffsetRef.current / CARD_SPACING);
            if (shift !== 0) {
                currentIndexRef.current = clampIndex(currentIndexRef.current - shift);
                setCurrentIndex(currentIndexRef.current);
            }
        }
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

        const rawOffset = clientX - startX.current;
        dragOffsetRef.current = getClampedOffset(rawOffset);
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

    useEffect(() => {
        currentIndexRef.current = currentIndex;
    }, [currentIndex]);

    // 이미지 미리 로드 (스와이프 시 깜빡임 방지)
    useEffect(() => {
        selectedCards.forEach(card => {
            if (card.image) {
                const img = new Image();
                img.src = card.image;
            }
        });
    }, [selectedCards]);

    useEffect(() => {
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, []);

    const centerCard = selectedCards[currentIndex];
    const VISIBLE_RANGE = 5;

    // 순환 없이 실제 존재하는 카드만 표시
    const getVisibleCards = () => {
        const visible = [];
        for (let i = -VISIBLE_RANGE; i <= VISIBLE_RANGE; i++) {
            const cardIndex = currentIndex + i;
            if (cardIndex < 0 || cardIndex >= totalCards) continue; // 범위 밖은 건너뜀
            const card = selectedCards[cardIndex];
            if (card) {
                visible.push({ card, slot: i, originalIndex: cardIndex });
            }
        }
        return visible;
    };

    const visibleCards = getVisibleCards();

    // PC용 버튼 네비게이션
    const goToCard = (direction) => {
        const newIndex = clampIndex(currentIndex + direction);
        if (newIndex !== currentIndex) {
            currentIndexRef.current = newIndex;
            setCurrentIndex(newIndex);
            dragOffsetRef.current = 0;
        }
    };

    return (
        <div className="summary-viewer-container">
            <div
                ref={carouselRef}
                className="viewer-wheel"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                style={{ cursor: isDraggingRef.current ? 'grabbing' : 'grab' }}
            >
                <div className="viewer-cards">
                    {visibleCards.map(({ card, slot, originalIndex }) => {
                        const style = getCardStyle(slot);

                        return (
                            <div
                                key={`viewer-${currentIndex}-${slot}`}
                                data-slot={slot}
                                className={`viewer-card ${slot === 0 ? 'center' : ''}`}
                                style={{
                                    ...style,
                                    transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease',
                                    willChange: 'transform, opacity'
                                }}
                            >
                                <img
                                    src={card.image || "/cards/back.png"}
                                    alt={card.name_kr}
                                    className={card.isReversed ? 'reversed' : ''}
                                    draggable="false"
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {centerCard && (
                <div className="viewer-card-info">
                    <span className="viewer-card-number">{currentIndex + 1}.</span>
                    <span className="viewer-card-name">{centerCard.name_kr}</span>
                    {centerCard.isReversed && (
                        <span className="viewer-reversed-badge">역방향</span>
                    )}
                </div>
            )}

            <div className="viewer-hint-row">
                <button
                    className="viewer-nav-btn"
                    onClick={() => goToCard(-1)}
                    disabled={currentIndex === 0}
                >
                    ‹
                </button>
                <p className="viewer-hint">← 스와이프하여 카드 확인 →</p>
                <button
                    className="viewer-nav-btn"
                    onClick={() => goToCard(1)}
                    disabled={currentIndex === maxIndex}
                >
                    ›
                </button>
            </div>
        </div>
    );
};

export default SummaryCardViewer;
