'use client';

import { useEffect } from 'react';

const ServiceWorkerRegister = () => {
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;
        if (process.env.NODE_ENV !== 'production') return;

        navigator.serviceWorker.register('/sw.js').catch(() => {
            // Registration can fail on unsupported hosts; ignore silently.
        });
    }, []);

    return null;
};

export default ServiceWorkerRegister;
