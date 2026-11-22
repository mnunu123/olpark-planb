import type { Venue } from '../data/venues';

export interface ParkEvent {
  id: number;
  title: string;
  begin: string;
  end: string;
  venue: string;
  venueCode: string;
  time: string;
}

export interface EventsMeta {
  /** live: /api/events로 방금 받은 일정, snapshot: public/data/events.json에 받아 둔 일정 */
  mode: 'live' | 'snapshot';
  /** 받은 시각 (ISO) */
  at: string;
  /** 조회한 달 범위 (YYYYMM) */
  from: string;
  to: string;
}

export interface EventsData {
  events: ParkEvent[];
  meta: EventsMeta | null;
}

/**
 * 일정 출처: 올림픽공원 공식 누리집의 공연·행사 일정.
 * 1) /api/events (Vercel 함수, 개발 중에는 Vite 서버)가 누리집에서 실시간으로 받아 온다.
 * 2) 실패하면 public/data/events.json 스냅샷을 쓴다 (npm run data:events로 갱신).
 * 공공데이터포털 '올림픽공원 공연정보·대관정보' API는 최근 일정이 없어 쓰지 않는다 (README 참고).
 */
export const EVENTS_SOURCE = {
  label: '올림픽공원 공연·행사 일정 (한국체육산업개발 누리집)',
  page: 'https://www.ksponco.or.kr/olympicpark/eventInfo/eventInfoList?mid=a20301010100',
  note: '공개된 일정 기준이라 실제 대관 가능 여부는 대관 담당 확인이 필요해요. 취소된 공연이 목록에 남아 있을 수 있어요.',
};

export const eventDetailUrl = (id: number) =>
  `https://www.ksponco.or.kr/olympicpark/eventInfo/eventInfoView.es?mid=a20301010100&evtSeq=${id}`;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const YM = /^\d{6}$/;

function parseEvents(list: unknown): ParkEvent[] {
  if (!Array.isArray(list)) return [];
  return list.filter(
    (e): e is ParkEvent =>
      !!e &&
      typeof e.id === 'number' &&
      typeof e.title === 'string' &&
      typeof e.begin === 'string' &&
      DATE.test(e.begin) &&
      typeof e.end === 'string' &&
      DATE.test(e.end) &&
      typeof e.venue === 'string' &&
      typeof e.venueCode === 'string',
  );
}

async function getJson(url: string, timeoutMs: number): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

function toData(body: any, mode: EventsMeta['mode']): EventsData | null {
  if (!body || typeof body !== 'object' || !Array.isArray(body.events)) return null;
  const at = mode === 'live' ? body.fetchedAt : body.collectedAt;
  if (typeof at !== 'string' || !YM.test(body.from) || !YM.test(body.to)) return null;
  return { events: parseEvents(body.events), meta: { mode, at, from: body.from, to: body.to } };
}

let cache: Promise<EventsData> | null = null;

export function loadEvents(): Promise<EventsData> {
  if (!cache) {
    cache = (async () => {
      try {
        const live = toData(await getJson('/api/events', 10000), 'live');
        if (live) return live;
      } catch {
        // 실시간이 안 되면 스냅샷으로
      }
      try {
        const snap = toData(await getJson('/data/events.json', 10000), 'snapshot');
        if (snap) return snap;
      } catch {
        // 둘 다 안 되면 일정 없이
      }
      return { events: [], meta: null };
    })();
  }
  return cache;
}

/** 'YYYY-MM-DD' 기간이 조회한 달 범위 안에 있는지. 범위 밖이면 일정이 없어도 비어 있다고 말할 수 없다. */
export function coversPeriod(meta: EventsMeta | null, start: string, end: string): boolean {
  if (!meta || !start) return false;
  const s = start.slice(0, 7).replace('-', '');
  const e = (end && end >= start ? end : start).slice(0, 7).replace('-', '');
  return s >= meta.from && e <= meta.to;
}

export const ymLabel = (ym: string) => `${ym.slice(0, 4)}년 ${Number(ym.slice(4, 6))}월`;

export function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Seoul' });
}

const norm = (s: string) => s.replace(/\s+/g, '').toUpperCase();

export function matchesVenue(ev: ParkEvent, venue: Venue): boolean {
  const text = norm(ev.venue);
  if (venue.eventKeywords.some((k) => text.includes(norm(k)))) return true;
  // 장소 이름이 비어 있을 때만 코드로 맞춘다 (여러 공연장을 쓰는 행사는 코드가 하나뿐이라)
  return !ev.venue && venue.eventCodes.includes(ev.venueCode);
}

/** [start, end] 기간과 겹치는 그 공연장의 일정 */
export function eventsOverlapping(events: ParkEvent[], venue: Venue, start: string, end: string): ParkEvent[] {
  if (!start) return [];
  const s = start;
  const e = end && end >= start ? end : start;
  return events.filter((ev) => matchesVenue(ev, venue) && ev.begin <= e && ev.end >= s);
}
