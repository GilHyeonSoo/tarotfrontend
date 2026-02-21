import { Cinzel, Cormorant_Garamond } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import './App.css';

const cinzel = Cinzel({
    subsets: ['latin'],
    weight: ['400', '600', '700'],
    variable: '--font-heading',
    display: 'swap',
});

const cormorantGaramond = Cormorant_Garamond({
    subsets: ['latin'],
    weight: ['400', '500', '600'],
    style: ['normal', 'italic'],
    variable: '--font-body',
    display: 'swap',
});

export const metadata = {
    metadataBase: new URL('https://tarotlumina.pe.kr'),
    title: '루미나 타로 - AI 타로 카드 운세 | Lumina Tarot',
    description: 'AI 기반 무료 타로 카드 해석 서비스. 78장의 타로 카드로 연애운, 취업운, 사업운, 금전운, 학업운을 확인하세요. 켈틱 크로스 스프레드로 정확한 운세 풀이.',
    keywords: '타로, 타로카드, 무료 타로, 온라인 타로, AI 타로, 운세, 점술, 연애운, 취업운, 사업운, 금전운, 학업운, 타로 해석, 오늘의 운세, 켈틱 크로스',
    manifest: '/manifest.json',
    alternates: {
        canonical: '/',
    },
    openGraph: {
        title: '루미나 타로 - AI 타로 카드 운세 | Lumina Tarot',
        description: 'AI 기반 무료 타로 카드 해석 서비스. 78장의 타로 카드로 운명의 메시지를 확인하세요.',
        type: 'website',
        locale: 'ko_KR',
        siteName: '루미나 타로',
        url: 'https://tarotlumina.pe.kr',
        images: [{ url: '/OGImage.png', width: 1200, height: 630, alt: '루미나 타로 - AI 타로 카드 운세 서비스' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: '루미나 타로 - AI 타로 카드 운세 | Lumina Tarot',
        description: 'AI 기반 무료 타로 카드 해석 서비스. 78장의 타로 카드로 운명의 메시지를 확인하세요.',
        images: ['/OGImage.png'],
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
        naver: 'naver0a0a725a51273e354171f0e92c8bf67d',
    },
};

const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '루미나 타로 - Lumina Tarot',
    description: 'AI 기반 무료 타로 카드 해석 서비스. 78장의 타로 카드로 연애운, 취업운, 사업운, 금전운, 학업운을 확인하세요.',
    url: 'https://tarotlumina.pe.kr',
    applicationCategory: 'EntertainmentApplication',
    operatingSystem: 'Web',
    inLanguage: 'ko',
    offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'KRW',
    },
};

export default function RootLayout({ children }) {
    return (
        <html lang="ko" className={`${cinzel.variable} ${cormorantGaramond.variable}`}>
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


