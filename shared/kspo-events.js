// 올림픽공원 공식 누리집(한국체육산업개발)의 공연·행사 일정을 받아 앱 형식으로 바꾼다.
//
// 서버 쪽에서만 쓴다: Vercel 함수(api/events.js), Vite 개발·미리보기 서버(vite.config.ts),
// 스냅샷 스크립트(scripts/fetch-events.mjs). 누리집 서버가 다른 사이트에서 브라우저로
// 직접 부르는 요청(CORS 사전 요청)을 받아 주지 않아서 브라우저에서는 부를 수 없다.
//
// 공공데이터포털의 '올림픽공원 공연정보·대관정보' API(문화공공데이터광장 연계)는
// 2026-11-22에 키를 받아 전부 확인했지만 2024년(공연정보), 2022년(대관정보) 공연까지만 있고
// 날짜가 따로 정리돼 있지 않아 쓰지 않는다. 그 API가 최신화되면 이 파일만 바꾸면 된다.

export const KSPO_EVENTS_ENDPOINT = 'https://www.ksponco.or.kr/olympicpark/eventInfo/eventInfoListAjax.es';
export const KSPO_EVENTS_PAGE = 'https://www.ksponco.or.kr/olympicpark/eventInfo/eventInfoList?mid=a20301010100';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const CACHE_TTL_MS = 10 * 60 * 1000;

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const pad2 = (n) => String(n).padStart(2, '0');

/** 한국 시간 기준으로 오늘이 속한 달에서 offset개월 떨어진 달 (YYYYMM) */
export function kstMonth(offset = 0, now = Date.now()) {
  const d = new Date(now + KST_OFFSET_MS);
  const base = d.getUTCFullYear() * 12 + d.getUTCMonth() + offset;
  return `${Math.floor(base / 12)}${pad2((base % 12) + 1)}`;
}

/** 기본 조회 범위: 2개월 전 ~ 6개월 뒤 (9개월) */
export function defaultRange(now = Date.now()) {
  return { from: kstMonth(-2, now), to: kstMonth(6, now) };
}

export function monthRange(from, to) {
  if (!/^\d{6}$/.test(from) || !/^\d{6}$/.test(to)) throw new Error('기간은 YYYYMM 형식이어야 해요');
  const out = [];
  let y = +from.slice(0, 4);
  let m = +from.slice(4, 6);
  while (y * 100 + m <= +to) {
    out.push(`${y}${pad2(m)}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  if (out.length === 0 || out.length > 24) throw new Error('조회 범위는 1~24개월이어야 해요');
  return out;
}

async function fetchMonth(nowYM, timeoutMs) {
  const res = await fetch(KSPO_EVENTS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({ nowYM, plcCd: '' }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`${nowYM}: HTTP ${res.status}`);
  const data = await res.json();
  // 응답은 [진행·예정 목록, 종료 목록] 두 배열이고, 그 달과 기간이 겹치는 공연이 들어 있다
  if (!Array.isArray(data)) throw new Error(`${nowYM}: 예상과 다른 응답`);
  return data.flat();
}

function toEvent(r) {
  const begin = clean(r.beginDt);
  const end = clean(r.endDt) || begin;
  if (typeof r.evtSeq !== 'number' || !/^\d{4}-\d{2}-\d{2}$/.test(begin) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return null;
  return {
    id: r.evtSeq,
    title: clean(r.title),
    begin,
    end,
    venue: clean(r.plc),
    venueCode: clean(r.plcCd),
    time: clean(r.tm),
  };
}

const memo = new Map();

/**
 * from~to 달의 일정을 모두 받아 합친다. 한 달이라도 실패하면 전체를 실패로 본다
 * (빠진 달이 있으면 그 기간 공연장이 비어 있는 것처럼 보여서).
 */
export async function fetchKspoEvents({ from, to, timeoutMs = 8000, useCache = true } = {}) {
  const range = from && to ? { from, to } : defaultRange();
  const key = `${range.from}-${range.to}`;
  const hit = memo.get(key);
  if (useCache && hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const months = monthRange(range.from, range.to);
  const perMonth = await Promise.all(months.map((m) => fetchMonth(m, timeoutMs)));

  const byId = new Map();
  for (const rows of perMonth) {
    for (const r of rows) {
      if (r && r.delYn && r.delYn !== 'N') continue;
      const ev = toEvent(r ?? {});
      if (ev) byId.set(ev.id, ev);
    }
  }
  const events = [...byId.values()].sort((a, b) => a.begin.localeCompare(b.begin) || a.id - b.id);
  const value = { from: range.from, to: range.to, fetchedAt: new Date().toISOString(), page: KSPO_EVENTS_PAGE, events };
  memo.set(key, { at: Date.now(), value });
  return value;
}
