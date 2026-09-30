import React, {
    useState,
    useRef,
    useEffect,
    useCallback,
    forwardRef,
    useImperativeHandle,
} from 'react';
import { flushSync } from 'react-dom';
import './SelectedTrayCarousel.css';

const CARD_SPACING = 58;
const VISIBLE_RANGE = 5;
const DRAG_THRESHOLD_PX = 10;

const SelectedTrayCarousel = forwardRef(({
    slots,
    maxCards,
    revealedTrayIds,
    flyingCardId,
    onCancel,
    disabled,
    cancelLabel,
}, ref) => {
    const [currentIndex, setCurrentIndex] = useState(0);
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
    const dragMovedRef = useRef(false);
    const activePointerIdRef = useRef(null);

    const maxIndex = Math.max(0, maxCards - 1);
    const clampIndex = useCallback(
        (idx) => Math.max(0, Math.min(maxIndex, idx)),
        [maxIndex],
    );

    const getClampedOffset = useCallback((rawOffset) => {
        const maxRight = currentIndexRef.current * CARD_SPACING;
        const maxLeft = -(maxIndex - currentIndexRef.current) * CARD_SPACING;

        if (rawOffset > maxRight) {
            const overflow = rawOffset - maxRight;
            return maxRight + overflow * 0.2;
        }
        if (rawOffset < maxLeft) {
            const overflow = rawOffset - maxLeft;
            return maxLeft + overflow * 0.2;
        }
        return rawOffset;
    }, [maxIndex]);

    const getCardStyle = (fractionalOffset) => {
        const baseX = fractionalOffset * CARD_SPACING;
        const dist = Math.abs(fractionalOffset);
        const scale = Math.max(0.62, 1 - dist * 0.12);
        const opacity = Math.max(0.12, 1 - dist * 0.28);
        const translateY = dist * dist * 2;
        const rotateZ = fractionalOffset * 2;

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
        const cardElements = container.querySelectorAll('.tray-carousel-slot');

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
        const fromFraction = fromPixel / CARD_SPACING;
        let targetCards = Math.round(fromFraction);

        const newIndex = currentIndexRef.current - targetCards;
        if (newIndex < 0) targetCards = currentIndexRef.current;
        if (newIndex > maxIndex) targetCards = currentIndexRef.current - maxIndex;

        const targetPixel = targetCards * CARD_SPACING;
        const startTime = performance.now();
        const duration = 280;

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
                updateDOM(0);
                animationRef.current = null;
            }
        };

        animationRef.current = requestAnimationFrame(animate);
    }, [clampIndex, maxIndex, updateDOM]);

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
    }, [maxIndex, snapToNearest, updateDOM]);

    const snapToSlot = useCallback((slotIndex) => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }
        const next = clampIndex(slotIndex);
        flushSync(() => {
            currentIndexRef.current = next;
            setCurrentIndex(next);
        });
        dragOffsetRef.current = 0;
        updateDOM(0);
    }, [clampIndex, updateDOM]);

    useImperativeHandle(ref, () => ({
        snapToSlot,
        getCenterSlotRect: () => {
            const el = carouselRef.current?.querySelector('.tray-carousel-slot[data-slot="0"]');
            return el?.getBoundingClientRect() ?? null;
        },
    }), [snapToSlot]);

    useEffect(() => {
        currentIndexRef.current = currentIndex;
    }, [currentIndex]);

    useEffect(() => {
        const img = new Image();
        img.src = '/cards/back.png';
    }, []);

    useEffect(() => () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }, []);

    const beginPointerDrag = useCallback((clientX) => {
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
        setIsDragging(true);
        dragMovedRef.current = false;
        startX.current = clientX;
        lastX.current = clientX;
        lastTime.current = performance.now();
        velocity.current = 0;
        dragOffsetRef.current = 0;
    }, [clampIndex]);

    const updatePointerDrag = useCallback((clientX) => {
        if (!isDraggingRef.current) return;

        const deltaX = clientX - startX.current;
        if (Math.abs(deltaX) > DRAG_THRESHOLD_PX) {
            dragMovedRef.current = true;
        }

        const now = performance.now();
        const dt = now - lastTime.current;

        if (dt > 0) {
            const instantVel = (clientX - lastX.current) / dt;
            velocity.current = velocity.current * 0.3 + instantVel * 0.7;
        }

        lastX.current = clientX;
        lastTime.current = now;
        dragOffsetRef.current = getClampedOffset(deltaX);
        updateDOM(dragOffsetRef.current);
    }, [getClampedOffset, updateDOM]);

    const endPointerDrag = useCallback(() => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        setIsDragging(false);
        activePointerIdRef.current = null;

        if (Math.abs(velocity.current) > 0.15) {
            animateMomentum(velocity.current);
        } else {
            snapToNearest(dragOffsetRef.current);
        }
    }, [animateMomentum, snapToNearest]);

    const handlePointerDown = (e) => {
        if (disabled || e.button > 0) return;

        activePointerIdRef.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        beginPointerDrag(e.clientX);
    };

    const handlePointerMove = (e) => {
        if (activePointerIdRef.current !== e.pointerId) return;
        updatePointerDrag(e.clientX);
    };

    const handlePointerUp = (e) => {
        if (activePointerIdRef.current !== e.pointerId) return;
        e.currentTarget.releasePointerCapture(e.pointerId);
        endPointerDrag();
    };

    const handlePointerCancel = (e) => {
        if (activePointerIdRef.current !== e.pointerId) return;
        endPointerDrag();
    };

    const handleCardCancel = (slotIndex) => {
        if (dragMovedRef.current) return;
        onCancel?.(slotIndex);
    };

    const visibleSlots = [];
    for (let i = -VISIBLE_RANGE; i <= VISIBLE_RANGE; i += 1) {
        const slotIndex = currentIndex + i;
        if (slotIndex < 0 || slotIndex >= maxCards) continue;
        visibleSlots.push({ slotIndex, slot: i });
    }

    return (
        <div className="selected-tray-carousel" aria-label="Selected cards">
            <div className="selected-tray-carousel-mask">
                <div
                    ref={carouselRef}
                    className="tray-carousel-wheel"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                    style={{
                        cursor: disabled ? 'default' : (isDragging ? 'grabbing' : 'grab'),
                        touchAction: 'none',
                    }}
                >
                    <div className="tray-carousel-cards">
                        {visibleSlots.map(({ slotIndex, slot }) => {
                            const entry = slots[slotIndex];
                            const showCard = entry
                                && entry.id !== flyingCardId
                                && revealedTrayIds.has(entry.id);
                            const style = getCardStyle(slot);

                            return (
                                <div
                                    key={`tray-slot-${slotIndex}`}
                                    data-slot={slot}
                                    className={`tray-carousel-slot ${slot === 0 ? 'center' : ''}`}
                                    style={{
                                        ...style,
                                        transition: 'none',
                                        willChange: 'transform, opacity',
                                    }}
                                >
                                    {showCard ? (
                                        <button
                                            type="button"
                                            className="selected-tray-card"
                                            onClick={() => handleCardCancel(slotIndex)}
                                            disabled={disabled}
                                            aria-label={cancelLabel?.(slotIndex + 1)}
                                        >
                                            <div className="selected-tray-card-face" aria-hidden="true" />
                                            <span className="selected-tray-badge">{slotIndex + 1}</span>
                                        </button>
                                    ) : (
                                        <div className="tray-carousel-slot-empty" aria-hidden="true" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
});

SelectedTrayCarousel.displayName = 'SelectedTrayCarousel';

export default SelectedTrayCarousel;
