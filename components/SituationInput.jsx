import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './SituationInput.css';

const SituationInput = ({ onSubmit }) => {
    const { t } = useLanguage();
    const [situation, setSituation] = useState('');

    return (
        <section className="situation-screen mobile-screen" aria-label="Situation Input">
            <div className="situation-screen-body">
                <header className="situation-header">
                    <h2 className="situation-title">{t('situation.title')}</h2>
                    <p className="situation-subtitle">{t('situation.subtitle')}</p>
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
                    <div className="char-count">{situation.length} / 200</div>
                </div>

                <div className="situation-actions">
                    <button type="button" className="mystical-button" onClick={() => onSubmit(situation)}>
                        {t('situation.submit')}
                    </button>
                    <button type="button" className="mobile-cta-secondary" onClick={() => onSubmit('')}>
                        {t('situation.skip')}
                    </button>
                </div>
            </div>
        </section>
    );
};

export default SituationInput;
