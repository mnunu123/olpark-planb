import { create } from 'zustand';
import type { VenueId } from './data/venues';
import { getVenue } from './data/venues';
import type { P2 } from './lib/geometry';

export type ZoneKind = 'standing' | 'seated' | 'excluded';
export type StagePreset = 'end' | 'center' | 'thrust';
export type Mode = 'view' | 'draw' | 'exit' | 'place-stage';
export type Tab = 'plan' | 'finder';

export interface Zone {
  id: string;
  name: string;
  kind: ZoneKind;
  y: number;
  points: P2[];
  seats: number;
}

export interface Stage {
  id: string;
  preset: StagePreset;
  x: number;
  y: number;
  z: number;
  rot: number;
  w: number;
  d: number;
  h: number;
  /** 돌출부 폭·길이 (thrust만) */
  rw: number;
  rd: number;
}

export interface Exit {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  width: number;
}

export interface Plan {
  venueId: VenueId;
  eventName: string;
  eventDate: string;
  plannedStanding: number;
  plannedSeated: number;
  zones: Zone[];
  stages: Stage[];
  exits: Exit[];
}

export interface Bounds {
  minY: number;
  maxY: number;
  center: [number, number, number];
  radius: number;
}

export type Selection = { type: 'zone' | 'stage' | 'exit'; id: string } | null;

interface State {
  plan: Plan;
  tab: Tab;
  mode: Mode;
  drawKind: ZoneKind;
  pendingPreset: StagePreset | null;
  draft: P2[];
  draftY: number | null;
  hover: { x: number; y: number; z: number } | null;
  selected: Selection;
  clip: number;
  topView: boolean;
  viewNonce: number;
  transformMode: 'translate' | 'rotate';
  bounds: Bounds | null;
  reportOpen: boolean;
  introOpen: boolean;

  setTab: (t: Tab) => void;
  setVenue: (id: VenueId) => void;
  setPlanField: <K extends 'eventName' | 'eventDate' | 'plannedStanding' | 'plannedSeated'>(k: K, v: Plan[K]) => void;
  loadPlan: (p: Plan) => void;
  resetPlan: () => void;

  startDraw: (kind: ZoneKind) => void;
  addDraftPoint: (p: { x: number; y: number; z: number }) => void;
  undoDraftPoint: () => void;
  finishDraft: () => void;
  cancelMode: () => void;
  setHover: (p: { x: number; y: number; z: number } | null) => void;

  updateZone: (id: string, patch: Partial<Zone>) => void;
  removeZone: (id: string) => void;

  startPlaceStage: (preset: StagePreset) => void;
  placeStage: (p: { x: number; y: number; z: number }) => void;
  updateStage: (id: string, patch: Partial<Stage>) => void;
  removeStage: (id: string) => void;
  setTransformMode: (m: 'translate' | 'rotate') => void;

  startExit: () => void;
  addExit: (p: { x: number; y: number; z: number }) => void;
  updateExit: (id: string, patch: Partial<Exit>) => void;
  removeExit: (id: string) => void;

  select: (s: Selection) => void;
  setClip: (v: number) => void;
  toggleTopView: () => void;
  resetView: () => void;
  setBounds: (b: Bounds) => void;
  setReportOpen: (v: boolean) => void;
  setIntroOpen: (v: boolean) => void;
}

let counter = 0;
const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}`;

export function emptyPlan(venueId: VenueId = 'handball'): Plan {
  return {
    venueId,
    eventName: '',
    eventDate: '',
    plannedStanding: 0,
    plannedSeated: 0,
    zones: [],
    stages: [],
    exits: [],
  };
}

const KIND_LABEL: Record<ZoneKind, string> = {
  standing: '스탠딩',
  seated: '좌석',
  excluded: '제외',
};

const PRESET_DEFAULTS: Record<StagePreset, Pick<Stage, 'w' | 'd' | 'h' | 'rw' | 'rd'>> = {
  // 시작값일 뿐이고 화면에서 바로 고친다
  end: { w: 16, d: 10, h: 1.5, rw: 0, rd: 0 },
  center: { w: 10, d: 10, h: 1.5, rw: 0, rd: 0 },
  thrust: { w: 16, d: 10, h: 1.5, rw: 4, rd: 12 },
};

export const useStore = create<State>((set, get) => ({
  plan: emptyPlan(),
  tab: 'plan',
  mode: 'view',
  drawKind: 'standing',
  pendingPreset: null,
  draft: [],
  draftY: null,
  hover: null,
  selected: null,
  clip: getVenue('handball').defaultClip,
  topView: false,
  viewNonce: 0,
  transformMode: 'translate',
  bounds: null,
  reportOpen: false,
  introOpen: true,

  setTab: (t) => set({ tab: t }),
  setVenue: (id) =>
    set((s) => ({
      plan: { ...s.plan, venueId: id, zones: [], stages: [], exits: [] },
      clip: getVenue(id).defaultClip,
      mode: 'view',
      draft: [],
      draftY: null,
      selected: null,
      bounds: null,
      topView: false,
    })),
  setPlanField: (k, v) => set((s) => ({ plan: { ...s.plan, [k]: v } })),
  loadPlan: (p) =>
    set((s) => ({
      plan: structuredClone(p),
      clip: getVenue(p.venueId).defaultClip,
      mode: 'view',
      draft: [],
      draftY: null,
      selected: null,
      tab: 'plan',
      topView: false,
      // 같은 공연장이면 모델이 다시 안 불려서 bounds를 유지해야 카메라가 돌아온다
      bounds: s.plan.venueId === p.venueId ? s.bounds : null,
      viewNonce: s.viewNonce + 1,
    })),
  resetPlan: () =>
    set((s) => ({ plan: { ...s.plan, zones: [], stages: [], exits: [] }, selected: null, draft: [], mode: 'view' })),

  startDraw: (kind) => set({ mode: 'draw', drawKind: kind, draft: [], draftY: null, selected: null }),
  addDraftPoint: (p) =>
    set((s) => {
      if (s.mode !== 'draw') return {};
      const y = s.draftY ?? p.y;
      // 첫 점 근처를 다시 누르면 닫기
      if (s.draft.length >= 3) {
        const f = s.draft[0];
        if (Math.hypot(f.x - p.x, f.z - p.z) < Math.max(0.8, (s.bounds?.radius ?? 60) * 0.012)) {
          setTimeout(() => get().finishDraft(), 0);
          return {};
        }
      }
      return { draft: [...s.draft, { x: p.x, z: p.z }], draftY: y };
    }),
  undoDraftPoint: () => set((s) => ({ draft: s.draft.slice(0, -1), draftY: s.draft.length > 1 ? s.draftY : null })),
  finishDraft: () =>
    set((s) => {
      if (s.draft.length < 3) return { mode: 'view', draft: [], draftY: null };
      const sameKind = s.plan.zones.filter((z) => z.kind === s.drawKind).length;
      const zone: Zone = {
        id: uid('z'),
        name: `${KIND_LABEL[s.drawKind]} ${String.fromCharCode(65 + sameKind)}`,
        kind: s.drawKind,
        y: s.draftY ?? 0,
        points: s.draft,
        seats: 0,
      };
      return {
        plan: { ...s.plan, zones: [...s.plan.zones, zone] },
        mode: 'view',
        draft: [],
        draftY: null,
        selected: { type: 'zone', id: zone.id },
      };
    }),
  cancelMode: () => set({ mode: 'view', draft: [], draftY: null, pendingPreset: null }),
  setHover: (p) => set({ hover: p }),

  updateZone: (id, patch) =>
    set((s) => ({ plan: { ...s.plan, zones: s.plan.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) } })),
  removeZone: (id) =>
    set((s) => ({
      plan: { ...s.plan, zones: s.plan.zones.filter((z) => z.id !== id) },
      selected: s.selected?.id === id ? null : s.selected,
    })),

  startPlaceStage: (preset) => set({ mode: 'place-stage', pendingPreset: preset, selected: null, draft: [] }),
  placeStage: (p) =>
    set((s) => {
      if (!s.pendingPreset) return {};
      const st: Stage = {
        id: uid('s'),
        preset: s.pendingPreset,
        x: p.x,
        y: p.y,
        z: p.z,
        rot: 0,
        ...PRESET_DEFAULTS[s.pendingPreset],
      };
      return {
        plan: { ...s.plan, stages: [...s.plan.stages, st] },
        mode: 'view',
        pendingPreset: null,
        selected: { type: 'stage', id: st.id },
        transformMode: 'translate',
      };
    }),
  updateStage: (id, patch) =>
    set((s) => ({ plan: { ...s.plan, stages: s.plan.stages.map((st) => (st.id === id ? { ...st, ...patch } : st)) } })),
  removeStage: (id) =>
    set((s) => ({
      plan: { ...s.plan, stages: s.plan.stages.filter((st) => st.id !== id) },
      selected: s.selected?.id === id ? null : s.selected,
    })),
  setTransformMode: (m) => set({ transformMode: m }),

  startExit: () => set({ mode: 'exit', selected: null, draft: [] }),
  addExit: (p) =>
    set((s) => {
      const ex: Exit = {
        id: uid('e'),
        name: `출구 ${s.plan.exits.length + 1}`,
        x: p.x,
        y: p.y,
        z: p.z,
        width: 1.5,
      };
      return { plan: { ...s.plan, exits: [...s.plan.exits, ex] }, selected: { type: 'exit', id: ex.id } };
    }),
  updateExit: (id, patch) =>
    set((s) => ({ plan: { ...s.plan, exits: s.plan.exits.map((e) => (e.id === id ? { ...e, ...patch } : e)) } })),
  removeExit: (id) =>
    set((s) => ({
      plan: { ...s.plan, exits: s.plan.exits.filter((e) => e.id !== id) },
      selected: s.selected?.id === id ? null : s.selected,
    })),

  select: (sel) => set({ selected: sel }),
  setClip: (v) => set({ clip: v }),
  toggleTopView: () => set((s) => ({ topView: !s.topView, viewNonce: s.viewNonce + 1 })),
  resetView: () => set((s) => ({ topView: false, viewNonce: s.viewNonce + 1 })),
  setBounds: (b) => set({ bounds: b }),
  setReportOpen: (v) => set({ reportOpen: v }),
  setIntroOpen: (v) => set({ introOpen: v }),
}));
