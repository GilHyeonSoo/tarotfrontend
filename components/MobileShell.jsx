'use client';

import LanguageSelector from '@/components/LanguageSelector';
import NightSkyBackground from '@/components/NightSkyBackground';
import './MobileShell.css';

export default function MobileShell({
    showBack,
    onBack,
    showLanguage = false,
    children,
}) {
    return (
        <div className="mobile-shell-frame">
            <NightSkyBackground />
            <div className="mobile-shell">
                <header className="mobile-shell-header">
                    {showBack ? (
                        <button
                            type="button"
                            className="mobile-shell-back"
                            onClick={onBack}
                            aria-label="Back"
                        >
                            <img
                                src="/icons/back-arrow.png"
                                alt=""
                                className="mobile-shell-back-icon"
                                draggable="false"
                            />
                        </button>
                    ) : (
                        <span className="mobile-shell-back-spacer" aria-hidden="true" />
                    )}
                    {showLanguage ? (
                        <LanguageSelector variant="shell" />
                    ) : (
                        <span className="mobile-shell-back-spacer" aria-hidden="true" />
                    )}
                </header>
                <div className="mobile-shell-content">
                    {children}
                </div>
            </div>
        </div>
    );
}
