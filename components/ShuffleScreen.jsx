import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './ShuffleScreen.css';

const ShuffleScreen = ({ onComplete }) => {
    const { t } = useLanguage();
    const [shuffleCount, setShuffleCount] = useState(0);
    const [isShuffling, setIsShuffling] = useState(true);
    const totalShuffles = 5;

    useEffect(() => {
        if (shuffleCount < totalShuffles) {
            const timer = setTimeout(() => {
                setShuffleCount(prev => prev + 1);
            }, 700);
            return () => clearTimeout(timer);
        } else {
            setIsShuffling(false);
            const completeTimer = setTimeout(() => {
                onComplete();
            }, 1500);
            return () => clearTimeout(completeTimer);
        }
    }, [shuffleCount, onComplete]);

    const cards = Array.from({ length: 7 }, (_, i) => i);

    return (
        <section className="shuffle-screen" aria-label="Card Shuffle">
            <div className="shuffle-content">
                <h2 className="shuffle-title">
                    {isShuffling ? t('shuffle.shuffling') : t('shuffle.ready')}
                </h2>

                <div className="shuffle-deck">
                    {cards.map((_, index) => (
                        <div
                            key={index}
                            className={`shuffle-card ${isShuffling ? 'shuffling' : ''}`}
                            style={{
                                '--index': index,
                                '--delay': `${index * 0.1}s`,
                                zIndex: cards.length - index
                            }}
                        >
                            <div className="shuffle-card-inner">
                                <img src="/cards/back.png" alt="Card back" className="shuffle-card-image" />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="shuffle-progress">
                    <div className="progress-bar" role="progressbar" aria-valuenow={shuffleCount} aria-valuemin={0} aria-valuemax={totalShuffles} aria-label="Shuffle progress">
                        <div
                            className="progress-fill"
                            style={{ width: `${(shuffleCount / totalShuffles) * 100}%` }}
                        />
                    </div>
                    <span className="progress-text">
                        {isShuffling ? `${shuffleCount} / ${totalShuffles}` : '✓'}
                    </span>
                </div>

                <p className="shuffle-hint">
                    {isShuffling
                        ? t('shuffle.hint')
                        : t('shuffle.complete')}
                </p>
            </div>
        </section>
    );
};

export default ShuffleScreen;
