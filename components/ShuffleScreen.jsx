import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './ShuffleScreen.css';

const SHUFFLE_CYCLE_MS = 500;
const GATHER_MS = 480;
const FAN_MS = 520;
const STACK_MS = 500;
const READY_MS = 400;
const HINT_FADE_MS = 500;
const TOTAL_SHUFFLES = 3;
const CARD_COUNT = 5;
const CENTER_INDEX = Math.floor(CARD_COUNT / 2);
const GATHER_TARGET = 'translate(-50%, -50%) translate(0px, 0px) rotate(0deg)';

const animateCardsToCenter = (cards, fromTransforms, duration, delayForIndex) => {
    cards.forEach((el, index) => {
        const from = fromTransforms[index] || getComputedStyle(el).transform;
        el.style.transform = from === 'none' ? GATHER_TARGET : from;
    });

    const animations = cards.map((el, index) => el.animate(
        [
            { transform: el.style.transform },
            { transform: GATHER_TARGET },
        ],
        {
            duration,
            delay: delayForIndex(index),
            easing: 'ease-in-out',
            fill: 'forwards',
        }
    ));

    return Promise.all(animations.map((animation) => animation.finished)).then(() => {
        animations.forEach((animation) => animation.commitStyles?.());
    });
};

const ShuffleScreen = ({ onComplete }) => {
    const { t } = useLanguage();
    const [shuffleCount, setShuffleCount] = useState(0);
    const [phase, setPhase] = useState('shuffling');
    const [hintVisible, setHintVisible] = useState(true);
    const [hintFading, setHintFading] = useState(false);
    const cardRefs = useRef([]);
    const transitionFromTransforms = useRef([]);
    const gatherStarted = useRef(false);
    const stackStarted = useRef(false);

    useEffect(() => {
        if (phase !== 'shuffling') return undefined;

        if (shuffleCount < TOTAL_SHUFFLES) {
            const timer = setTimeout(() => {
                setShuffleCount((prev) => prev + 1);
            }, SHUFFLE_CYCLE_MS);
            return () => clearTimeout(timer);
        }

        const gatherTimer = setTimeout(() => {
            transitionFromTransforms.current = cardRefs.current
                .filter(Boolean)
                .map((el) => getComputedStyle(el).transform);
            setHintFading(true);
            setPhase('gathering');
        }, SHUFFLE_CYCLE_MS);

        return () => clearTimeout(gatherTimer);
    }, [phase, shuffleCount]);

    useLayoutEffect(() => {
        if (phase !== 'gathering' || gatherStarted.current) return undefined;

        const cards = cardRefs.current.filter(Boolean);
        if (!cards.length) return undefined;

        gatherStarted.current = true;

        const animationsPromise = animateCardsToCenter(
            cards,
            transitionFromTransforms.current,
            GATHER_MS,
            (index) => index * 35
        );

        animationsPromise
            .then(() => setPhase('fanning'))
            .catch(() => setPhase('fanning'));

        return () => undefined;
    }, [phase]);

    useLayoutEffect(() => {
        if (phase !== 'stacking' || stackStarted.current) return undefined;

        const cards = cardRefs.current.filter(Boolean);
        if (!cards.length) return undefined;

        stackStarted.current = true;

        const animationsPromise = animateCardsToCenter(
            cards,
            transitionFromTransforms.current,
            STACK_MS,
            (index) => Math.abs(index - CENTER_INDEX) * 40
        );

        animationsPromise
            .then(() => setPhase('ready'))
            .catch(() => setPhase('ready'));

        return () => undefined;
    }, [phase]);

    useEffect(() => {
        if (!hintFading) return undefined;

        const timer = setTimeout(() => setHintVisible(false), HINT_FADE_MS);
        return () => clearTimeout(timer);
    }, [hintFading]);

    useEffect(() => {
        if (phase === 'fanning') {
            const timer = setTimeout(() => {
                transitionFromTransforms.current = cardRefs.current
                    .filter(Boolean)
                    .map((el) => getComputedStyle(el).transform);
                setPhase('stacking');
            }, FAN_MS);
            return () => clearTimeout(timer);
        }
        if (phase === 'ready') {
            const timer = setTimeout(() => onComplete(), READY_MS);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [phase, onComplete]);

    const cards = Array.from({ length: CARD_COUNT }, (_, i) => i);

    return (
        <section className="shuffle-screen mobile-screen" aria-label="Card Shuffle">
            <div className="mobile-screen-scroll shuffle-screen-body">
                <div className="shuffle-stage">
                    <div className="shuffle-deck">
                        {cards.map((index) => {
                            const offset = index - CENTER_INDEX;

                            return (
                                <div
                                    key={index}
                                    ref={(el) => {
                                        cardRefs.current[index] = el;
                                    }}
                                    className={`shuffle-card shuffle-card--${phase}`}
                                    style={{
                                        '--index': index,
                                        '--delay': `${index * 0.08}s`,
                                        '--fan-x': `${offset * 7}px`,
                                        '--fan-y': `${Math.abs(offset) * 2}px`,
                                        '--fan-rotate': `${offset * 3}deg`,
                                        zIndex: CARD_COUNT - index,
                                    }}
                                >
                                    <div className="shuffle-card-inner">
                                        <img src="/cards/back.png" alt="" className="shuffle-card-image" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="shuffle-hint-slot" aria-live="polite">
                        {hintVisible && (
                            <p className={`shuffle-hint${hintFading ? ' shuffle-hint--fading' : ''}`}>
                                {t('shuffle.hint')}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ShuffleScreen;
