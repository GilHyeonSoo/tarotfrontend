import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './SituationInput.css';

const SituationInput = ({ category, onSubmit }) => {
    const { t } = useLanguage();
    const [situation, setSituation] = useState('');

    const handleSubmit = () => {
        onSubmit(situation);
    };

    const handleSkip = () => {
        onSubmit('');
    };

    return (
        <section className="situation-screen" aria-label="Situation Input">
            <header className="situation-header">
                <span className="selected-category">
                    {category.icon} {category.name}
                </span>
                <h2 className="situation-title">{t('situation.title')}</h2>
                <p className="situation-subtitle">
                    {t('situation.subtitle')}
                </p>
            </header>

            <div className="situation-input-container">
                <label htmlFor="situation-input" className="sr-only">{t('situation.title')}</label>
                <textarea
                    id="situation-input"
                    className="situation-textarea"
                    placeholder={t('situation.placeholder')}
                    value={situation}
                    onChange={(e) => setSituation(e.target.value)}
                    rows={5}
                    maxLength={200}
                />
                <div className="char-count">
                    {situation.length} / 200
                </div>
            </div>

            <div className="situation-buttons">
                <button
                    className="mystical-button"
                    onClick={handleSubmit}
                >
                    {t('situation.submit')}
                </button>
                <button
                    className="skip-button"
                    onClick={handleSkip}
                >
                    {t('situation.skip')}
                </button>
            </div>
        </section>
    );
};

export default SituationInput;
