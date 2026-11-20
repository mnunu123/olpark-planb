// 올림픽공원 공식 홈페이지의 공연·행사 일정을 받아 public/data/events.json 스냅샷으로 저장한다.
// 문화공공데이터광장 '올림픽공원 공연정보/대관정보' API를 붙이기 전까지 쓰는 임시 데이터 경로다.
//
//   npm run data:events                      # 2개월 전 ~ 6개월 뒤
//   npm run data:events -- 202601 202703     # 기간 지정 (YYYYMM YYYYMM)
//
// 응답은 [진행·예정 목록, 종료 목록] 두 배열이고, 각 달과 기간이 겹치는 공연이 들어 있다.
import { writeFile } from 'node:fs/promises';

const ENDPOINT = 'https://www.ksponco.or.kr/olympicpark/eventInfo/eventInfoListAjax.es';
const OUT = new URL('../public/data/events.json', import.meta.url);

function ym(d) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthRange(from, to) {
  const out = [];
  let y = +from.slice(0, 4);
  let m = +from.slice(4, 6);
  const endKey = +to;
  while (y * 100 + m <= endKey) {
    out.push(`${y}${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

async function fetchMonth(nowYM) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
    body: JSON.stringify({ nowYM, plcCd: '' }),
  });
  if (!res.ok) throw new Error(`${nowYM}: HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error(`${nowYM}: 예상과 다른 응답`);
  return data.flat();
}

const now = new Date();
const [fromArg, toArg] = process.argv.slice(2);
const from = fromArg ?? ym(new Date(now.getFullYear(), now.getMonth() - 2, 1));
const to = toArg ?? ym(new Date(now.getFullYear(), now.getMonth() + 6, 1));
if (!/^\d{6}$/.test(from) || !/^\d{6}$/.test(to)) {
  console.error('기간은 YYYYMM YYYYMM 형식으로 넣어 주세요.');
  process.exit(1);
}

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

const byId = new Map();
for (const month of monthRange(from, to)) {
  const rows = await fetchMonth(month);
  for (const r of rows) {
    if (r.delYn && r.delYn !== 'N') continue;
    byId.set(r.evtSeq, {
      id: r.evtSeq,
      title: clean(r.title),
      begin: r.beginDt,
      end: r.endDt,
      venue: clean(r.plc),
      venueCode: clean(r.plcCd),
      time: clean(r.tm),
    });
  }
  console.log(`${month}: ${rows.length}건`);
}

const events = [...byId.values()].sort((a, b) => a.begin.localeCompare(b.begin) || a.id - b.id);
await writeFile(OUT, JSON.stringify(events, null, 1) + '\n');
console.log(`저장: public/data/events.json (${events.length}건, ${from}~${to})`);
console.log('src/lib/events.ts의 EVENTS_SOURCE.collectedAt 날짜도 오늘로 바꿔 주세요.');
