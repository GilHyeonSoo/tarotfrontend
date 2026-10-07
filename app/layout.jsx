import { Cinzel, Cormorant_Garamond, Nanum_Myeongjo } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import './mobile-screen.css';
import './App.css';

const cinzel = Cinzel({
    subsets: ['latin'],
    weight: ['400', '600', '700'],
    variable: '--font-cinzel',
    display: 'swap',
});

const cormorantGaramond = Cormorant_Garamond({
    subsets: ['latin'],
    weight: ['400', '500', '600'],
    style: ['normal', 'italic'],
    variable: '--font-cormorant',
    display: 'swap',
});

const nanumMyeongjo = Nanum_Myeongjo({
    subsets: ['latin'],
    weight: ['400', '700', '800'],
    variable: '--font-nanum',
    display: 'swap',
});

export const viewport = {
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#0f0a1e' },
        { media: '(prefers-color-scheme: dark)', color: '#0f0a1e' }
    ],
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
};

const SITE_TITLE = '루미나 타로 | 무료 AI 타로 카드 운세';
const SITE_DESCRIPTION = '무료 AI 타로 루미나 타로. 고민을 적고 1장·3장·10장의 카드를 선택해보세요. 오늘의 메시지, 세 장의 이야기, 깊이 보는 타로로 나에게 필요한 조언을 만나보세요.';

export const metadata = {
    metadataBase: new URL('https://tarotlumina.pe.kr'),
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    keywords: '타로, 타로카드, 무료 타로, 온라인 타로, AI 타로, 운세, 오늘의 메시지, 세 장의 이야기, 깊이 보는 타로, 오늘의 운세, 흐름 운세, 종합 운세, 켈틱 크로스, 3장 타로, 연애운, 취업운, 사업운, 금전운, 학업운, 원카드, 쓰리카드, 원카드 타로, 쓰리카드 타로, 1장 타로, 10장 타로, 타로점, 무료 운세, 타로 리딩, 타로 해석, 타로 사이트, 타로 뽑기, 오늘의 타로, 타로 운세, AI 운세, 무료 타로점, 온라인 점집, 점술, 사랑운, 재물운, 진로운, 시험운, 메이저 아르카나, 마이너 아르카나, 정방향, 역방향, 루미나 타로, 루미나타로, 루미아타로, 루미아 타로, 타로 맛집, Lumina Tarot, 켈틱크로스, 과거현재미래, 타로 메시지, 카드 운세, 웹 타로, 타로 앱, 타로카드 운세, 무료 타로카드, 연애 타로, 취업 타로, 금전 타로, 학업 타로, 사업 타로, 타로 스프레드, 원 카드 스프레드, 쓰리 카드 스프레드, 켈틱 크로스 스프레드',
    manifest: '/manifest.json',
    alternates: {
        canonical: '/',
        languages: {
            'ko-KR': '/',
            'x-default': '/',
        },
    },
    openGraph: {
        title: SITE_TITLE,
        description: SITE_DESCRIPTION,
        type: 'website',
        locale: 'ko_KR',
        siteName: '루미나 타로',
        url: 'https://tarotlumina.pe.kr',
        images: [{ url: '/OGImage.png', width: 1424, height: 752, alt: '루미나 타로 — 무료 AI 타로 카드 해석 서비스' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: SITE_TITLE,
        description: SITE_DESCRIPTION,
        images: [{ url: '/OGImage.png', alt: '루미나 타로 — 무료 AI 타로 카드 해석 서비스' }],
    },
    appleWebApp: {
        title: '루미나 타로',
        statusBarStyle: 'black-translucent',
        capable: true,
    },
    icons: {
        icon: [
            { url: '/favicon/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
            { url: '/favicon/favicon.svg', type: 'image/svg+xml' },
        ],
        apple: '/favicon/apple-touch-icon.png',
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    verification: {
        other: {
            'naver-site-verification': 'naver0a0a725a51273e354171f0e92c8bf67d',
        },
    },
};

const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '루미나 타로 - Lumina Tarot',
    description: SITE_DESCRIPTION,
    url: 'https://tarotlumina.pe.kr',
    applicationCategory: 'EntertainmentApplication',
    operatingSystem: 'Web',
    inLanguage: ['ko', 'en', 'zh', 'ja'],
    featureList: [
        '오늘의 메시지(원카드 · 1장)',
        '세 장의 이야기(쓰리카드 · 3장)',
        '깊이 보는 타로(켈틱 크로스 · 10장)',
        '입력한 질문과 선택한 카드에 맞춘 AI 해설',
        '정방향/역방향 해석',
    ],
    offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'KRW',
    },
};

export default function RootLayout({ children }) {
    return (
        <html lang="ko" className={`${cinzel.variable} ${cormorantGaramond.variable} ${nanumMyeongjo.variable}`}>
            <head>
                <meta name="theme-color" content="#0a0a14" />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
                <Script
                    src="https://www.googletagmanager.com/gtag/js?id=G-2JKBZSH2ES"
                    strategy="afterInteractive"
                />
                <Script id="google-analytics" strategy="afterInteractive">
                    {`
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', 'G-2JKBZSH2ES');
                    `}
                </Script>
            </head>
            <body>
                {children}
            </body>
        </html>
    );
}


