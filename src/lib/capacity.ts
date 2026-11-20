import type { Plan, Stage, Zone } from '../store';
import { getVenue } from '../data/venues';
import { netArea, polygonArea, rectCorners, type P2 } from './geometry';
import {
  EXIT_MIN_COUNT,
  EXIT_MIN_WIDTH,
  EXIT_RULE_MIN_AREA,
  EXIT_WIDTH_PER_100M2,
  FIRE_M2_PER_PERSON,
  MOIS_CAUTION_MAX,
  MOIS_CAUTION_MIN,
  MOIS_DANGER_MIN,
  MOIS_M2_PER_PERSON,
  MOIS_RELAXED_MAX,
  PERF_PLAN_THRESHOLD,
} from '../data/standards';

export function stageFootprints(st: Stage): P2[][] {
  const main = rectCorners(st.x, st.z, st.w, st.d, st.rot);
  if (st.preset === 'thrust' && st.rw > 0 && st.rd > 0) {
    const runway = rectCorners(st.x, st.z, st.rw, st.rd, st.rot, st.d / 2 + st.rd / 2);
    return [main, runway];
  }
  return [main];
}

export function stageArea(st: Stage): number {
  return st.w * st.d + (st.preset === 'thrust' ? st.rw * st.rd : 0);
}

export interface ZoneCalc {
  zone: Zone;
  area: number;
  net: number;
}

export type Band = 'relaxed' | 'caution' | 'danger';

export interface PlanCalc {
  zones: ZoneCalc[];
  standingArea: number;
  standingNet: number;
  seatTotal: number;
  recommended: number;
  relaxedMax: number;
  cautionMin: number;
  cautionMax: number;
  dangerFrom: number;
  fireCode: number;
  density: number | null;
  band: Band | null;
  overRecommended: number;
  exit: ExitCheck | null;
  perfNotice: boolean;
  plannedTotal: number;
}

export interface ExitCheck {
  applies: boolean;
  floorArea: number;
  count: number;
  minWidth: number;
  sumWidth: number;
  requiredSum: number;
  countOk: boolean;
  widthOk: boolean;
  sumOk: boolean;
}

export function bandOf(density: number): Band {
  // 가이드라인 단계 사이 값(2 초과 3 미만, 4 초과 5 미만)은 더 높은 단계로 본다
  if (density <= MOIS_RELAXED_MAX) return 'relaxed';
  if (density < MOIS_DANGER_MIN) return 'caution';
  return 'danger';
}

export const BAND_LABEL: Record<Band, string> = {
  relaxed: '여유',
  caution: '주의',
  danger: '위험',
};

export function calcPlan(plan: Plan): PlanCalc {
  const venue = getVenue(plan.venueId);
  const cutStage = plan.stages.flatMap(stageFootprints);
  const cutExcluded = plan.zones.filter((z) => z.kind === 'excluded').map((z) => z.points);

  const zones: ZoneCalc[] = plan.zones.map((z) => {
    const area = polygonArea(z.points);
    const net = z.kind === 'excluded' ? area : netArea(z.points, [...cutStage, ...cutExcluded]);
    return { zone: z, area, net };
  });

  const standing = zones.filter((c) => c.zone.kind === 'standing');
  const standingArea = standing.reduce((a, c) => a + c.area, 0);
  const standingNet = standing.reduce((a, c) => a + c.net, 0);
  const seatTotal = zones.filter((c) => c.zone.kind === 'seated').reduce((a, c) => a + (c.zone.seats || 0), 0);

  const recommended = Math.floor(standingNet / MOIS_M2_PER_PERSON);
  const relaxedMax = Math.floor(standingNet * MOIS_RELAXED_MAX);
  const cautionMin = Math.floor(standingNet * MOIS_CAUTION_MIN);
  const cautionMax = Math.floor(standingNet * MOIS_CAUTION_MAX);
  const dangerFrom = Math.ceil(standingNet * MOIS_DANGER_MIN);
  const fireCode = Math.floor(standingNet / FIRE_M2_PER_PERSON);

  const density = standingNet > 0 && plan.plannedStanding > 0 ? plan.plannedStanding / standingNet : null;
  const band = density === null ? null : bandOf(density);
  const overRecommended = Math.max(0, plan.plannedStanding - recommended);

  // 출구: 실내이고, 관객 구역(스탠딩+좌석) 면적이 기준 이상일 때 비교
  const audienceFloor = zones.filter((c) => c.zone.kind !== 'excluded').reduce((a, c) => a + c.net, 0);
  let exit: ExitCheck | null = null;
  if (venue.kind === 'indoor' && audienceFloor > 0) {
    const widths = plan.exits.map((e) => e.width);
    const sumWidth = widths.reduce((a, b) => a + b, 0);
    const requiredSum = (audienceFloor / 100) * EXIT_WIDTH_PER_100M2;
    exit = {
      applies: audienceFloor >= EXIT_RULE_MIN_AREA,
      floorArea: audienceFloor,
      count: widths.length,
      minWidth: widths.length ? Math.min(...widths) : 0,
      sumWidth,
      requiredSum,
      countOk: widths.length >= EXIT_MIN_COUNT,
      widthOk: widths.length > 0 && widths.every((w) => w >= EXIT_MIN_WIDTH),
      sumOk: sumWidth >= requiredSum,
    };
  }

  const plannedTotal = (plan.plannedStanding || 0) + (plan.plannedSeated || 0);
  const perfNotice = venue.kind === 'outdoor' && plannedTotal >= PERF_PLAN_THRESHOLD;

  return {
    zones,
    standingArea,
    standingNet,
    seatTotal,
    recommended,
    relaxedMax,
    cautionMin,
    cautionMax,
    dangerFrom,
    fireCode,
    density,
    band,
    overRecommended,
    exit,
    perfNotice,
    plannedTotal,
  };
}

export const fmt = (n: number, digits = 0) =>
  n.toLocaleString('ko-KR', { maximumFractionDigits: digits, minimumFractionDigits: digits });
