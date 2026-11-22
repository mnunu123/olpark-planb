// GET /api/events — 올림픽공원 공연·행사 일정을 실시간으로 받아 돌려준다 (Vercel 함수).
// 인증키가 필요 없다. 응답은 Vercel 엣지에서 30분 캐시하고, 그 뒤에는 새로 받는 동안 이전 응답을 보여 준다.
// 실패하면 502를 돌려주고, 앱은 public/data/events.json 스냅샷으로 넘어간다.
import { fetchKspoEvents } from '../shared/kspo-events.js';

const json = (body, status, cacheControl) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cacheControl },
  });

export async function GET() {
  try {
    const data = await fetchKspoEvents();
    return json({ source: 'live', ...data }, 200, 'public, max-age=0, s-maxage=1800, stale-while-revalidate=86400');
  } catch (err) {
    return json({ source: 'live', error: String(err?.message ?? err) }, 502, 'no-store');
  }
}
