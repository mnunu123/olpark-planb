export type VenueId = 'kspodome' | 'handball' | 'woori' | 'jandi88' | 'lakeside';

export interface VenueSpec {
  label: string;
  value: string;
}

export interface Venue {
  id: VenueId;
  name: string;
  shortName: string;
  kind: 'indoor' | 'outdoor';
  /** 웹용으로 압축한 3D 모델 경로 */
  model: string;
  /** 원본 실감형 콘텐츠 파일명 (공공데이터포털 15127487 목록 기준) */
  sourceFile: string;
  /** 올림픽공원 공연·행사 일정의 장소 코드 */
  eventCodes: string[];
  /** 장소 이름으로 일정을 찾을 때 쓰는 단어 (공백 없이 비교) */
  eventKeywords: string[];
  /** 공식 객석 수 */
  seats?: number;
  /** 공식 면적(㎡) */
  area?: number;
  specs: VenueSpec[];
  sourceUrl: string;
  modelNote?: string;
  /** 모델 중심에서 이 거리(m)보다 먼 메시는 숨김 (방위 글자 같은 장식 제거용) */
  hideBeyond?: number;
  /** 지붕 자르기 기본값 (0~1, 1이면 자르지 않음) */
  defaultClip: number;
}

export const VENUES: Venue[] = [
  {
    id: 'kspodome',
    name: 'KSPO DOME (올림픽체조경기장)',
    shortName: 'KSPO DOME',
    kind: 'indoor',
    model: '/models/kspodome.glb',
    sourceFile: 'kspodome_dae.zip',
    eventCodes: ['02'],
    eventKeywords: ['KSPO', '체조경기장'],
    seats: 15000,
    specs: [
      { label: '수용인원', value: '15,000석' },
      { label: '규모', value: '지하 1층, 지상 3층' },
      { label: '건축면적', value: '14,016㎡' },
      { label: '연면적', value: '30,548㎡' },
    ],
    sourceUrl: 'https://www.ksponco.or.kr/menu.es?mid=a10405060100',
    modelNote: '원본은 SketchUp DAE 파일이라 웹용(GLB)으로 변환하고, 바닥에 놓인 방위 글자(N·E·S·W) 4개는 뺐어요.',
    defaultClip: 0.55,
  },
  {
    id: 'handball',
    name: '티켓링크 라이브 아레나 (핸드볼경기장)',
    shortName: '핸드볼경기장',
    kind: 'indoor',
    model: '/models/handball.glb',
    sourceFile: 'skhandball_glb.zip',
    eventCodes: ['03'],
    eventKeywords: ['핸드볼', '티켓링크'],
    seats: 5003,
    specs: [
      { label: '수용인원', value: '5,003석 (이동석 2,100석, 고정석 2,903석)' },
      { label: '보조경기장', value: '250석' },
      { label: '건축면적', value: '9,077.99㎡' },
      { label: '연면적', value: '19,271.67㎡' },
    ],
    sourceUrl: 'https://www.ksponco.or.kr/menu.es?mid=a10405060200',
    defaultClip: 0.6,
  },
  {
    id: 'woori',
    name: '우리금융아트홀 (올림픽역도경기장)',
    shortName: '우리금융아트홀',
    kind: 'indoor',
    model: '/models/woori.glb',
    sourceFile: 'woori_glb.zip',
    eventCodes: ['04'],
    eventKeywords: ['우리금융'],
    seats: 1184,
    specs: [
      { label: '객석', value: '1,184석 (1층 832석·휠체어석 12석 포함, 2층 352석)' },
      { label: '고정무대', value: '폭 15.8m, 깊이 13.3m, 높이 8.7m' },
      { label: '무대 전체 폭', value: '47m' },
    ],
    sourceUrl: 'https://www.ksponco.or.kr/menu.es?mid=a10405060300',
    defaultClip: 0.7,
  },
  {
    id: 'jandi88',
    name: '88잔디마당',
    shortName: '88잔디마당',
    kind: 'outdoor',
    model: '/models/jandi88.glb',
    sourceFile: '88_glb.zip',
    eventCodes: ['06'],
    eventKeywords: ['88잔디', '88마당'],
    area: 33000,
    specs: [
      { label: '면적', value: '약 33,000㎡' },
      { label: '특징', value: '중앙 노천무대, 주변 느티나무숲' },
    ],
    sourceUrl: 'https://www.ksponco.or.kr/menu.es?mid=a10405060900',
    modelNote: '3D 모델은 가로 약 88m, 세로 약 83m 범위라 잔디마당 전체(약 33,000㎡)보다 작아요. 모델 안에서 그린 구역만 계산돼요.',
    defaultClip: 1,
  },
  {
    id: 'lakeside',
    name: '88호수 수변무대',
    shortName: '수변무대',
    kind: 'outdoor',
    model: '/models/lakeside.glb',
    sourceFile: 'lake_glb.zip',
    eventCodes: [],
    eventKeywords: ['수변무대', '88호수'],
    seats: 1000,
    specs: [{ label: '객석', value: '약 1,000석 (계단식 스탠드)' }],
    sourceUrl: 'https://www.ksponco.or.kr/menu.es?mid=a10405060900',
    defaultClip: 1,
  },
];

export function getVenue(id: VenueId): Venue {
  return VENUES.find((v) => v.id === id) ?? VENUES[0];
}
