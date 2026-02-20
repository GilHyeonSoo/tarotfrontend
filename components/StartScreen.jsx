import React from 'react';
import './StartScreen.css';

const StartScreen = ({ onStart }) => {
    return (
        <div className="start-screen">
            <div className="start-content">
                <div className="logo-container floating">
                    <div className="moon-symbol">☽</div>
                    <h1 className="main-title">Lumina Tarot</h1>
                    <div className="subtitle">운명의 카드가 당신을 기다립니다</div>
                </div>

                <div className="decorative-line">
                    <span>✦</span>
                    <div className="line"></div>
                    <span>✦</span>
                    <div className="line"></div>
                    <span>✦</span>
                </div>

                <p className="intro-text">
                    78장의 신비로운 카드 중<br />
                    당신의 운명을 밝혀줄 10장을 선택하세요
                </p>

                <button className="mystical-button glow-pulse" onClick={onStart}>
                    시작하기
                </button>

                <div className="card-preview">
                    <div className="preview-card" style={{ '--delay': '0s' }}>✦</div>
                    <div className="preview-card" style={{ '--delay': '0.2s' }}>☆</div>
                    <div className="preview-card" style={{ '--delay': '0.4s' }}>✦</div>
                </div>
            </div>
        </div>
    );
};

export default StartScreen;
