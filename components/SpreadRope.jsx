'use client';

import React, { useId, useMemo } from 'react';

const W = 4.5;
const STEP = W * 0.5;
const CHUNK = 18;
const RAIL_OFFSET = 12;
const LIGHT = { x: -0.6, y: -0.8 };

const r2 = (n) => Math.round(n * 100) / 100;

const catmullRom = (pts) => {
    const segs = [];
    for (let i = 0; i < pts.length - 1; i += 1) {
        const p0 = pts[i - 1] || pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2] || p2;
        segs.push([
            p1,
            { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
            { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
            p2,
        ]);
    }
    return segs;
};

const bezier = ([a, b, c, d], t) => {
    const u = 1 - t;
    return {
        x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
        y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
    };
};

// Resamples a spline through `pts` at equal arc length. Each sample carries the
// layer tag of the control point that starts its segment.
const sampleRope = (pts, tags = []) => {
    const dense = [];
    catmullRom(pts).forEach((seg, si) => {
        for (let k = si === 0 ? 0 : 1; k <= 28; k += 1) {
            dense.push({ ...bezier(seg, k / 28), tag: tags[si] || 'front' });
        }
    });

    const out = [];
    let carry = 0;
    for (let i = 1; i < dense.length; i += 1) {
        const a = dense[i - 1];
        const b = dense[i];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        if (!len) continue;
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        let d = carry;
        while (d <= len) {
            const t = d / len;
            out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, a: angle, tag: a.tag });
            d += STEP;
        }
        carry = d - len;
    }
    return out;
};

const splitByLayer = (samples) => {
    const runs = [];
    samples.forEach((s, i) => {
        const last = runs[runs.length - 1];
        if (last && last.tag === s.tag) {
            last.points.push({ ...s, i });
        } else {
            const bridge = last ? [last.points[last.points.length - 1]] : [];
            runs.push({ tag: s.tag, points: [...bridge, { ...s, i }] });
        }
    });
    return runs;
};

const buildGeometry = (buttons) => {
    if (!buttons.length) return null;

    const L = buttons[0].l;
    const R = L - RAIL_OFFSET;
    const ringY = buttons[0].t - 34;

    const pts = [];
    const tags = [];
    const push = (x, y, tag = 'front') => {
        pts.push({ x, y });
        tags.push(tag);
    };

    // Doubled-over end looping across the ring's lower bar, gathered by a whipping collar.
    push(R + 3, ringY + 16);
    push(R + 3, ringY + 8.5);
    push(R + 1.3, ringY + 3.6);
    push(R - 1.6, ringY + 3.6);
    push(R - 3, ringY + 8.5);
    push(R - 0.6, ringY + 17);
    push(R, buttons[0].t - 16);

    const tails = [];
    const knots = [];

    buttons.forEach((b, index) => {
        const { t: T, h: H } = b;
        const y = (f) => T + H * f;
        const bottom = T + H;

        push(R + 0.3, T - 8);
        push(R + 2, y(0.05));
        push(L + 8, y(0.17));
        push(L + 13, y(0.28));
        push(L + 6, y(0.39));
        push(L - 2.5, y(0.445), 'back');
        push(L + 5, y(0.51), 'back');
        push(L + 14, y(0.58), 'back');
        push(L + 6, y(0.645), 'back');
        push(L - 2.5, y(0.70));
        push(L + 6, y(0.755));
        push(L + 12, y(0.82));

        // Overhand knot: the strand curls back over itself just outside the edge.
        push(L + 4.5, y(0.9));
        push(L - 2.6, y(0.87));
        push(L - 5, bottom - 1);
        push(L - 0.6, bottom + 2.6);
        push(L + 2.6, bottom - 2);
        push(L - 0.6, y(0.9));
        push(L - 4, bottom + 4);

        knots.push({ x: L - 1.3, y: bottom - 1 });

        tails.push([
            { x: L - 0.6, y: bottom - 1.5 },
            { x: L + 2.2, y: bottom + 5 },
            { x: L + 1.6, y: bottom + 13 },
        ]);

        if (index < buttons.length - 1) {
            push(R + 0.6, bottom + 12);
        } else {
            push(L - 5, bottom + 14);
            push(L - 4, bottom + 24);
        }
    });

    const main = sampleRope(pts, tags);
    const tailSamples = tails.map((tp) => sampleRope(tp));

    const collar = { x: R, y: ringY + 12.5 };
    const runs = splitByLayer(main);

    return {
        ring: { x: R, y: ringY, r: 5 },
        collar,
        runs,
        tails: tailSamples,
        ends: [main[main.length - 1], ...tailSamples.map((s) => s[s.length - 1])],
        knots,
        shadows: [...runs.filter((run) => run.tag === 'front').map((run) => run.points), ...tailSamples],
    };
};

const polyline = (points, offset = 0) =>
    points
        .map((p, k) => {
            let { x, y } = p;
            if (offset) {
                const nx = -Math.sin(p.a);
                const ny = Math.cos(p.a);
                const lit = nx * LIGHT.x + ny * LIGHT.y;
                x += nx * lit * offset;
                y += ny * lit * offset;
            }
            return `${k ? 'L' : 'M'}${r2(x)} ${r2(y)}`;
        })
        .join('');

const RopeSegment = ({ points, ids }) => {
    const chunks = [];
    for (let s = 0; s < points.length - 1; s += CHUNK) {
        chunks.push(points.slice(s, s + CHUNK + 1));
    }

    const full = polyline(points);

    return (
        <>
            <path d={full} className="rope-outline" strokeWidth={W + 1} />
            <path d={full} className="rope-core" strokeWidth={W} />
            {chunks.map((chunk, ci) => (
                <RopeChunk key={ci} chunk={chunk} ids={ids} overlay={ci > 0} />
            ))}
        </>
    );
};

// Later chunks repaint their own outline so strands that cross (e.g. inside a knot)
// stay visually separated; flat caps avoid seams at chunk joints.
const RopeChunk = ({ chunk, ids, overlay }) => {
    const d = polyline(chunk);
    return (
        <g className="rope-chunk">
            {overlay && <path d={d} className="rope-outline" strokeWidth={W + 1} />}
            {overlay && <path d={d} className="rope-core" strokeWidth={W} />}
            {chunk.map((p, k) => (
                <ellipse
                    key={k}
                    cx={r2(p.x)}
                    cy={r2(p.y)}
                    rx={W * 0.6}
                    ry={W * 0.25}
                    transform={`rotate(${r2((p.a * 180) / Math.PI + 58)} ${r2(p.x)} ${r2(p.y)})`}
                    fill={`url(#${ids.strand[(p.i ?? k) % 3]})`}
                />
            ))}
            <path d={polyline(chunk, W * 0.28)} className="rope-sheen" />
            <path d={polyline(chunk, -W * 0.34)} className="rope-shade" />
        </g>
    );
};

const FrayedEnd = ({ p }) => {
    const deg = (p.a * 180) / Math.PI;
    return (
        <g transform={`translate(${r2(p.x)} ${r2(p.y)}) rotate(${r2(deg)})`}>
            <rect x={-3} y={-(W + 1) / 2} width={1.6} height={W + 1} rx={0.8} className="rope-whip" />
            {[-24, -8, 8, 24].map((a, k) => {
                const len = 3 + ((k * 5) % 3);
                const rad = (a * Math.PI) / 180;
                return (
                    <path
                        key={a}
                        d={`M0 ${r2((k - 1.5) * 0.8)} q${r2(len * 0.5)} ${r2(Math.sin(rad) * 1.2)} ${r2(Math.cos(rad) * len)} ${r2(Math.sin(rad) * len)}`}
                        className={`rope-fiber rope-fiber--${k % 3}`}
                    />
                );
            })}
        </g>
    );
};

const Defs = ({ ids }) => (
    <defs>
        {[
            ['#cdb282', '#a0804f', '#654828', '#2a1b0d'],
            ['#c2a677', '#957446', '#5c4124', '#26180b'],
            ['#d2b888', '#a6854f', '#6b4d2b', '#2c1d0e'],
        ].map((stops, k) => (
            <radialGradient key={k} id={ids.strand[k]} cx="0.5" cy="0.5" r="0.55" fx="0.4" fy="0.34">
                <stop offset="0%" stopColor={stops[0]} />
                <stop offset="38%" stopColor={stops[1]} />
                <stop offset="78%" stopColor={stops[2]} />
                <stop offset="100%" stopColor={stops[3]} />
            </radialGradient>
        ))}
        <linearGradient id={ids.metal} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#d6c08a" />
            <stop offset="35%" stopColor="#a88a4a" />
            <stop offset="70%" stopColor="#5a4520" />
            <stop offset="100%" stopColor="#8e7440" />
        </linearGradient>
        <radialGradient id={ids.knotGlow} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#000" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <filter id={ids.blur} x="-20%" y="-5%" width="140%" height="110%">
            <feGaussianBlur stdDeviation="1.4" />
        </filter>
    </defs>
);

const SpreadRope = ({ buttons, width, height }) => {
    const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
    const geo = useMemo(() => buildGeometry(buttons), [buttons]);

    if (!geo) return null;

    const layerIds = (layer) => ({
        strand: [0, 1, 2].map((k) => `rope-${uid}-${layer}-s${k}`),
        metal: `rope-${uid}-${layer}-metal`,
        knotGlow: `rope-${uid}-${layer}-kg`,
        blur: `rope-${uid}-${layer}-blur`,
    });
    const back = layerIds('b');
    const front = layerIds('f');
    const { ring, collar } = geo;

    const svgProps = {
        width,
        height,
        viewBox: `0 0 ${r2(width)} ${r2(height)}`,
        'aria-hidden': true,
        focusable: 'false',
    };

    return (
        <>
            <svg {...svgProps} className="spread-rope-layer spread-rope-layer--back">
                <Defs ids={back} />
                {geo.runs
                    .filter((run) => run.tag === 'back')
                    .map((run, k) => (
                        <g key={k} className="rope-back">
                            <RopeSegment points={run.points} ids={back} />
                        </g>
                    ))}
            </svg>

            <svg {...svgProps} className="spread-rope-layer spread-rope-layer--front">
                <Defs ids={front} />

                <path
                    d={geo.shadows.map((pts) => polyline(pts)).join('')}
                    transform="translate(1.5 2.2)"
                    className="rope-drop-shadow"
                    strokeWidth={W}
                    filter={`url(#${front.blur})`}
                />
                {geo.knots.map((k, i) => (
                    <ellipse key={i} cx={k.x + 1.2} cy={k.y + 2.5} rx={7} ry={5.5} fill={`url(#${front.knotGlow})`} />
                ))}

                <circle cx={ring.x + 0.7} cy={ring.y + 1} r={ring.r} className="rope-ring-shadow" />
                <circle
                    cx={ring.x}
                    cy={ring.y}
                    r={ring.r}
                    fill="none"
                    stroke={`url(#${front.metal})`}
                    strokeWidth={2}
                />

                {geo.tails.map((tail, k) => (
                    <RopeSegment key={`t${k}`} points={tail} ids={front} />
                ))}

                {geo.runs
                    .filter((run) => run.tag === 'front')
                    .map((run, k) => (
                        <RopeSegment key={k} points={run.points} ids={front} />
                    ))}

                {geo.ends.map((p, k) => (
                    <FrayedEnd key={k} p={p} />
                ))}

                <g className="rope-collar">
                    {[-1.4, 1.4].map((dy) => (
                        <rect
                            key={dy}
                            x={collar.x - W - 1}
                            y={collar.y + dy - 0.9}
                            width={2 * W + 2}
                            height={1.8}
                            rx={0.9}
                            fill={`url(#${front.metal})`}
                        />
                    ))}
                </g>
            </svg>
        </>
    );
};

export default SpreadRope;
