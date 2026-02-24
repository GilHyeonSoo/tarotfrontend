import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './FeedbackModal.css';

const FeedbackModal = () => {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [status, setStatus] = useState('idle'); // 'idle', 'sending', 'success'

    const handleOpen = () => setIsOpen(true);
    const handleClose = () => {
        setIsOpen(false);
        setTimeout(() => {
            setFeedback('');
            setStatus('idle');
        }, 300);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!feedback.trim()) return;

        setStatus('sending');

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const response = await fetch(`${API_URL}/api/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    feedback: feedback.trim(),
                    language: document.documentElement.lang || 'ko' // Add language context
                }),
            });

            if (response.status === 429) {
                alert('너무 많은 의견을 보내셨습니다. 잠시 후 1시간 뒤에 다시 시도해주세요. \n(Too many requests. Please try again later.)');
                setStatus('idle');
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to send feedback');
            }

            // 전송 성공
            setStatus('success');
            setFeedback('');
        } catch (error) {
            console.error('Feedback Error:', error);
            alert('의견 전송에 실패했습니다. 잠시 후 다시 시도해주세요.');
            setStatus('idle');
        }
    };

    // Close on overlay click
    const handleOverlayClick = (e) => {
        if (e.target.classList.contains('feedback-overlay')) {
            handleClose();
        }
    };

    return (
        <>
            <button
                className={`feedback-trigger ${isOpen ? 'hidden' : ''}`}
                onClick={handleOpen}
                aria-label={t('feedback.button')}
            >
                <span className="feedback-icon">✉️</span>
                <span className="feedback-text">{t('feedback.button')}</span>
            </button>

            {isOpen && (
                <div className="feedback-overlay" onClick={handleOverlayClick}>
                    <div className="feedback-modal">
                        <button
                            className="feedback-close"
                            onClick={handleClose}
                            aria-label={t('feedback.close')}
                        >
                            &times;
                        </button>

                        <div className="feedback-header">
                            <h2 className="feedback-title">{t('feedback.title')}</h2>
                            <p className="feedback-subtitle">{t('feedback.subtitle')}</p>
                        </div>

                        {status === 'success' ? (
                            <div className="feedback-success">
                                <div className="success-icon">🌟</div>
                                <p>{t('feedback.success')}</p>
                                <button className="mystical-button" onClick={handleClose}>
                                    {t('feedback.close')}
                                </button>
                            </div>
                        ) : (
                            <form className="feedback-form" onSubmit={handleSubmit}>
                                <textarea
                                    className="feedback-textarea"
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder={t('feedback.placeholder')}
                                    required
                                />
                                <button
                                    className={`mystical-button feedback-submit-btn ${feedback.trim() ? 'ready' : 'disabled'}`}
                                    type="submit"
                                    disabled={!feedback.trim() || status === 'sending'}
                                >
                                    {status === 'sending' ? (t('feedback.sending') || '보내는 중...') : t('feedback.submit')}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default FeedbackModal;
