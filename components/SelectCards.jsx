import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { flushSync } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { getSpreadCardCount } from '../lib/spreads';
import './SelectCards.css';
import MobileCarousel from './MobileCarousel';
import SelectedTrayCarousel from './SelectedTrayCarousel';

const FLY_DURATION_MS = 800;
const SELECT_ALL_STAGGER_MS = 160;

const createEmptySlots = (count) => Array.from({ length: count }, () => null);

const countFilledSlots = (slots) => slots.filter(Boolean).length;

const SelectCards = ({ cards, spread, onComplete }) => {
    const { t } = useLanguage();
    const maxCards = getSpreadCardCount(spread);
    const [slots, setSlots] = useState(() => createEmptySlots(maxCards));
    const [shuffledCards, setShuffledCards] = useState([]);
    const [flyingCard, setFlyingCard] = useState(null);
    const [revealedTrayIds, setRevealedTrayIds] = useState(() => new Set());
    const carouselRef = useRef(null);
    const trayCarouselRef = useRef(null);
    const slotRefs = useRef([]);
    const flyOverlayRef = useRef(null);
    const flyResolveRef = useRef(null);
    const isBusyRef = useRef(false);
    const prevFilledCountRef = useRef(0);
    const [isSelectingAll, setIsSelectingAll] = useState(false);
    const isScrollableTray = maxCards > 3;

    useEffect(() => {
        const shuffled = [...cards].sort(() => Math.random() - 0.5);
        setShuffledCards(shuffled);
        setSlots(createEmptySlots(maxCards));
        setFlyingCard(null);
        setRevealedTrayIds(new Set());
    }, [cards, spread, maxCards]);

    const selectedCardIds = slots.filter(Boolean).map((entry) => entry.id);
    const filledCount = countFilledSlots(slots);

    useEffect(() => {
        if (!isScrollableTray || isSelectingAll) {
            return;
        }

        if (filledCount <= prevFilledCountRef.current) {
            prevFilledCountRef.current = filledCount;
            return;
        }

        prevFilledCountRef.current = filledCount;

        const lastFilledIndex = slots.reduce(
            (lastIndex, entry, index) => (entry ? index : lastIndex),
            -1,
        );
        trayCarouselRef.current?.snapToSlot(lastFilledIndex);
    }, [filledCount, isScrollableTray, isSelectingAll, slots]);

    const getSlotRect = useCallback((slotIndex) => {
        if (isScrollableTray && trayCarouselRef.current) {
            trayCarouselRef.current.snapToSlot(slotIndex);
            return trayCarouselRef.current.getCenterSlotRect();
        }
        const slot = slotRefs.current[slotIndex];
        return slot?.getBoundingClientRect() ?? null;
    }, [isScrollableTray]);

    const beginFlyAnimation = useCallback((card, fromRect, toRect) => {
        return new Promise((resolve) => {
            if (!fromRect || !toRect) {
                setRevealedTrayIds((prev) => new Set(prev).add(card.id));
                resolve();
                return;
            }

            flyResolveRef.current = resolve;
            setFlyingCard({ card, fromRect, toRect });
        });
    }, []);

    useLayoutEffect(() => {
        if (!flyingCard || !flyOverlayRef.current) return undefined;

        const el = flyOverlayRef.current;
        const { fromRect, toRect } = flyingCard;
        const dx = toRect.left - fromRect.left;
        const dy = toRect.top - fromRect.top;
        const scaleX = toRect.width / fromRect.width;
        const scaleY = toRect.height / fromRect.height;

        el.style.left = `${fromRect.left}px`;
        el.style.top = `${fromRect.top}px`;
        el.style.width = `${fromRect.width}px`;
        el.style.height = `${fromRect.height}px`;
        el.style.transform = 'translate(0, 0) scale(1, 1)';

        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            const cardId = flyingCard.card.id;
            setFlyingCard(null);
            setRevealedTrayIds((prev) => new Set(prev).add(cardId));
            flyResolveRef.current?.();
            flyResolveRef.current = null;
        };

        const animation = el.animate(
            [
                { transform: 'translate(0, 0) scale(1, 1)' },
                { transform: `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})` },
            ],
            {
                duration: FLY_DURATION_MS,
                easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                fill: 'forwards',
            }
        );

        animation.onfinish = finish;

        return () => {
            finished = true;
            animation.cancel();
        };
    }, [flyingCard]);

    const handleCardAdd = useCallback((card, fromRect, deckIndex) => {
        if (filledCount >= maxCards) return;
        if (slots.some((entry) => entry?.id === card.id)) return;

        const traySlotIndex = slots.findIndex((entry) => entry === null);
        if (traySlotIndex < 0) return;

        const entry = {
            ...card,
            isReversed: Math.random() < 0.5,
            deckIndex,
        };
        const toRect = getSlotRect(traySlotIndex);

        flushSync(() => {
            setSlots((prev) => {
                const next = [...prev];
                next[traySlotIndex] = entry;
                return next;
            });
        });

        beginFlyAnimation(entry, fromRect, toRect);
    }, [filledCount, maxCards, slots, getSlotRect, beginFlyAnimation]);

    const handleTrayCancel = useCallback(async (traySlotIndex) => {
        if (isBusyRef.current) return;

        const entry = slots[traySlotIndex];
        if (!entry) return;

        isBusyRef.current = true;

        try {
            setRevealedTrayIds((prev) => {
                const next = new Set(prev);
                next.delete(entry.id);
                return next;
            });

            flushSync(() => {
                setSlots((prev) => {
                    const next = [...prev];
                    next[traySlotIndex] = null;
                    return next;
                });
            });

            await carouselRef.current?.scrollToDeckIndex(entry.deckIndex, { slow: true });
        } finally {
            isBusyRef.current = false;
        }
    }, [slots]);

    const handleSelectAll = useCallback(async () => {
        if (isBusyRef.current) return;

        const emptyTraySlots = slots
            .map((entry, index) => (entry === null ? index : -1))
            .filter((index) => index >= 0);

        if (!emptyTraySlots.length) return;

        const startingFilledCount = countFilledSlots(slots);
        const selectedIds = new Set(slots.filter(Boolean).map((entry) => entry.id));
        const picked = shuffledCards
            .filter((card) => !selectedIds.has(card.id))
            .sort(() => Math.random() - 0.5)
            .slice(0, emptyTraySlots.length)
            .map((card) => ({
                ...card,
                isReversed: Math.random() < 0.5,
                deckIndex: shuffledCards.findIndex((item) => item.id === card.id),
            }));

        isBusyRef.current = true;
        setIsSelectingAll(true);

        try {
            for (let i = 0; i < picked.length; i += 1) {
                const card = picked[i];
                const traySlotIndex = emptyTraySlots[i];

                await carouselRef.current?.scrollToDeckIndex(card.deckIndex);

                const fromRect = carouselRef.current?.getCenterCardRect();
                const toRect = getSlotRect(traySlotIndex);

                flushSync(() => {
                    setSlots((prev) => {
                        const next = [...prev];
                        next[traySlotIndex] = card;
                        return next;
                    });
                });

                await beginFlyAnimation(card, fromRect, toRect);

                if (i < picked.length - 1) {
                    await new Promise((resolve) => {
                        setTimeout(resolve, SELECT_ALL_STAGGER_MS);
                    });
                }
            }
        } finally {
            isBusyRef.current = false;
            setIsSelectingAll(false);
            prevFilledCountRef.current = startingFilledCount + picked.length;
        }
    }, [shuffledCards, slots, getSlotRect, beginFlyAnimation]);

    const handleConfirm = () => {
        if (filledCount === maxCards) {
            onComplete(slots.filter(Boolean));
        }
    };

    const cardMeanings = t(`select.cardMeanings.${spread}`);
    const hasMeanings = Array.isArray(cardMeanings) && cardMeanings.length > 0;
    const isMeaningVisible = hasMeanings && filledCount < maxCards;
    const meaningIndex = hasMeanings
        ? Math.min(filledCount, cardMeanings.length - 1)
        : 0;
    const displayMeaning = hasMeanings ? cardMeanings[meaningIndex] : '';
    const flyingCardId = flyingCard?.card.id;

    return (
        <section className="select-screen mobile-screen" aria-label="Card Selection">
            <div className="mobile-screen-scroll select-screen-body">
                <header className="select-header">
                    <h2 className="select-title">{t('select.title')}</h2>
                    <p className="select-subtitle">
                        {t('select.subtitle', { count: maxCards })}
                    </p>
                    <div className="selection-counter" aria-live="polite">
                        <span className="counter-current">{filledCount}</span>
                        <span className="counter-divider">/</span>
                        <span className="counter-max">{maxCards}</span>
                    </div>
                </header>

                {hasMeanings && (
                    <div className="card-meaning-slot">
                        <div className="card-meaning">
                            <p
                                className={`meaning-text${isMeaningVisible ? '' : ' meaning-text--hidden'}`}
                                aria-hidden={!isMeaningVisible}
                            >
                                {displayMeaning}
                            </p>
                        </div>
                    </div>
                )}

                <MobileCarousel
                    ref={carouselRef}
                    cards={shuffledCards}
                    selectedCardIds={selectedCardIds}
                    selectedCount={filledCount}
                    onCardAdd={handleCardAdd}
                    onConfirm={handleConfirm}
                    maxCards={maxCards}
                />
            </div>

            {isScrollableTray ? (
                <SelectedTrayCarousel
                    ref={trayCarouselRef}
                    slots={slots}
                    maxCards={maxCards}
                    revealedTrayIds={revealedTrayIds}
                    flyingCardId={flyingCardId}
                    onCancel={handleTrayCancel}
                    disabled={isSelectingAll}
                    cancelLabel={(n) => t('carousel.cancelCard', { n })}
                />
            ) : (
                <div className="selected-cards-tray" aria-label="Selected cards">
                    {slots.map((entry, index) => {
                        const showInTray = entry
                            && entry.id !== flyingCardId
                            && revealedTrayIds.has(entry.id);

                        return (
                            <div
                                key={index}
                                ref={(el) => {
                                    slotRefs.current[index] = el;
                                }}
                                className="selected-slot"
                            >
                                {showInTray && (
                                    <button
                                        type="button"
                                        className="selected-tray-card"
                                        onClick={() => handleTrayCancel(index)}
                                        disabled={isSelectingAll}
                                        aria-label={t('carousel.cancelCard', { n: index + 1 })}
                                    >
                                        <img src="/cards/back.png" alt="" draggable="false" />
                                        <span className="selected-tray-badge">{index + 1}</span>
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="select-footer-actions">
                <button
                    type="button"
                    className={`mobile-cta-secondary select-all-btn${filledCount >= maxCards ? ' select-all-btn--hidden' : ''}`}
                    onClick={handleSelectAll}
                    disabled={filledCount >= maxCards || isSelectingAll}
                    aria-hidden={filledCount >= maxCards}
                    tabIndex={filledCount >= maxCards ? -1 : 0}
                >
                    {t('select.selectAll')}
                </button>
            </div>

            {flyingCard && (
                <div
                    ref={flyOverlayRef}
                    className="card-fly-overlay"
                    aria-hidden="true"
                >
                    <div className="card-fly-inner">
                        <img src="/cards/back.png" alt="" draggable="false" />
                    </div>
                </div>
            )}
        </section>
    );
};

export default SelectCards;
