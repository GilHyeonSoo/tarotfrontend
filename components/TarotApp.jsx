'use client';

import { useState, useEffect } from 'react';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import MobileShell from '@/components/MobileShell';
import StartScreen from '@/components/StartScreen';
import SituationInput from '@/components/SituationInput';
import ShuffleScreen from '@/components/ShuffleScreen';
import SelectCards from '@/components/SelectCards';
import ReadingResult from '@/components/ReadingResult';
import PwaInstallBanner from '@/components/PwaInstallBanner';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import { SPREAD_TYPES } from '@/lib/spreads';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// 화면 상태
const SCREENS = {
    START: 'start',
    SITUATION: 'situation',
    SHUFFLE: 'shuffle',
    SELECT: 'select',
    RESULT: 'result'
};

function TarotAppContent() {
    const { t, language } = useLanguage();
    const [currentScreen, setCurrentScreen] = useState(SCREENS.START);
    const [cards, setCards] = useState([]);
    const [selectedCards, setSelectedCards] = useState([]);
    const [selectedSpread, setSelectedSpread] = useState(SPREAD_TYPES.CELTIC);
    const [userSituation, setUserSituation] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [fadeClass, setFadeClass] = useState('fade-in');

    // 카드 데이터 가져오기
    useEffect(() => {
        fetchCards();
    }, []);

    const fetchCards = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/cards`);
            const data = await response.json();

            if (data.success) {
                setCards(data.cards);
            } else {
                setError('Failed to load card data.');
            }
        } catch (err) {
            // 서버가 실행되지 않은 경우 기본 카드 생성
            console.log('서버 연결 실패, 기본 카드 사용');
            const defaultCards = generateDefaultCards();
            setCards(defaultCards);
        } finally {
            setLoading(false);
        }
    };

    // 기본 카드 생성 (서버 없이도 동작) - 이미지 경로 포함
    const generateDefaultCards = () => {
        // 메이저 아르카나 이미지 파일명 매핑
        const majorArcanaFiles = [
            "0. 바보 카드.jpg", "1. 마법사 카드.jpg", "2. 여사제 카드.jpg",
            "3. 여황제 카드.jpg", "4. 황제 카드.jpg", "5. 교황 카드.jpg",
            "6. 연인 카드.jpg", "7. 전차 카드.jpg", "8. 힘 카드.jpg",
            "9. 은둔자 카드.jpg", "10. 운명의 수레바퀴.jpg", "11. 정의 카드.jpg",
            "12. 행맨 카드.jpg", "13. 죽음 카드.jpg", "14. 절제 카드.jpg",
            "15. 악마 카드.jpg", "16. 타워 카드.jpg", "17. 별 카드.jpg",
            "18. 달 카드.jpg", "19. 태양 카드.jpg", "20. 심판 카드.jpg",
            "21. 세계 카드.jpg"
        ];

        const majorArcanaNames = [
            "바보", "마법사", "여사제", "여황제", "황제", "교황", "연인", "전차",
            "힘", "은둔자", "운명의 수레바퀴", "정의", "행맨", "죽음", "절제",
            "악마", "타워", "별", "달", "태양", "심판", "세계"
        ];

        const cards = majorArcanaNames.map((name, index) => ({
            id: index,
            name: `Major ${index}`,
            name_kr: name,
            meaning: `${name} 카드의 의미`,
            image: `/cards/iloveimg-compressed-1/${encodeURIComponent(majorArcanaFiles[index])}`
        }));

        // 마이너 아르카나 설정
        const suitConfig = [
            { name: '완드', folder: 'iloveimg-compressed-2', prefix: '완드' },
            { name: '컵', folder: 'iloveimg-compressed-3', prefix: '컵' },
            { name: '소드', folder: 'iloveimg-compressed-4', prefix: '소드' },
            { name: '펜타클', folder: 'iloveimg-compressed', prefix: '펜타클' }
        ];

        let id = 22;
        const courtNames = ['에이스', '2', '3', '4', '5', '6', '7', '8', '9', '10', '페이지', '나이트', '퀸', '킹'];

        suitConfig.forEach(suit => {
            courtNames.forEach((courtName, i) => {
                let fileName;
                if (courtName === '에이스' || courtName === '페이지' || courtName === '나이트' || courtName === '퀸' || courtName === '킹') {
                    fileName = `${suit.prefix} ${courtName}.jpg`;
                } else {
                    fileName = `${suit.prefix}${courtName}.jpg`;
                }

                cards.push({
                    id: id++,
                    name: `${courtName} of ${suit.name}`,
                    name_kr: `${suit.name} ${courtName}`,
                    suit: suit.name,
                    meaning: `${suit.name} ${courtName} 카드의 의미`,
                    image: `/cards/${suit.folder}/${encodeURIComponent(fileName)}`
                });
            });
        });

        return cards;
    };

    // 화면 전환 애니메이션
    const changeScreen = (newScreen) => {
        setFadeClass('fade-out');
        setTimeout(() => {
            setCurrentScreen(newScreen);
            setFadeClass('fade-in');
        }, 300);
    };

    // 스프레드 선택
    const handleSpreadSelect = (spread) => {
        setSelectedSpread(spread);
        changeScreen(SCREENS.SITUATION);
    };

    // 상황 입력 완료
    const handleSituationSubmit = (situation) => {
        setUserSituation(situation);
        changeScreen(SCREENS.SHUFFLE);
    };

    // 셔플 완료
    const handleShuffleComplete = () => {
        changeScreen(SCREENS.SELECT);
    };

    // 카드 선택 완료
    const handleCardsSelected = (selected) => {
        setSelectedCards(selected);
        changeScreen(SCREENS.RESULT);
    };

    const handleRestart = () => {
        setSelectedCards([]);
        setUserSituation('');
        setSelectedSpread(SPREAD_TYPES.CELTIC);
        changeScreen(SCREENS.START);
    };

    const handleBack = () => {
        const backMap = {
            [SCREENS.SITUATION]: SCREENS.START,
            [SCREENS.SHUFFLE]: SCREENS.SITUATION,
            [SCREENS.SELECT]: SCREENS.SITUATION,
        };
        const previous = backMap[currentScreen];
        if (previous) changeScreen(previous);
    };

    const showBack = [SCREENS.SITUATION, SCREENS.SHUFFLE, SCREENS.SELECT].includes(currentScreen);

    // 로딩 화면
    if (loading && cards.length === 0) {
        return (
            <MobileShell showBack={false} showLanguage={false}>
                <main className="app app--state" role="main">
                    <div className="loading-screen" aria-live="polite">
                        <div className="loading-spinner" aria-label="Loading"></div>
                        <p>Loading...</p>
                    </div>
                </main>
            </MobileShell>
        );
    }

    if (error && cards.length === 0) {
        return (
            <MobileShell showBack={false} showLanguage={false}>
                <main className="app app--state" role="main">
                    <div className="error-screen" role="alert">
                        <p>{error}</p>
                        <button type="button" className="mystical-button" onClick={fetchCards}>
                            Retry
                        </button>
                    </div>
                </main>
            </MobileShell>
        );
    }

    return (
        <MobileShell
            showBack={showBack}
            onBack={handleBack}
            showLanguage={currentScreen === SCREENS.START}
        >
            <main className="app" role="main">
                <ServiceWorkerRegister />
                <div className={`screen-container ${fadeClass}`}>
                {currentScreen === SCREENS.START && (
                    <StartScreen onSelectSpread={handleSpreadSelect} />
                )}
                {currentScreen === SCREENS.SITUATION && (
                    <SituationInput onSubmit={handleSituationSubmit} />
                )}
                {currentScreen === SCREENS.SHUFFLE && (
                    <ShuffleScreen onComplete={handleShuffleComplete} />
                )}
                {currentScreen === SCREENS.SELECT && (
                    <SelectCards
                        cards={cards}
                        spread={selectedSpread}
                        onComplete={handleCardsSelected}
                    />
                )}
                {currentScreen === SCREENS.RESULT && (
                    <ReadingResult
                        selectedCards={selectedCards}
                        spread={selectedSpread}
                        situation={userSituation}
                        onRestart={handleRestart}
                        language={language}
                    />
                )}
            </div>

            {currentScreen !== SCREENS.RESULT && <PwaInstallBanner />}
            </main>
        </MobileShell>
    );
}

export default function TarotApp() {
    return (
        <LanguageProvider>
            <TarotAppContent />
        </LanguageProvider>
    );
}
