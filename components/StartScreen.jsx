'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useLanguage } from '../contexts/LanguageContext';
import './StartScreen.css';

const SPREAD_OPTIONS = [
    { id: 'one', image: '/spreads/daily-fortune-traditional.webp' },
    { id: 'three', image: '/spreads/flow-fortune-traditional.webp' },
    { id: 'celtic', image: '/spreads/comprehensive-fortune-traditional.webp' },
];

const centeredOffset = (track, item) =>
    item.offsetLeft - (track.clientWidth - item.offsetWidth) / 2;

export default function StartScreen({ onSelectSpread }) {
    const { t } = useLanguage();
    const [activeIndex, setActiveIndex] = useState(0);
    const trackRef = useRef(null);
    const activeIndexRef = useRef(0);
    const dragRef = useRef(null);
    const suppressClickUntilRef = useRef(0);

    useEffect(() => {
        const track = trackRef.current;
        if (!track) return;
        // Keep the selected card centered after viewport changes.
        const observer = new ResizeObserver(() => {
            const item = track.children[activeIndexRef.current];
            if (item) track.scrollLeft = centeredOffset(track, item);
        });
        observer.observe(track);
        observer.observe(track.children[0]);
        return () => observer.disconnect();
    }, []);

    const selectIndex = (index, { focus = false } = {}) => {
        const track = trackRef.current;
        const nextIndex = Math.max(0, Math.min(SPREAD_OPTIONS.length - 1, index));
        const item = track?.children[nextIndex];
        if (!item) return;
        track.scrollTo({
            left: centeredOffset(track, item),
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        });
        if (focus) item.querySelector('button').focus({ preventScroll: true });
    };

    const handleScroll = () => {
        const track = trackRef.current;
        if (!track) return;
        const center = track.scrollLeft + track.clientWidth / 2;
        let nearest = 0;
        let distance = Infinity;
        [...track.children].forEach((item, index) => {
            const delta = Math.abs(item.offsetLeft + item.offsetWidth / 2 - center);
            if (delta < distance) {
                distance = delta;
                nearest = index;
            }
        });
        activeIndexRef.current = nearest;
        setActiveIndex(nearest);
    };

    const handleKeyDown = (event) => {
        const targets = {
            ArrowLeft: activeIndexRef.current - 1,
            ArrowRight: activeIndexRef.current + 1,
            Home: 0,
            End: SPREAD_OPTIONS.length - 1,
        };
        if (!(event.key in targets)) return;
        event.preventDefault();
        selectIndex(targets[event.key], { focus: true });
    };

    const handlePointerDown = (event) => {
        // Touch and pen use native horizontal scrolling and scroll snapping.
        if (event.pointerType !== 'mouse' || event.button !== 0) return;
        dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            scrollLeft: event.currentTarget.scrollLeft,
            moved: false,
        };
    };

    const handlePointerMove = (event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (!drag.moved && (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy))) return;
        const track = event.currentTarget;
        if (!drag.moved) {
            drag.moved = true;
            track.setPointerCapture(event.pointerId);
            track.dataset.dragging = 'true';
        }
        event.preventDefault();
        track.scrollLeft = drag.scrollLeft - dx;
    };

    const finishDrag = (event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        dragRef.current = null;
        if (!drag.moved) return;
        // Releasing a drag must not accidentally start a reading.
        suppressClickUntilRef.current = event.timeStamp + 350;
        const track = event.currentTarget;
        delete track.dataset.dragging;
        if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
        handleScroll();
        selectIndex(activeIndexRef.current);
    };

    return (
        <section className="start-screen mobile-screen" aria-label="Tarot Start">
            <div className="start-screen-body">
                <header className="start-hero">
                    <div className="moon-symbol" aria-hidden="true">☽</div>
                    <h1 className="main-title">LUMINA TAROT</h1>
                    <p className="subtitle">{t('start.subtitle')}</p>
                </header>

                <nav className="spread-carousel" aria-label={t('start.chooseSpread')}>
                    <ul
                        ref={trackRef}
                        className="spread-carousel-track"
                        onScroll={handleScroll}
                        onKeyDown={handleKeyDown}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={finishDrag}
                        onPointerCancel={finishDrag}
                        onPointerLeave={(event) => {
                            if (!dragRef.current?.moved) dragRef.current = null;
                            else if (!event.currentTarget.hasPointerCapture(event.pointerId)) finishDrag(event);
                        }}
                    >
                        {SPREAD_OPTIONS.map(({ id, image }, index) => (
                            <li key={id} className={`spread-carousel-item${index === activeIndex ? ' is-active' : ''}`}>
                                <button
                                    type="button"
                                    className="spread-image-button"
                                    tabIndex={index === activeIndex ? 0 : -1}
                                    aria-current={index === activeIndex ? 'true' : undefined}
                                    aria-label={`${t(`start.spreads.${id}.title`)} · ${t(`start.spreads.${id}.badge`)} · ${t(`start.spreads.${id}.desc`)} · ${t('start.startReading')}`}
                                    onClick={(event) => {
                                        if (event.detail > 0 && event.timeStamp < suppressClickUntilRef.current) return;
                                        if (index !== activeIndexRef.current) selectIndex(index);
                                        else onSelectSpread(id);
                                    }}
                                >
                                    <Image
                                        src={image}
                                        alt=""
                                        width={954}
                                        height={1649}
                                        className="spread-image"
                                        draggable={false}
                                        priority={index === 0}
                                    />
                                    <span className="spread-image-caption">
                                        <span className="spread-image-title">{t(`start.spreads.${id}.title`)}</span>
                                        <span className="spread-image-meta">
                                            {t(`start.spreads.${id}.cards`)} · {t(`start.spreads.${id}.duration`)}
                                        </span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                    <p className="spread-carousel-description" aria-live="polite" aria-atomic="true">
                        {t(`start.spreads.${SPREAD_OPTIONS[activeIndex].id}.desc`)}
                    </p>
                    <div className="spread-carousel-controls">
                        <div className="spread-carousel-dots">
                            {SPREAD_OPTIONS.map(({ id }, index) => (
                                <button
                                    key={id}
                                    type="button"
                                    className={`spread-carousel-dot${index === activeIndex ? ' is-active' : ''}`}
                                    aria-label={t(`start.spreads.${id}.title`)}
                                    aria-current={index === activeIndex ? 'true' : undefined}
                                    onClick={() => selectIndex(index)}
                                >
                                    <span />
                                </button>
                            ))}
                        </div>
                    </div>
                </nav>
            </div>
        </section>
    );
}
