import React, { useState } from 'react';
import './SituationInput.css';

const SituationInput = ({ category, onSubmit }) => {
    const [situation, setSituation] = useState('');

    const handleSubmit = () => {
        onSubmit(situation);
    };

    const handleSkip = () => {
        onSubmit('');
    };

    return (
        <section className="situation-screen" aria-label="상황 입력">
            <header className="situation-header">
                <span className="selected-category">
                    {category.icon} {category.name}
                </span>
                <h2 className="situation-title">현재 상황을 알려주세요</h2>
                <p className="situation-subtitle">
                    더 정확한 해석을 위해 고민이나 상황을 적어주세요
                </p>
            </header>

            <div className="situation-input-container">
                <label htmlFor="situation-input" className="sr-only">현재 상황 입력</label>
                <textarea
                    id="situation-input"
                    className="situation-textarea"
                    placeholder="당신의 현재 상황을 이곳에 입력해주세요."
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
                    카드 뽑기
                </button>
                <button
                    className="skip-button"
                    onClick={handleSkip}
                >
                    건너뛰기
                </button>
            </div>
        </section>
    );
};

export default SituationInput;
