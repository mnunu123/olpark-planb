/** 서비스 소개에 쓰는 배경 사실. 문장마다 출처를 붙인다. */
export const CONTEXT_FACTS = [
  {
    text: '2026년 올림픽공원에서는 공연장을 갑자기 쓸 수 없게 되면서 취소되거나 장소를 옮긴 공연이 15건에 이르렀고, 환불된 대관료가 10억 원을 넘었어요.',
    source: 'TV리포트 (2026.9)',
    url: 'https://tvreport.co.kr/star/article/1072592/',
  },
  {
    text: '공연장을 옮긴 페스티벌에서는 새 공연장 수용 규모가 작아 입장 대기줄이 길게 생기기도 했어요.',
    source: '한경 머니 (2026.6)',
    url: 'https://magazine.hankyung.com/money/article/202606221017c',
  },
  {
    text: '감사원 중간 감사(2026.10.21)에서는 2024~2025년 KSPO DOME을 포함한 실내 체육시설 7곳의 공연 33건이 비상대응계획상 수용 인원보다 10% 넘게 티켓을 판 것으로 나왔어요.',
    source: 'Korea JoongAng Daily (2026.10)',
    url: 'https://www.koreajoongangdaily.com/korea/kpop-sports-arenas-face-collapse-risks-as-authorities-fail-to-fix-known-defects-bainbsp/12932467',
  },
];

export const DATASETS = [
  {
    name: '올림픽공원 공연장 실감형 콘텐츠',
    id: '15127487',
    use: '공연장 5곳 3D 모델 (KSPO DOME, 핸드볼경기장, 우리금융아트홀, 88잔디마당, 수변무대)',
    url: 'https://www.data.go.kr/data/15127487/fileData.do',
  },
  {
    name: '올림픽공원 공연정보 / 대관정보',
    id: '3037877 / 15015212',
    use: '날짜별 공연장 일정 (API 연동 전에는 올림픽공원 공식 일정 스냅샷 사용)',
    url: 'https://www.data.go.kr/data/3037877/openapi.do',
  },
  {
    name: '올림픽공원 실시간 주차현황',
    id: '15168686',
    use: '동2·남2·북2 주차장 현재 주차 대수',
    url: 'https://www.data.go.kr/data/15168686/openapi.do',
  },
];
