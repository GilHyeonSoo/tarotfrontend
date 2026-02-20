'use client';

import { useState, useEffect } from 'react';
import Stars from '@/components/Stars';
import StartScreen from '@/components/StartScreen';
import CategorySelect from '@/components/CategorySelect';
import SituationInput from '@/components/SituationInput';
import ShuffleScreen from '@/components/ShuffleScreen';
import SelectCards from '@/components/SelectCards';
import ReadingResult from '@/components/ReadingResult';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// 화면 상태
const SCREENS = {
    START: 'start',
    CATEGORY: 'category',
    SITUATION: 'situation',
    SHUFFLE: 'shuffle',
    SELECT: 'select',
    RESULT: 'result'
};

export default function Home() {
    const [currentScreen, setCurrentScreen] = useState(SCREENS.START);
    const [cards, setCards] = useState([]);
    const [selectedCards, setSelectedCards] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
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
                setError('카드 데이터를 불러오는데 실패했습니다.');
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

    // 시작 버튼 클릭
    const handleStart = () => {
        changeScreen(SCREENS.CATEGORY);
    };

    // 카테고리 선택
    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
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

    // 재시작 (분야 선택 페이지로)
    const handleRestart = () => {
        setSelectedCards([]);
        setSelectedCategory(null);
        setUserSituation('');
        changeScreen(SCREENS.CATEGORY);
    };

    // 로딩 화면
    if (loading && cards.length === 0) {
        return (
            <div className="app">
                <Stars />
                <div className="loading-screen">
                    <div className="loading-spinner"></div>
                    <p>카드를 준비하는 중...</p>
                </div>
            </div>
        );
    }

    // 에러 화면
    if (error && cards.length === 0) {
        return (
            <div className="app">
                <Stars />
                <div className="error-screen">
                    <p>{error}</p>
                    <button className="mystical-button" onClick={fetchCards}>
                        다시 시도
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="app">
            <Stars />
            <div className={`screen-container ${fadeClass}`}>
                {currentScreen === SCREENS.START && (
                    <StartScreen onStart={handleStart} />
                )}
                {currentScreen === SCREENS.CATEGORY && (
                    <CategorySelect onSelect={handleCategorySelect} />
                )}
                {currentScreen === SCREENS.SITUATION && (
                    <SituationInput
                        category={selectedCategory}
                        onSubmit={handleSituationSubmit}
                    />
                )}
                {currentScreen === SCREENS.SHUFFLE && (
                    <ShuffleScreen onComplete={handleShuffleComplete} />
                )}
                {currentScreen === SCREENS.SELECT && (
                    <SelectCards cards={cards} onComplete={handleCardsSelected} />
                )}
                {currentScreen === SCREENS.RESULT && (
                    <ReadingResult
                        selectedCards={selectedCards}
                        category={selectedCategory}
                        situation={userSituation}
                        onRestart={handleRestart}
                    />
                )}
            </div>
        </div>
    );
}
