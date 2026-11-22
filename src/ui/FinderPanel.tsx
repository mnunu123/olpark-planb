import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { VENUES, type VenueId } from '../data/venues';
import {
  EVENTS_SOURCE,
  coversPeriod,
  eventDetailUrl,
  eventsOverlapping,
  loadEvents,
  timeLabel,
  ymLabel,
  type EventsData,
} from '../lib/events';
import { fmt } from '../lib/capacity';
import NumField from './NumField';

function SourceNote({ data, loading, covered }: { data: EventsData; loading: boolean; covered: boolean }) {
  const { meta, events } = data;
  if (loading) return <p className="hint">올림픽공원 공연·행사 일정을 불러오는 중…</p>;
  if (!meta)
    return (
      <p className="hint warn-text">
        일정을 불러오지 못했어요. 공연장 일정은{' '}
        <a href={EVENTS_SOURCE.page} target="_blank" rel="noreferrer">
          누리집
        </a>
        에서 확인해 주세요.
      </p>
    );
  const range = `${ymLabel(meta.from)}~${ymLabel(meta.to)}`;
  return (
    <>
      <p className="hint">
        {meta.mode === 'live' ? (
          <>
            <a href={EVENTS_SOURCE.page} target="_blank" rel="noreferrer">
              {EVENTS_SOURCE.label}
            </a>
            을 실시간으로 불러왔어요 ({timeLabel(meta.at)} 기준, {range} {fmt(events.length)}건).
          </>
        ) : (
          <>
            실시간 일정을 불러오지 못해{' '}
            <a href={EVENTS_SOURCE.page} target="_blank" rel="noreferrer">
              {EVENTS_SOURCE.label}
            </a>
            을 {timeLabel(meta.at)}에 받아 둔 것으로 보여 드려요 ({range} {fmt(events.length)}건).
          </>
        )}{' '}
        {EVENTS_SOURCE.note}
      </p>
      {!covered && (
        <p className="hint warn-text">선택한 날짜가 일정 범위({range}) 밖이라, 일정이 없어도 비어 있다고 볼 수 없어요.</p>
      )}
    </>
  );
}

export default function FinderPanel() {
  const plan = useStore((s) => s.plan);
  const setVenue = useStore((s) => s.setVenue);
  const setField = useStore((s) => s.setPlanField);
  const setTab = useStore((s) => s.setTab);

  const [data, setData] = useState<EventsData>({ events: [], meta: null });
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState<VenueId | ''>('handball');
  const [start, setStart] = useState(plan.eventDate || '2026-12-25');
  const [end, setEnd] = useState(plan.eventDate || '2026-12-26');
  const [audience, setAudience] = useState(plan.plannedStanding + plan.plannedSeated || 4000);

  useEffect(() => {
    let alive = true;
    loadEvents().then((d) => {
      if (!alive) return;
      setData(d);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 일정을 못 불러왔거나 날짜가 조회 범위 밖이면 '비어 있음'이라고 말하지 않는다
  const covered = coversPeriod(data.meta, start, end);
  const known = !loading && covered;

  const rows = useMemo(
    () =>
      VENUES.map((v) => {
        const evs = eventsOverlapping(data.events, v, start, end);
        const fit = v.seats ? (v.seats >= audience ? 'fit' : 'short') : 'unknown';
        return { venue: v, evs, fit };
      }).sort((a, b) => {
        // 원래 공연장은 맨 아래, 일정 없는 곳 먼저, 규모 맞는 곳 먼저
        const score = (r: typeof a) => (r.venue.id === origin ? 100 : 0) + (r.evs.length ? 10 : 0) + (r.fit === 'short' ? 1 : 0);
        return score(a) - score(b);
      }),
    [data.events, start, end, audience, origin],
  );

  const goPlan = (id: VenueId) => {
    const hasWork = plan.zones.length + plan.stages.length + plan.exits.length > 0;
    if (id !== plan.venueId) {
      if (hasWork && !confirm('공연장을 바꾸면 지금 그린 구역, 무대, 출구가 지워져요. 바꿀까요?')) return;
      setVenue(id);
    }
    if (!plan.eventDate) setField('eventDate', start);
    setTab('plan');
  };

  return (
    <>
      <section>
        <h3>대체 공연장 찾기</h3>
        <div className="field">
          <label>원래 쓰려던 공연장</label>
          <select value={origin} onChange={(e) => setOrigin(e.target.value as VenueId | '')}>
            <option value="">없음</option>
            {VENUES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.shortName}
              </option>
            ))}
          </select>
        </div>
        <div className="row2">
          <div className="field">
            <label>공연 시작일</label>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="field">
            <label>공연 종료일</label>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>예상 관객 수(명)</label>
          <NumField value={audience} onChange={(v) => setAudience(Math.round(v))} />
        </div>
        <SourceNote data={data} loading={loading} covered={covered || loading} />
      </section>
      <section>
        <div className="finder-list">
          {rows.map(({ venue, evs, fit }) => {
            const isOrigin = venue.id === origin;
            const cls = isOrigin ? 'origin' : evs.length ? 'busy' : known ? 'free' : 'unknown';
            return (
              <div key={venue.id} className={`finder-card ${cls}`}>
                <div className="finder-head">
                  <b>{venue.shortName}</b>
                  {isOrigin ? (
                    <span className="pill">원래 공연장</span>
                  ) : evs.length ? (
                    <span className="pill busy">공개 일정 {evs.length}건</span>
                  ) : known ? (
                    <span className="pill free">공개 일정 없음</span>
                  ) : (
                    <span className="pill">{loading ? '일정 확인 중' : '일정 확인 불가'}</span>
                  )}
                </div>
                <div className="item-meta" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span>{venue.seats ? `공식 ${fmt(venue.seats)}석` : `면적 약 ${fmt(venue.area ?? 0)}㎡`}</span>
                  {fit === 'fit' && <span className="pill fit">관객 수 수용 가능</span>}
                  {fit === 'short' && <span className="pill short">공식 객석 부족</span>}
                  {fit === 'unknown' && <span className="pill">3D로 구역을 그려 확인</span>}
                </div>
                {evs.length > 0 && (
                  <ul className="ev-list">
                    {evs.slice(0, 3).map((e) => (
                      <li key={e.id}>
                        {e.begin === e.end ? e.begin : `${e.begin} ~ ${e.end}`} ·{' '}
                        <a href={eventDetailUrl(e.id)} target="_blank" rel="noreferrer">
                          {e.title}
                        </a>
                      </li>
                    ))}
                    {evs.length > 3 && <li className="muted">외 {evs.length - 3}건</li>}
                  </ul>
                )}
                {!isOrigin && (
                  <div className="btn-row" style={{ marginTop: 8 }}>
                    <button className="btn small" onClick={() => goPlan(venue.id)}>
                      3D로 배치해 보기
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
