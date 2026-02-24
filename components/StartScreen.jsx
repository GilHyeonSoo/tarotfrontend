import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './StartScreen.css';

const StartScreen = ({ onStart }) => {
    const { t } = useLanguage();

    return (
        <section className="start-screen" aria-label="Tarot Start">
            <div className="start-content">
                <div className="logo-container floating">
                    <div className="moon-symbol">☽</div>
                    <h1 className="main-title">Lumina Tarot</h1>
                    <p className="subtitle">{t('start.subtitle')}</p>
                </div>

                <div className="decorative-line" aria-hidden="true">
                    <span>✦</span>
                    <div className="line"></div>
                    <span>✦</span>
                    <div className="line"></div>
                    <span>✦</span>
                </div>

                <p className="intro-text">
                    {t('start.introText1')}<br />
                    {t('start.introText2')}
                </p>

                <button className="mystical-button glow-pulse" onClick={onStart} aria-label="Start tarot reading">
                    {t('start.startButton')}
                </button>

                <div className="card-preview" aria-hidden="true">
                    <div className="preview-card" style={{ '--delay': '0s' }}>✦</div>
                    <div className="preview-card" style={{ '--delay': '0.2s' }}>☆</div>
                    <div className="preview-card" style={{ '--delay': '0.4s' }}>✦</div>
                </div>
            </div>
        </section>
    );
};

export default StartScreen;
