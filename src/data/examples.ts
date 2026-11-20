import type { Plan } from '../store';

/**
 * 처음 보는 사람이 바로 결과를 볼 수 있게 미리 만들어 둔 배치.
 * 좌표는 각 공연장 3D 모델의 실제 좌표(m)다.
 */
export const EXAMPLES: { id: string; title: string; desc: string; plan: Plan }[] = [
  {
    id: 'kspodome-floor',
    title: 'KSPO DOME 플로어 스탠딩',
    desc: '엔드 무대를 놓고 플로어 전체를 스탠딩으로 쓰는 경우',
    plan: {
      venueId: 'kspodome',
      eventName: '예시: 스탠딩 공연을 KSPO DOME 플로어로 옮기는 경우',
      eventDate: '2026-12-25',
      plannedStanding: 3500,
      plannedSeated: 0,
      stages: [{ id: 'ex-s1', preset: 'end', x: 105.44, y: 0.2, z: -95.96, rot: 0, w: 16, d: 10, h: 1.5, rw: 0, rd: 0 }],
      zones: [
        {
          id: 'ex-z1',
          name: '스탠딩 A',
          kind: 'standing',
          y: 0,
          seats: 0,
          points: [
            { x: 81.8, z: -86.5 },
            { x: 129.0, z: -86.5 },
            { x: 134.6, z: -69.4 },
            { x: 126.3, z: -51.7 },
            { x: 84.6, z: -51.7 },
            { x: 76.3, z: -69.4 },
          ],
        },
      ],
      exits: [],
    },
  },
  {
    id: 'jandi88-lawn',
    title: '88잔디마당 노천무대 앞 잔디',
    desc: '중앙 노천무대에 무대를 놓고 북쪽 잔디를 스탠딩으로 쓰는 경우',
    plan: {
      venueId: 'jandi88',
      eventName: '예시: 실내 공연을 88잔디마당 노천무대로 옮기는 경우',
      eventDate: '2026-12-25',
      plannedStanding: 2400,
      plannedSeated: 0,
      stages: [{ id: 'ex-s2', preset: 'end', x: -0.06, y: -1.77, z: -2.89, rot: Math.PI, w: 16, d: 10, h: 1.5, rw: 0, rd: 0 }],
      zones: [
        {
          id: 'ex-z2',
          name: '스탠딩 A',
          kind: 'standing',
          // 잔디가 무대 쪽으로 완만하게 낮아지는 그릇 모양이라, 구역 안에서 가장 높은 지면(약 -2.0m)에 맞춰 띄운다
          y: -2.0,
          seats: 0,
          points: [
            { x: -27, z: -17 },
            { x: -22, z: -27 },
            { x: -11, z: -33.5 },
            { x: 0, z: -35.5 },
            { x: 11, z: -33.5 },
            { x: 22, z: -27 },
            { x: 27, z: -17 },
            { x: 15, z: -16 },
            { x: 0, z: -15 },
            { x: -15, z: -16 },
          ],
        },
      ],
      exits: [],
    },
  },
];
