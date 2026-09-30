import React, {
    useState,
    useRef,
    useEffect,
    useCallback,
    forwardRef,
    useImperativeHandle,
} from 'react';
import { flushSync } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import './MobileCarousel.css';

const MobileCarousel = forwardRef(({
    cards,
    selectedCardIds,
    selectedCount,
    onCardAdd,
    onConfirm,
    maxCards,
}, ref) => {
    const { t } = useLanguage();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const carouselRef = useRef(null);
    const startX = useRef(0);
    const lastX = useRef(0);
    const velocity = useRef(0);
    const lastTime = useRef(0);
    const animationRef = useRef(null);
    const isDraggingRef = useRef(false);
    const currentIndexRef = useRef(0);
    const dragOffsetRef = useRef(0);
    const scrollQueueRef = useRef(Promise.resolve());
    const isProgrammaticScrollRef = useRef(false);

    const totalCards = cards.length;
    const CARD_SPACING = 85;
    const VISIBLE_RANGE = 20;
    const selectedIdSet = new Set(selectedCardIds);
    const allSelected = selectedCount >= maxCards;

    const wrapIndex = useCallback((idx) => {
        let i = idx % totalCards;
        if (i < 0) i += totalCards;
        return i;
    }, [totalCards]);

    const normalizeShift = useCallback((from, to) => {
        let diff = from - to;
        while (diff > totalCards / 2) diff -= totalCards;
        while (diff < -totalCards / 2) diff += totalCards;
        return diff;
    }, [totalCards]);

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
            zIndex: 10 - Math.round(dist),
        };
    };

    const updateDOM = useCallback((pixelOffset) => {
        const container = carouselRef.current;
        if (!container) return;

        const fraction = pixelOffset / CARD_SPACING;
        const cardElements = container.querySelectorAll('.carousel-card');

        cardElements.forEach((el) => {
            const slot = parseInt(el.dataset.slot, 10);
            const effectivePos = slot + fraction;
            const style = getCardStyle(effectivePos);

            el.style.transform = style.transform;
            el.style.opacity = style.opacity;
            el.style.zIndex = style.zIndex;
            el.style.transition = 'none';
        });
    }, []);

    const snapToNearest = useCallback((fromPixel) => {
        const targetPixel = Math.round(fromPixel / CARD_SPACING) * CARD_SPACING;
        const startTime = performance.now();
        const duration = 280;
        setIsAnimating(true);

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
                currentIndexRef.current = wrapIndex(currentIndexRef.current - shift);
                setCurrentIndex(currentIndexRef.current);
                dragOffsetRef.current = 0;
                setIsAnimating(false);
                animationRef.current = null;
            }
        };

        animationRef.current = requestAnimationFrame(animate);
    }, [updateDOM, wrapIndex]);

    const settleCarouselOffset = useCallback(() => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }

        if (isProgrammaticScrollRef.current) {
            dragOffsetRef.current = 0;
            updateDOM(0);
            setIsAnimating(false);
            isProgrammaticScrollRef.current = false;
            return;
        }

        const shift = Math.round(dragOffsetRef.current / CARD_SPACING);
        if (shift !== 0) {
            currentIndexRef.current = wrapIndex(currentIndexRef.current - shift);
            setCurrentIndex(currentIndexRef.current);
        }

        dragOffsetRef.current = 0;
        updateDOM(0);
        setIsAnimating(false);
    }, [updateDOM, wrapIndex]);

    const runScrollToDeckIndex = useCallback((targetIndex, options = {}) => {
        const { slow = false } = options;

        return new Promise((resolve) => {
            if (!totalCards) {
                resolve();
                return;
            }

            settleCarouselOffset();

            const fromIndex = currentIndexRef.current;
            const normalizedTarget = wrapIndex(targetIndex);
            const diff = normalizeShift(fromIndex, normalizedTarget);

            if (diff === 0) {
                dragOffsetRef.current = 0;
                updateDOM(0);
                resolve();
                return;
            }

            isProgrammaticScrollRef.current = true;

            flushSync(() => {
                currentIndexRef.current = normalizedTarget;
                setCurrentIndex(normalizedTarget);
            });

            const startPixel = diff * CARD_SPACING;
            dragOffsetRef.current = startPixel;
            updateDOM(startPixel);

            const startTime = performance.now();
            const duration = slow
                ? Math.min(900, Math.max(480, Math.abs(diff) * 72))
                : Math.min(560, Math.max(280, Math.abs(diff) * 45));
            setIsAnimating(true);

            const animate = (now) => {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const currentPixel = startPixel * (1 - eased);

                dragOffsetRef.current = currentPixel;
                updateDOM(currentPixel);

                if (progress < 1) {
                    animationRef.current = requestAnimationFrame(animate);
                } else {
                    dragOffsetRef.current = 0;
                    updateDOM(0);
                    setIsAnimating(false);
                    animationRef.current = null;
                    isProgrammaticScrollRef.current = false;
                    resolve();
                }
            };

            animationRef.current = requestAnimationFrame(animate);
        });
    }, [normalizeShift, settleCarouselOffset, totalCards, updateDOM, wrapIndex]);

    const scrollToDeckIndex = useCallback((targetIndex, options) => {
        const nextScroll = scrollQueueRef.current
            .then(() => runScrollToDeckIndex(targetIndex, options));

        scrollQueueRef.current = nextScroll.catch(() => {});
        return nextScroll;
    }, [runScrollToDeckIndex]);

    useImperativeHandle(ref, () => ({
        getCenterCardRect: () => {
            const el = carouselRef.current?.querySelector('.carousel-card[data-slot="0"]');
            return el?.getBoundingClientRect() ?? carouselRef.current?.getBoundingClientRect() ?? null;
        },
        scrollToDeckIndex,
    }), [scrollToDeckIndex]);

    const animateMomentum = useCallback((initialVelocity) => {
        let vel = initialVelocity;
        let pos = dragOffsetRef.current;
        const friction = 0.97;
        const minVelocity = 0.05;

        setIsAnimating(true);

        const animate = () => {
            vel *= friction;
            pos += vel * 16;

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

    useEffect(() => {
        const el = carouselRef.current;
        if (!el) return undefined;

        const handleTouchStart = (e) => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;

                const shift = Math.round(dragOffsetRef.current / CARD_SPACING);
                if (shift !== 0) {
                    currentIndexRef.current = wrapIndex(currentIndexRef.current - shift);
                    setCurrentIndex(currentIndexRef.current);
                }
            }
            setIsAnimating(false);
            isDraggingRef.current = true;
            setIsDragging(true);

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
            dragOffsetRef.current = clientX - startX.current;
            updateDOM(dragOffsetRef.current);
        };

        const handleTouchEnd = () => {
            if (!isDraggingRef.current) return;
            isDraggingRef.current = false;
            setIsDragging(false);

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
    }, [updateDOM, animateMomentum, snapToNearest, totalCards, wrapIndex]);

    const handleMouseDown = (e) => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;

            const shift = Math.round(dragOffsetRef.current / CARD_SPACING);
            if (shift !== 0) {
                currentIndexRef.current = wrapIndex(currentIndexRef.current - shift);
                setCurrentIndex(currentIndexRef.current);
            }
        }
        setIsAnimating(false);
        isDraggingRef.current = true;
        setIsDragging(true);
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
        setIsDragging(false);

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

    const centerCard = cards[currentIndex];
    const isCenterEmpty = centerCard && selectedIdSet.has(centerCard.id);

    const getCenterCardRect = () => {
        const el = carouselRef.current?.querySelector('.carousel-card[data-slot="0"]');
        return el?.getBoundingClientRect() ?? null;
    };

    const handleSelectCard = () => {
        if (isAnimating) return;

        if (allSelected) {
            onConfirm?.();
            return;
        }

        if (!centerCard || isCenterEmpty) return;

        if (selectedCount < maxCards) {
            onCardAdd(centerCard, getCenterCardRect(), currentIndex);
        }
    };

    const getVisibleCards = () => {
        const visible = [];
        for (let i = -VISIBLE_RANGE; i <= VISIBLE_RANGE; i += 1) {
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
        const preload = new Image();
        preload.src = '/cards/back.png';
    }, []);

    useEffect(() => () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
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
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
                <div className="card-halo" aria-hidden="true" />
                <div className="carousel-cards">
                    {visibleCards.map(({ card, slot }) => {
                        const isPicked = selectedIdSet.has(card.id);
                        const style = getCardStyle(slot);

                        return (
                            <div
                                key={card.id}
                                data-slot={slot}
                                className={`carousel-card ${slot === 0 ? 'center' : ''} ${isPicked ? 'carousel-card--empty' : ''}`}
                                style={{
                                    ...style,
                                    transition: isAnimating
                                        ? 'none'
                                        : 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease',
                                    willChange: 'transform, opacity',
                                }}
                            >
                                <div className="carousel-card-face" aria-hidden="true" />
                                {isPicked && (
                                    <div className="carousel-card-empty" aria-hidden="true" />
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
                type="button"
                className={`mystical-button carousel-select-btn ${allSelected ? 'ready' : ''}`}
                onClick={handleSelectCard}
                disabled={isAnimating}
            >
                {allSelected ? t('select.confirm') : t('carousel.selectCard')}
            </button>

            <p className="carousel-hint">{t('carousel.hint')}</p>
        </div>
    );
});

MobileCarousel.displayName = 'MobileCarousel';

export default MobileCarousel;
