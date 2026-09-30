'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './PwaInstallBanner.css';

const DISMISS_KEY = 'lumina-pwa-dismissed-until';
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;
const IOS_HINT_DELAY_MS = 3000;

const getDismissedUntil = () => {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return 0;
    const ts = Number(raw);
    return Number.isFinite(ts) ? ts : 0;
};

const isStandaloneMode = () =>
    window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;

const isIosDevice = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

const PwaInstallBanner = () => {
    const { t } = useLanguage();
    const [visible, setVisible] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showIosHint, setShowIosHint] = useState(false);
    const [installing, setInstalling] = useState(false);

    useEffect(() => {
        if (isStandaloneMode()) return undefined;
        if (Date.now() < getDismissedUntil()) return undefined;

        const onBeforeInstall = (event) => {
            event.preventDefault();
            setDeferredPrompt(event);
            setVisible(true);
        };

        const onAppInstalled = () => {
            setVisible(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', onBeforeInstall);
        window.addEventListener('appinstalled', onAppInstalled);

        let iosTimer;
        if (isIosDevice()) {
            iosTimer = window.setTimeout(() => {
                setShowIosHint(true);
                setVisible(true);
            }, IOS_HINT_DELAY_MS);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', onBeforeInstall);
            window.removeEventListener('appinstalled', onAppInstalled);
            if (iosTimer) window.clearTimeout(iosTimer);
        };
    }, []);

    const handleDismiss = useCallback(() => {
        localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
        setVisible(false);
    }, []);

    const handleInstall = useCallback(async () => {
        if (!deferredPrompt) return;

        setInstalling(true);
        try {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setVisible(false);
            }
        } finally {
            setDeferredPrompt(null);
            setInstalling(false);
        }
    }, [deferredPrompt]);

    if (!visible) return null;

    const canInstall = Boolean(deferredPrompt);
    const subtitle = showIosHint && !canInstall ? t('pwa.iosHint') : t('pwa.subtitle');

    return (
        <aside className="pwa-install-banner" role="dialog" aria-labelledby="pwa-install-title">
            <button
                type="button"
                className="pwa-install-close"
                onClick={handleDismiss}
                aria-label={t('pwa.dismiss')}
            >
                ×
            </button>

            <div className="pwa-install-content">
                <span className="pwa-install-icon" aria-hidden="true">✦</span>
                <div className="pwa-install-text">
                    <p id="pwa-install-title" className="pwa-install-title">{t('pwa.title')}</p>
                    <p className="pwa-install-subtitle">{subtitle}</p>
                </div>
            </div>

            <div className="pwa-install-actions">
                {canInstall && (
                    <button
                        type="button"
                        className="pwa-install-btn"
                        onClick={handleInstall}
                        disabled={installing}
                    >
                        {installing ? t('pwa.installing') : t('pwa.install')}
                    </button>
                )}
                <button type="button" className="pwa-dismiss-btn" onClick={handleDismiss}>
                    {t('pwa.dismiss')}
                </button>
            </div>
        </aside>
    );
};

export default PwaInstallBanner;
