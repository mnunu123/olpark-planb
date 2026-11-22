// 올림픽공원 공연·행사 일정을 받아 public/data/events.json 스냅샷으로 저장한다.
// 앱은 /api/events(실시간)를 먼저 부르고, 실패할 때만 이 스냅샷을 쓴다.
//
//   npm run data:events                      # 2개월 전 ~ 6개월 뒤
//   npm run data:events -- 202601 202703     # 기간 지정 (YYYYMM YYYYMM)
import { writeFile } from 'node:fs/promises';
import { defaultRange, fetchKspoEvents } from '../shared/kspo-events.js';

const OUT = new URL('../public/data/events.json', import.meta.url);

const [fromArg, toArg] = process.argv.slice(2);
const range = fromArg && toArg ? { from: fromArg, to: toArg } : defaultRange();

const data = await fetchKspoEvents({ ...range, useCache: false });
const snapshot = {
  source: 'snapshot',
  collectedAt: data.fetchedAt,
  from: data.from,
  to: data.to,
  page: data.page,
  events: data.events,
};
await writeFile(OUT, JSON.stringify(snapshot, null, 1) + '\n');
console.log(`저장: public/data/events.json (${data.events.length}건, ${data.from}~${data.to}, ${data.fetchedAt})`);
