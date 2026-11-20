/**
 * 수용 인원 계산에 쓰는 기준 숫자. 모든 숫자는 아래 출처에서 그대로 가져왔다.
 * 숫자를 바꾸거나 추가할 때는 반드시 출처를 같이 적는다.
 */

export interface StandardSource {
  id: string;
  title: string;
  detail: string;
  url?: string;
}

export const SOURCES: Record<'mois' | 'fire' | 'exit' | 'perf', StandardSource> = {
  mois: {
    id: 'mois',
    title: '행정안전부 「다중운집인파사고 안전관리 가이드라인」 (2024.9)',
    detail:
      'p.2: 서서 보는 관람은 1인당 0.46㎡ 할당 권장(미국 NFPA 101 인용). p.16 대응체계: 1단계 여유 1㎡당 2명 이하, 2단계 주의 1㎡당 3~4명, 3단계 위험 1㎡당 5명 이상. p.7: 공연장 외 공연시설의 실내 적정 수용인원 산정 기준이 없다고 지적.',
  },
  fire: {
    id: 'fire',
    title: '「소방시설 설치 및 관리에 관한 법률 시행령」 별표 7 수용인원의 산정 방법',
    detail:
      '강당, 문화 및 집회시설, 운동시설, 종교시설: 해당 용도 바닥면적 합계를 4.6㎡로 나눈 수. 관람석의 고정식 의자는 의자 수, 긴 의자는 정면너비를 0.45m로 나눈 수.',
    url: 'https://www.law.go.kr/법령/소방시설설치및관리에관한법률시행령',
  },
  exit: {
    id: 'exit',
    title: '「건축물의 피난·방화구조 등의 기준에 관한 규칙」 제10조제2항',
    detail:
      '공연장의 개별 관람실(바닥면적 300㎡ 이상) 출구: 관람실별 2개소 이상, 각 출구 유효너비 1.5m 이상, 출구 유효너비 합계는 바닥면적 100㎡마다 0.6m 비율 이상.',
    url: 'https://www.law.go.kr/법령/건축물의피난ㆍ방화구조등의기준에관한규칙',
  },
  perf: {
    id: 'perf',
    title: '「공연법」 재해대처계획 (공연장 외 공연 안전관리 체크리스트, 공연안전지원센터)',
    detail: '공연장 외의 장소에서 1천 명 이상 관람이 예상되면 공연 개시 14일 전까지 재해대처계획을 신고(변경 신고는 7일 전까지).',
    url: 'https://www.stagesafety.or.kr',
  },
};

/** 행안부 가이드라인: 서서 보는 관람 1인당 권장 면적(㎡) */
export const MOIS_M2_PER_PERSON = 0.46;
/** 행안부 가이드라인: 1단계 여유 상한 (명/㎡) */
export const MOIS_RELAXED_MAX = 2;
/** 행안부 가이드라인: 2단계 주의 (명/㎡) */
export const MOIS_CAUTION_MIN = 3;
export const MOIS_CAUTION_MAX = 4;
/** 행안부 가이드라인: 3단계 위험 하한 (명/㎡) */
export const MOIS_DANGER_MIN = 5;

/** 소방시설법 시행령 별표 7: 문화 및 집회시설 1인당 바닥면적(㎡) */
export const FIRE_M2_PER_PERSON = 4.6;

/** 피난·방화 규칙 제10조제2항 */
export const EXIT_RULE_MIN_AREA = 300;
export const EXIT_MIN_COUNT = 2;
export const EXIT_MIN_WIDTH = 1.5;
export const EXIT_WIDTH_PER_100M2 = 0.6;

/** 공연법: 공연장 외 장소 재해대처계획 신고 기준 인원 */
export const PERF_PLAN_THRESHOLD = 1000;
