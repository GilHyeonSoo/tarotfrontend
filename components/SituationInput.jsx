'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './SituationInput.css';

const INTRO_MOVE_MS = 450;

function SituationQuestion({ onSubmit, t }) {
    const [situation, setSituation] = useState('');
    const [showQuestionError, setShowQuestionError] = useState(false);
    const [intro, setIntro] = useState({ phase: 'waiting', visiblePairs: 0 });
    const bodyRef = useRef(null);
    const headerRef = useRef(null);
    const formRef = useRef(null);
    const inputRef = useRef(null);
    const title = t('situation.title');
    const subtitle = t('situation.subtitle');
    const opening = t('situation.opening');
    const isReady = intro.phase === 'ready';

    const handleSubmit = () => {
        if (!situation.trim()) {
            setShowQuestionError(true);
            inputRef.current?.focus();
            return;
        }
        onSubmit(situation);
    };

    useEffect(() => {
        const body = bodyRef.current;
        const header = headerRef.current;
        const measure = () => {
            // Layout offsets ignore the header's animation transform.
            const offset = body.clientHeight / 2 - header.offsetTop - header.offsetHeight / 2;
            body.style.setProperty('--situation-intro-offset', `${offset}px`);
            const first = header.querySelector('[data-intro-group="first"]');
            const firstOffset = body.clientHeight / 2 - header.offsetTop - first.offsetTop - first.offsetHeight / 2;
            body.style.setProperty('--situation-first-offset', `${firstOffset}px`);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(body);
        observer.observe(header);
        observer.observe(formRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            const timer = setTimeout(() => setIntro({ phase: 'ready', visiblePairs: 2 }), 0);
            return () => clearTimeout(timer);
        }

        // Keep the first pair visible when the second pair joins it.
        const stages = [
            { delay: 250, phase: 'first', visiblePairs: 1 },
            { delay: 1500, phase: 'second', visiblePairs: 2 },
            { delay: 2700, phase: 'lifting', visiblePairs: 2 },
            { delay: 2700 + INTRO_MOVE_MS, phase: 'ready', visiblePairs: 2 },
        ];
        const timers = stages.map(({ delay, phase, visiblePairs }) =>
            setTimeout(() => setIntro({ phase, visiblePairs }), delay));
        return () => timers.forEach(clearTimeout);
    }, []);

    return (
        <section className="situation-screen mobile-screen" aria-label="Situation Input" data-intro-phase={intro.phase}>
            <div ref={bodyRef} className="situation-screen-body">
                <header ref={headerRef} className="situation-header">
                    <div
                        className={`situation-intro-group${intro.visiblePairs >= 1 ? ' is-visible' : ''}`}
                        data-intro-group="first"
                        aria-hidden={intro.visiblePairs < 1}
                    >
                        {opening.map((sentence, index) => (
                            <p key={index} className="situation-subtitle">{sentence}</p>
                        ))}
                    </div>
                    <div
                        className={`situation-intro-group${intro.visiblePairs >= 2 ? ' is-visible' : ''}`}
                        data-intro-group="second"
                        aria-hidden={intro.visiblePairs < 2}
                    >
                        <p className="situation-subtitle">{subtitle}</p>
                        <h2 className="situation-title">{title}</h2>
                    </div>
                </header>

                <div ref={formRef} className="situation-form" inert={!isReady} aria-hidden={!isReady}>
                    <div className="situation-input-container">
                        <label htmlFor="situation-input" className="sr-only">{t('situation.title')}</label>
                        <textarea
                            ref={inputRef}
                            id="situation-input"
                            className="situation-textarea"
                            placeholder={t('situation.placeholder')}
                            value={situation}
                            onChange={(e) => {
                                const value = e.target.value;
                                setSituation(value);
                                if (value.trim()) setShowQuestionError(false);
                            }}
                            aria-invalid={showQuestionError}
                            aria-describedby={showQuestionError ? 'situation-error' : undefined}
                            rows={5}
                            maxLength={200}
                            disabled={!isReady}
                        />
                        <div className="char-count">{situation.length} / 200</div>
                    </div>
                    <p id="situation-error" className="situation-error" role="alert">
                        {showQuestionError ? t('situation.required') : ''}
                    </p>

                    <div className="situation-actions">
                        <button type="button" className="situation-submit" disabled={!isReady} onClick={handleSubmit}>
                            {t('situation.submit')}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

const SituationInput = ({ onSubmit }) => {
    const { t, language } = useLanguage();
    return <SituationQuestion key={language} onSubmit={onSubmit} t={t} />;
};

export default SituationInput;
