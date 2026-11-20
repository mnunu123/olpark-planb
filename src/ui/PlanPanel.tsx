import { useMemo } from 'react';
import { useStore, type StagePreset, type ZoneKind } from '../store';
import { VENUES, getVenue } from '../data/venues';
import { calcPlan, fmt, stageArea } from '../lib/capacity';
import { COLORS } from '../scene/VenueScene';
import NumField from './NumField';
import { EXAMPLES } from '../data/examples';

const KIND_OPTIONS: { value: ZoneKind; label: string }[] = [
  { value: 'standing', label: '스탠딩' },
  { value: 'seated', label: '좌석' },
  { value: 'excluded', label: '제외(통로·시설)' },
];

const PRESETS: { value: StagePreset; label: string }[] = [
  { value: 'end', label: '엔드 무대' },
  { value: 'center', label: '센터 무대' },
  { value: 'thrust', label: '돌출 무대' },
];

const PRESET_LABEL: Record<StagePreset, string> = { end: '엔드 무대', center: '센터 무대', thrust: '돌출 무대' };

function VenueSection() {
  const plan = useStore((s) => s.plan);
  const setVenue = useStore((s) => s.setVenue);
  const venue = getVenue(plan.venueId);
  const hasWork = plan.zones.length + plan.stages.length + plan.exits.length > 0;

  return (
    <section>
      <h3>
        <em>1</em>공연장
      </h3>
      <div className="venues">
        {VENUES.map((v) => (
          <button
            key={v.id}
            className={`venue-card ${v.id === plan.venueId ? 'on' : ''}`}
            onClick={() => {
              if (v.id === plan.venueId) return;
              if (hasWork && !confirm('공연장을 바꾸면 지금 그린 구역, 무대, 출구가 지워져요. 바꿀까요?')) return;
              setVenue(v.id);
            }}
          >
            <b>{v.shortName}</b>
            <span>
              {v.kind === 'indoor' ? '실내' : '옥외'} · {v.seats ? `${fmt(v.seats)}석` : `약 ${fmt(v.area ?? 0)}㎡`}
            </span>
          </button>
        ))}
      </div>
      <ul className="specs">
        {venue.specs.map((s) => (
          <li key={s.label}>
            <span>{s.label}</span>
            <span>{s.value}</span>
          </li>
        ))}
      </ul>
      <p className="hint">
        제원 출처:{' '}
        <a href={venue.sourceUrl} target="_blank" rel="noreferrer">
          한국체육산업개발 대관시설 안내
        </a>
        {' · '}3D: 실감형 콘텐츠 {venue.sourceFile}
      </p>
      {venue.modelNote && <div className="note">{venue.modelNote}</div>}
    </section>
  );
}

function EventSection() {
  const plan = useStore((s) => s.plan);
  const setField = useStore((s) => s.setPlanField);
  return (
    <section>
      <h3>
        <em>2</em>공연 정보
      </h3>
      <div className="field">
        <label>공연 이름</label>
        <input value={plan.eventName} placeholder="예: 2026 OO 콘서트" onChange={(e) => setField('eventName', e.target.value)} />
      </div>
      <div className="field">
        <label>공연 날짜</label>
        <input type="date" value={plan.eventDate} onChange={(e) => setField('eventDate', e.target.value)} />
      </div>
      <div className="row2">
        <div className="field">
          <label>스탠딩 판매 예정(장)</label>
          <NumField value={plan.plannedStanding} onChange={(v) => setField('plannedStanding', Math.round(v))} placeholder="0" />
        </div>
        <div className="field">
          <label>좌석 판매 예정(장)</label>
          <NumField value={plan.plannedSeated} onChange={(v) => setField('plannedSeated', Math.round(v))} placeholder="0" />
        </div>
      </div>
    </section>
  );
}

function StageSection() {
  const stages = useStore((s) => s.plan.stages);
  const selected = useStore((s) => s.selected);
  const mode = useStore((s) => s.mode);
  const pending = useStore((s) => s.pendingPreset);
  const startPlace = useStore((s) => s.startPlaceStage);
  const update = useStore((s) => s.updateStage);
  const remove = useStore((s) => s.removeStage);
  const select = useStore((s) => s.select);
  const tmode = useStore((s) => s.transformMode);
  const setTmode = useStore((s) => s.setTransformMode);

  return (
    <section>
      <h3>
        <em>3</em>무대 놓기
      </h3>
      <div className="btn-row">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            className={`btn small ${mode === 'place-stage' && pending === p.value ? 'on' : ''}`}
            onClick={() => startPlace(p.value)}
          >
            + {p.label}
          </button>
        ))}
      </div>
      <p className="hint">버튼을 누르고 바닥을 클릭하면 그 자리에 놓여요. 무대를 선택하면 화살표로 옮기고 돌릴 수 있어요.</p>
      {stages.length > 0 && (
        <div className="items">
          {stages.map((st, i) => {
            const on = selected?.type === 'stage' && selected.id === st.id;
            return (
              <div key={st.id} className={`item ${on ? 'on' : ''}`} onClick={() => select({ type: 'stage', id: st.id })}>
                <div className="item-head">
                  <span className="swatch" style={{ background: COLORS.stage }} />
                  <b style={{ flex: 1 }}>
                    {PRESET_LABEL[st.preset]} {i + 1}
                  </b>
                  <button className="icon-btn" title="삭제" onClick={(e) => (e.stopPropagation(), remove(st.id))}>
                    ✕
                  </button>
                </div>
                <div className="inline">
                  <label>
                    가로(m)
                    <NumField value={st.w} step={0.5} min={1} onChange={(v) => update(st.id, { w: v })} />
                  </label>
                  <label>
                    세로(m)
                    <NumField value={st.d} step={0.5} min={1} onChange={(v) => update(st.id, { d: v })} />
                  </label>
                  <label>
                    높이(m)
                    <NumField value={st.h} step={0.1} min={0.1} onChange={(v) => update(st.id, { h: v })} />
                  </label>
                  {st.preset === 'thrust' && (
                    <>
                      <label>
                        돌출 폭(m)
                        <NumField value={st.rw} step={0.5} min={0} onChange={(v) => update(st.id, { rw: v })} />
                      </label>
                      <label>
                        돌출 길이(m)
                        <NumField value={st.rd} step={0.5} min={0} onChange={(v) => update(st.id, { rd: v })} />
                      </label>
                    </>
                  )}
                </div>
                <div className="item-meta">무대가 차지하는 바닥 {fmt(stageArea(st), 1)}㎡ · 회전 {Math.round((st.rot * 180) / Math.PI)}°</div>
                {on && (
                  <div className="btn-row" style={{ marginTop: 6 }}>
                    <button className={`btn small ${tmode === 'translate' ? 'on' : ''}`} onClick={() => setTmode('translate')}>
                      옮기기
                    </button>
                    <button className={`btn small ${tmode === 'rotate' ? 'on' : ''}`} onClick={() => setTmode('rotate')}>
                      돌리기
                    </button>
                    <button className="btn small" onClick={() => update(st.id, { rot: st.rot - Math.PI / 12 })}>
                      ⟲ 15°
                    </button>
                    <button className="btn small" onClick={() => update(st.id, { rot: st.rot + Math.PI / 12 })}>
                      ⟳ 15°
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ZoneSection() {
  const plan = useStore((s) => s.plan);
  const selected = useStore((s) => s.selected);
  const mode = useStore((s) => s.mode);
  const drawKind = useStore((s) => s.drawKind);
  const startDraw = useStore((s) => s.startDraw);
  const update = useStore((s) => s.updateZone);
  const remove = useStore((s) => s.removeZone);
  const select = useStore((s) => s.select);
  const calc = useMemo(() => calcPlan(plan), [plan]);

  return (
    <section>
      <h3>
        <em>4</em>관객 구역 그리기
      </h3>
      <div className="btn-row">
        {KIND_OPTIONS.map((k) => (
          <button
            key={k.value}
            className={`btn small ${mode === 'draw' && drawKind === k.value ? 'on' : ''}`}
            onClick={() => startDraw(k.value)}
          >
            <span className="swatch" style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: COLORS[k.value], marginRight: 6 }} />
            {k.label}
          </button>
        ))}
      </div>
      <p className="hint">바닥을 차례로 클릭해 꼭짓점을 찍고, 첫 점을 다시 누르거나 Enter를 누르면 닫혀요. 무대와 제외 구역은 스탠딩 면적에서 자동으로 빠져요.</p>
      {calc.zones.length > 0 && (
        <div className="items">
          {calc.zones.map(({ zone, area, net }) => {
            const on = selected?.type === 'zone' && selected.id === zone.id;
            return (
              <div key={zone.id} className={`item ${on ? 'on' : ''}`} onClick={() => select({ type: 'zone', id: zone.id })}>
                <div className="item-head">
                  <span className="swatch" style={{ background: COLORS[zone.kind] }} />
                  <input value={zone.name} onChange={(e) => update(zone.id, { name: e.target.value })} onClick={(e) => e.stopPropagation()} />
                  <button className="icon-btn" title="삭제" onClick={(e) => (e.stopPropagation(), remove(zone.id))}>
                    ✕
                  </button>
                </div>
                <div className="inline">
                  <label>
                    종류
                    <select value={zone.kind} onChange={(e) => update(zone.id, { kind: e.target.value as ZoneKind })} onClick={(e) => e.stopPropagation()}>
                      {KIND_OPTIONS.map((k) => (
                        <option key={k.value} value={k.value}>
                          {k.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {zone.kind === 'seated' && (
                    <label>
                      의자 수(석)
                      <NumField value={zone.seats} onChange={(v) => update(zone.id, { seats: Math.round(v) })} />
                    </label>
                  )}
                </div>
                <div className="item-meta">
                  면적 {fmt(area, 1)}㎡{zone.kind === 'standing' && net < area - 0.05 ? ` · 무대·제외 구역 뺀 면적 ${fmt(net, 1)}㎡` : ''}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ExitSection() {
  const exits = useStore((s) => s.plan.exits);
  const selected = useStore((s) => s.selected);
  const mode = useStore((s) => s.mode);
  const startExit = useStore((s) => s.startExit);
  const cancel = useStore((s) => s.cancelMode);
  const update = useStore((s) => s.updateExit);
  const remove = useStore((s) => s.removeExit);
  const select = useStore((s) => s.select);
  const venueKind = getVenue(useStore((s) => s.plan.venueId)).kind;

  return (
    <section>
      <h3>
        <em>5</em>출구 표시
      </h3>
      <div className="btn-row">
        <button className={`btn small ${mode === 'exit' ? 'on' : ''}`} onClick={() => (mode === 'exit' ? cancel() : startExit())}>
          {mode === 'exit' ? '출구 찍기 끝내기' : '+ 출구 찍기'}
        </button>
      </div>
      <p className="hint">
        {venueKind === 'indoor'
          ? '관객 구역에서 쓰는 출구를 찍고 너비를 넣으면 피난 기준과 비교해요.'
          : '옥외 공연장도 대피 동선 확인용으로 출구를 표시할 수 있어요. 피난 기준 비교는 실내 공연장만 해요.'}
      </p>
      {exits.length > 0 && (
        <div className="items">
          {exits.map((ex) => {
            const on = selected?.type === 'exit' && selected.id === ex.id;
            return (
              <div key={ex.id} className={`item ${on ? 'on' : ''}`} onClick={() => select({ type: 'exit', id: ex.id })}>
                <div className="item-head">
                  <span className="swatch" style={{ background: COLORS.exit }} />
                  <input value={ex.name} onChange={(e) => update(ex.id, { name: e.target.value })} onClick={(e) => e.stopPropagation()} />
                  <button className="icon-btn" title="삭제" onClick={(e) => (e.stopPropagation(), remove(ex.id))}>
                    ✕
                  </button>
                </div>
                <div className="inline">
                  <label>
                    유효너비(m)
                    <NumField value={ex.width} step={0.1} min={0.1} onChange={(v) => update(ex.id, { width: v })} />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ExampleSection() {
  const plan = useStore((s) => s.plan);
  const loadPlan = useStore((s) => s.loadPlan);
  const hasWork = plan.zones.length + plan.stages.length + plan.exits.length > 0;
  return (
    <section className="examples">
      <h3>예시로 둘러보기</h3>
      <div className="btn-row">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.id}
            className="ghost"
            title={ex.desc}
            onClick={() => {
              if (hasWork && !confirm('예시를 불러오면 지금 배치가 지워져요. 불러올까요?')) return;
              loadPlan(ex.plan);
            }}
          >
            {ex.title}
          </button>
        ))}
      </div>
    </section>
  );
}

export default function PlanPanel() {
  return (
    <>
      <ExampleSection />
      <VenueSection />
      <EventSection />
      <StageSection />
      <ZoneSection />
      <ExitSection />
    </>
  );
}
