import LZString from 'lz-string';
import type { Plan } from '../store';
import { VENUES } from '../data/venues';

const round = (n: number) => Math.round(n * 100) / 100;

export function encodePlan(plan: Plan): string {
  const compact = {
    v: 1,
    ...plan,
    zones: plan.zones.map((z) => ({ ...z, y: round(z.y), points: z.points.map((p) => ({ x: round(p.x), z: round(p.z) })) })),
    stages: plan.stages.map((s) => ({ ...s, x: round(s.x), y: round(s.y), z: round(s.z), rot: round(s.rot) })),
    exits: plan.exits.map((e) => ({ ...e, x: round(e.x), y: round(e.y), z: round(e.z) })),
  };
  return LZString.compressToEncodedURIComponent(JSON.stringify(compact));
}

export function decodePlan(code: string): Plan | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(code);
    if (!json) return null;
    const p = JSON.parse(json);
    if (!VENUES.some((v) => v.id === p.venueId)) return null;
    return {
      venueId: p.venueId,
      eventName: p.eventName ?? '',
      eventDate: p.eventDate ?? '',
      plannedStanding: Number(p.plannedStanding) || 0,
      plannedSeated: Number(p.plannedSeated) || 0,
      zones: Array.isArray(p.zones) ? p.zones : [],
      stages: Array.isArray(p.stages) ? p.stages : [],
      exits: Array.isArray(p.exits) ? p.exits : [],
    };
  } catch {
    return null;
  }
}

export function shareUrl(plan: Plan): string {
  const base = `${location.origin}${location.pathname}`;
  return `${base}#p=${encodePlan(plan)}`;
}

export function readPlanFromHash(): Plan | null {
  const m = location.hash.match(/[#&]p=([^&]+)/);
  return m ? decodePlan(m[1]) : null;
}
