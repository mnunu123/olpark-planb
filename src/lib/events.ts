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

/**
 * 일정 데이터 출처.
 * - 지금: 올림픽공원 공식 공연·행사 일정에서 받아 둔 스냅샷 (public/data/events.json)
 * - 문화공공데이터광장 점검이 끝나면: 공공데이터포털 '올림픽공원 공연정보/대관정보' API로 교체
 *   (api/ 폴더의 서버리스 함수로 인증키를 숨긴 채 호출하는 방식)
 */
export const EVENTS_SOURCE = {
  label: '올림픽공원 공연·행사 일정 (한국체육산업개발)',
  collectedAt: '2026-11-20',
  note: '공개된 일정 기준이라 실제 대관 가능 여부는 대관 담당 확인이 필요해요. 취소된 공연이 목록에 남아 있을 수 있어요.',
};

let cache: Promise<ParkEvent[]> | null = null;

export function loadEvents(): Promise<ParkEvent[]> {
  if (!cache) {
    cache = fetch('/data/events.json')
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []);
  }
  return cache;
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
