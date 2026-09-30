'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

import ko from '../locales/ko.json';
import en from '../locales/en.json';
import zh from '../locales/zh.json';
import ja from '../locales/ja.json';

const translations = { ko, en, zh, ja };

const LanguageContext = createContext();

export const LANGUAGES = [
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' }
];

export const LanguageProvider = ({ children }) => {
    const [language, setLanguageState] = useState('ko');
    const [isInitialized, setIsInitialized] = useState(false);

    // 기본 언어는 한국어. 사용자가 직접 고른 값만 localStorage에서 복원.
    useEffect(() => {
        const saved = localStorage.getItem('lumina-language');
        if (saved && translations[saved]) {
            setLanguageState(saved);
            document.documentElement.lang = saved === 'zh' ? 'zh-CN' : saved;
        } else {
            setLanguageState('ko');
            document.documentElement.lang = 'ko';
        }
        setIsInitialized(true);
    }, []);

    const setLanguage = useCallback((lang) => {
        if (translations[lang]) {
            setLanguageState(lang);
            localStorage.setItem('lumina-language', lang);
            document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
        }
    }, []);

    // 번역 함수 — dot notation 지원 (예: 'start.subtitle')
    const t = useCallback((key, replacements = {}) => {
        const keys = key.split('.');
        let value = translations[language];

        for (const k of keys) {
            if (value === undefined || value === null) return key;
            value = value[k];
        }

        if (value === undefined || value === null) return key;

        // 배열이면 그대로 반환
        if (Array.isArray(value)) return value;

        // 문자열이면 {placeholder} 치환
        if (typeof value === 'string') {
            return Object.entries(replacements).reduce(
                (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), v),
                value
            );
        }

        return value;
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, isInitialized }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

export default LanguageContext;
