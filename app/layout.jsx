import './globals.css';
import './App.css';

export const metadata = {
    title: '루미나 타로 - Lumina Tarot',
    description: 'AI 기반 타로 카드 해석 서비스. 78장의 타로 카드로 운명의 메시지를 확인하세요.',
    keywords: '타로, 타로카드, 운세, AI, 점술, 연애운, 취업운, 사업운, 금전운, 학업운',
    manifest: '/manifest.json',
    openGraph: {
        title: '루미나 타로 - Lumina Tarot',
        description: 'AI 기반 타로 카드 해석 서비스. 78장의 타로 카드로 운명의 메시지를 확인하세요.',
        type: 'website',
        locale: 'ko_KR',
        siteName: '루미나 타로',
        images: [{ url: '/OGImage.png', width: 1200, height: 630 }],
    },
    twitter: {
        card: 'summary_large_image',
        title: '루미나 타로 - Lumina Tarot',
        description: 'AI 기반 타로 카드 해석 서비스',
        images: ['/OGImage.png'],
    },
    icons: {
        icon: [
            { url: '/favicon/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
            { url: '/favicon/favicon.svg', type: 'image/svg+xml' },
        ],
        apple: '/favicon/apple-touch-icon.png',
    },
};

export default function RootLayout({ children }) {
    return (
        <html lang="ko">
            <head>
                <meta name="theme-color" content="#0a0a14" />
            </head>
            <body>
                {children}
            </body>
        </html>
    );
}

