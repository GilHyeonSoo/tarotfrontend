import React, { useState, useEffect } from 'react';

// 별자리 데이터 (좌표: % 단위)
const constellations = [
    {
        name: 'orion',
        stars: [
            { x: 15, y: 20 },
            { x: 18, y: 25 },
            { x: 12, y: 30 },
            { x: 15, y: 35 },
            { x: 18, y: 35 },
            { x: 15, y: 45 },
            { x: 10, y: 50 },
            { x: 20, y: 50 },
        ],
        lines: [
            [0, 1], [1, 2], [2, 3], [3, 4], [4, 1],
            [3, 5], [4, 5], [5, 6], [5, 7]
        ]
    },
    {
        name: 'leo',
        stars: [
            { x: 70, y: 12 },  // 머리
            { x: 75, y: 15 },
            { x: 80, y: 12 },
            { x: 78, y: 18 },
            { x: 73, y: 20 },  // 갈기
            { x: 82, y: 22 },  // 몸통
            { x: 88, y: 25 },
            { x: 92, y: 20 },  // 꼬리
        ],
        lines: [
            [0, 1], [1, 2], [2, 3], [3, 4], [4, 0],
            [3, 5], [5, 6], [6, 7]
        ]
    },
    {
        name: 'bigDipper',
        stars: [
            { x: 60, y: 70 },
            { x: 65, y: 72 },
            { x: 70, y: 70 },
            { x: 75, y: 72 },
            { x: 80, y: 75 },
            { x: 85, y: 78 },
            { x: 90, y: 75 },
        ],
        lines: [
            [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]
        ]
    }
];

const Stars = () => {
    // 클라이언트에서만 별 생성 (Hydration mismatch 방지)
    const [stars, setStars] = useState([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // 클라이언트에서만 랜덤 별 생성
        const generatedStars = Array.from({ length: 100 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            top: Math.random() * 100,
            size: Math.random() * 3 + 1,
            duration: Math.random() * 3 + 2,
            delay: Math.random() * 2
        }));
        setStars(generatedStars);
        setMounted(true);
    }, []);

    return (
        <div className="stars-container">
            {/* 기존 랜덤 별들 */}
            {stars.map(star => (
                <div
                    key={star.id}
                    className="star"
                    style={{
                        left: `${star.left}%`,
                        top: `${star.top}%`,
                        width: `${star.size}px`,
                        height: `${star.size}px`,
                        '--duration': `${star.duration}s`,
                        animationDelay: `${star.delay}s`
                    }}
                />
            ))}

            {/* 별자리 */}
            {constellations.map((constellation, cIndex) => (
                <svg
                    key={constellation.name}
                    className="constellation"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none'
                    }}
                >
                    {/* 그라디언트 정의 */}
                    <defs>
                        <linearGradient id={`gradient-${constellation.name}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="rgba(212, 175, 55, 0.6)" />
                            <stop offset="50%" stopColor="rgba(167, 139, 250, 0.5)" />
                            <stop offset="100%" stopColor="rgba(139, 92, 246, 0.6)" />
                        </linearGradient>
                    </defs>
                    {/* 연결선 */}
                    {constellation.lines.map(([from, to], lIndex) => (
                        <line
                            key={`${constellation.name}-line-${lIndex}`}
                            x1={`${constellation.stars[from].x}%`}
                            y1={`${constellation.stars[from].y}%`}
                            x2={`${constellation.stars[to].x}%`}
                            y2={`${constellation.stars[to].y}%`}
                            stroke={`url(#gradient-${constellation.name})`}
                            strokeWidth="2"
                            className="constellation-line"
                        />
                    ))}
                    {/* 별자리 별 */}
                    {constellation.stars.map((star, sIndex) => (
                        <circle
                            key={`${constellation.name}-star-${sIndex}`}
                            cx={`${star.x}%`}
                            cy={`${star.y}%`}
                            r="3"
                            className="constellation-star"
                        />
                    ))}
                </svg>
            ))}
        </div>
    );
};

export default Stars;
