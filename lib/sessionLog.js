const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const SESSION_STORAGE_KEY = 'lumina-reading-session';

const matchVersion = (ua, pattern) => {
    const match = ua.match(pattern);
    return match ? match[1].replace(/_/g, '.') : null;
};

const detectDeviceFamily = (ua) => {
    if (/ipad/i.test(ua)) return 'iPad';
    if (/iphone|ipod/i.test(ua)) return 'iPhone';
    if (/android/i.test(ua)) return 'Android';
    if (/windows phone/i.test(ua)) return 'Windows Phone';
    if (/macintosh|mac os x/i.test(ua)) return 'Mac';
    if (/windows/i.test(ua)) return 'Windows';
    if (/linux/i.test(ua)) return 'Linux';
    return 'Unknown';
};

const detectPlatform = (ua) => {
    if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
    if (/android/i.test(ua)) return 'Android';
    if (/windows/i.test(ua)) return 'Windows';
    if (/macintosh|mac os x/i.test(ua)) return 'macOS';
    if (/linux/i.test(ua)) return 'Linux';
    return 'Unknown';
};

const detectBrowser = (ua) => {
    const rules = [
        { name: 'Samsung Internet', pattern: /SamsungBrowser\/([\d.]+)/ },
        { name: 'Edge', pattern: /Edg(?:A|iOS)?\/([\d.]+)/ },
        { name: 'Opera', pattern: /OPR\/([\d.]+)/ },
        { name: 'Firefox', pattern: /Firefox\/([\d.]+)/ },
        { name: 'Chrome', pattern: /Chrome\/([\d.]+)/ },
        { name: 'Safari', pattern: /Version\/([\d.]+).*Safari/ },
    ];

    for (const rule of rules) {
        const version = matchVersion(ua, rule.pattern);
        if (version) {
            if (rule.name === 'Chrome' && /Edg\//.test(ua)) continue;
            return `${rule.name} ${version.split('.')[0]}`;
        }
    }

    return 'Unknown';
};

export const formatSpreadLabel = (spread, t) => {
    const key = spread || 'celtic';
    const title = t(`start.spreads.${key}.title`);
    const cards = t(`start.spreads.${key}.cards`);
    return `${title} (${cards})`;
};

export const collectDeviceInfo = () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return null;
    }

    const ua = navigator.userAgent || '';
    const deviceFamily = detectDeviceFamily(ua);
    const platform = detectPlatform(ua);
    const browser = detectBrowser(ua);
    const screen = `${window.innerWidth}×${window.innerHeight}`;
    const touch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;

    return {
        summary: `${deviceFamily} · ${browser.split(' ')[0]} · ${screen}`,
        platform,
        browser,
        screen,
        touch,
        userAgent: ua,
    };
};

const readSession = () => {
    try {
        const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (!raw) return null;
        const session = JSON.parse(raw);
        return session?.id ? session : null;
    } catch {
        return null;
    }
};

const writeSession = (session) => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
};

export const beginReadingSession = ({ spread, language, spreadLabel }) => {
    const session = {
        id: crypto.randomUUID(),
        startedAt: new Date().toISOString(),
        situation: '',
        spread,
        language,
        spreadLabel,
        logged: false,
    };
    writeSession(session);
    return session;
};

export const getReadingSession = () => readSession();

export const updateReadingSessionSituation = (situation) => {
    const session = readSession();
    if (!session) return;
    session.situation = situation || '';
    writeSession(session);
};

export const clearReadingSession = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
};

const markSessionLogged = () => {
    const session = readSession();
    if (!session) return;
    session.logged = true;
    writeSession(session);
};

export const postSessionLog = async ({
    completed,
    situation,
    spreadLabel,
    language,
} = {}, { beacon = false } = {}) => {
    const session = readSession();
    if (!session || session.logged) return;

    const payload = {
        sessionId: session.id,
        situation: situation ?? session.situation ?? '',
        completed: Boolean(completed),
        startedAt: session.startedAt,
        endedAt: new Date().toISOString(),
        spread: session.spread,
        spreadLabel: spreadLabel ?? session.spreadLabel ?? session.spread,
        language: language ?? session.language ?? 'ko',
        device: collectDeviceInfo(),
    };

    markSessionLogged();

    const body = JSON.stringify(payload);
    const url = `${API_URL}/api/log-session`;

    if (beacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
        return;
    }

    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            keepalive: true,
        });
    } catch {
        // Logging should never block the reading flow.
    }
};
