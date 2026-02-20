import TarotApp from '@/components/TarotApp';

// SEO: 이 파일은 Server Component로, 검색엔진이 크롤링할 수 있는 정적 HTML을 렌더링합니다.
// 인터랙티브 로직은 TarotApp Client Component에서 처리합니다.

export default function Home() {
    return (
        <>
            {/* 검색엔진이 크롤링할 수 있는 SEO 콘텐츠 (시각적으로 숨김) */}
            <div
                style={{
                    position: 'absolute',
                    width: '1px',
                    height: '1px',
                    overflow: 'hidden',
                    clip: 'rect(0, 0, 0, 0)',
                    whiteSpace: 'nowrap',
                }}
                aria-hidden="false"
            >
                <h1>루미나 타로 - AI 타로 카드 운세</h1>
                <p>
                    루미나 타로는 AI 기반 무료 타로 카드 해석 서비스입니다.
                    78장의 타로 카드(메이저 아르카나 22장, 마이너 아르카나 56장)로
                    연애운, 취업운, 사업운, 금전운, 학업운을 확인하세요.
                </p>
                <h2>서비스 특징</h2>
                <ul>
                    <li>78장 정통 타로 카드 (메이저 아르카나 + 마이너 아르카나)</li>
                    <li>켈틱 크로스 스프레드 10장 배치</li>
                    <li>AI 전문가의 실시간 카드 해석</li>
                    <li>연애운, 취업운, 사업운, 금전운, 학업운 5가지 분야</li>
                    <li>정방향/역방향 해석 지원</li>
                    <li>완전 무료 서비스</li>
                </ul>
                <h2>타로 카드 운세 보는 방법</h2>
                <p>
                    1. 궁금한 운세 분야를 선택합니다.
                    2. 현재 상황을 간략히 입력합니다.
                    3. 카드를 셔플한 후 직관에 따라 10장을 선택합니다.
                    4. AI가 켈틱 크로스 스프레드로 카드를 해석합니다.
                </p>
            </div>

            {/* 실제 인터랙티브 앱 */}
            <TarotApp />
        </>
    );
}
