'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import SpreadRope from './SpreadRope';
import './StartScreen.css';

const SPREAD_OPTIONS = [
    { id: 'one', ropeGap: null },
    { id: 'three', ropeGap: 'short' },
    { id: 'celtic', ropeGap: 'long' },
];

// offsetTop/offsetLeft ignore CSS transforms, so screen transitions don't skew the rope.
const offsetWithin = (el, ancestor) => {
    let x = 0;
    let y = 0;
    let node = el;
    while (node && node !== ancestor) {
        x += node.offsetLeft;
        y += node.offsetTop;
        node = node.offsetParent;
    }
    return { x, y };
};

const useRopeLayout = (navRef) => {
    const [layout, setLayout] = useState(null);

    useLayoutEffect(() => {
        const nav = navRef.current;
        if (!nav) return undefined;

        const measure = () => {
            const buttons = [...nav.querySelectorAll('.spread-button')].map((el) => {
                const { x, y } = offsetWithin(el, nav);
                return { l: x, t: y, w: el.offsetWidth, h: el.offsetHeight };
            });
            setLayout((prev) => {
                const next = { width: nav.offsetWidth, height: nav.offsetHeight, buttons };
                return prev && JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
            });
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(nav);
        nav.querySelectorAll('.spread-button').forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [navRef]);

    return layout;
};

const measureTitleTextWidth = (title) => {
    const range = document.createRange();
    range.selectNodeContents(title);
    const { width } = range.getBoundingClientRect();
    const letterSpacing = parseFloat(getComputedStyle(title).letterSpacing) || 0;
    return Math.ceil(width - letterSpacing);
};

const useTitleTextWidth = (titleRef) => {
    const [width, setWidth] = useState(null);

    useLayoutEffect(() => {
        const title = titleRef.current;
        if (!title) return undefined;

        const measure = () => setWidth(measureTitleTextWidth(title));
        measure();

        const observer = new ResizeObserver(measure);
        observer.observe(title);
        document.fonts?.ready.then(measure);
        return () => observer.disconnect();
    }, [titleRef]);

    return width;
};

const StartScreen = ({ onSelectSpread }) => {
    const { t } = useLanguage();
    const titleRef = useRef(null);
    const navRef = useRef(null);
    const titleTextWidth = useTitleTextWidth(titleRef);
    const ropeLayout = useRopeLayout(navRef);

    return (
        <section className="start-screen mobile-screen" aria-label="Tarot Start">
            <div className="start-screen-body">
                <header className="start-hero floating">
                    <div className="moon-symbol" aria-hidden="true">☽</div>
                    <h1 ref={titleRef} className="main-title">LUMINA TAROT</h1>
                    <p className="subtitle">{t('start.subtitle')}</p>
                </header>

                <nav
                    ref={navRef}
                    className="spread-rope-nav"
                    aria-label="Select spread"
                    style={titleTextWidth ? { width: titleTextWidth } : undefined}
                >
                    {ropeLayout && (
                        <SpreadRope
                            buttons={ropeLayout.buttons}
                            width={ropeLayout.width}
                            height={ropeLayout.height}
                        />
                    )}

                    <ul className="spread-rope-list">
                        {SPREAD_OPTIONS.map(({ id, ropeGap }) => (
                            <li
                                key={id}
                                className={`spread-rope-item${ropeGap ? ` spread-rope-item--gap-${ropeGap}` : ''}`}
                            >
                                <button
                                    type="button"
                                    className="spread-button"
                                    onClick={() => onSelectSpread(id)}
                                    aria-label={`${t(`start.spreads.${id}.title`)} · ${t(`start.spreads.${id}.badge`)} · ${t(`start.spreads.${id}.desc`)}`}
                                >
                                    <span className="spread-button-badge">
                                        {t(`start.spreads.${id}.badge`)}
                                    </span>
                                    <span className="spread-button-content">
                                        <span className="spread-button-title">
                                            {t(`start.spreads.${id}.title`)}
                                        </span>
                                        <span className="spread-button-divider" aria-hidden="true">✦</span>
                                        <span className="spread-button-desc">
                                            {t(`start.spreads.${id}.desc`)}
                                        </span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
        </section>
    );
};

export default StartScreen;
