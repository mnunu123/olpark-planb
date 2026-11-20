import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { getVenue } from '../data/venues';
import { BAND_LABEL, calcPlan, fmt, stageArea } from '../lib/capacity';
import { SOURCES, PERF_PLAN_THRESHOLD } from '../data/standards';
import { DATASETS } from '../data/context';
import { glRef } from '../scene/VenueScene';
import { shareUrl } from '../lib/share';
import { verdictText } from './ResultPanel';

const KIND_LABEL = { standing: '스탠딩', seated: '좌석', excluded: '제외' } as const;
const PRESET_LABEL = { end: '엔드', center: '센터', thrust: '돌출' } as const;

export default function Report() {
  const plan = useStore((s) => s.plan);
  const close = useStore((s) => s.setReportOpen);
  const venue = getVenue(plan.venueId);
  const c = useMemo(() => calcPlan(plan), [plan]);
  const [shot, setShot] = useState<string | null>(null);
  const [made] = useState(() => new Date());
  const link = useMemo(() => shareUrl(plan), [plan]);

  useEffect(() => {
    try {
      setShot(glRef.current?.domElement.toDataURL('image/png') ?? null);
    } catch {
      setShot(null);
    }
  }, []);

  return (
    <div className="report-wrap">
      <div className="report-actions">
        <button className="btn" onClick={() => navigator.clipboard?.writeText(link)}>
          검토서 링크 복사
        </button>
        <button className="primary btn" onClick={() => window.print()}>
          인쇄 / PDF 저장
        </button>
        <button className="btn" onClick={() => close(false)}>
          닫기
        </button>
      </div>
      <article className="report">
        <h1>대체 공연장 수용 인원 검토서</h1>
        <p className="sub">
          올팍 플랜B · 작성 {made.toLocaleString('ko-KR')}
        </p>

        <h2>공연 개요</h2>
        <table>
          <tbody>
            <tr>
              <th>공연 이름</th>
              <td>{plan.eventName || '(입력 안 함)'}</td>
            </tr>
            <tr>
              <th>공연 날짜</th>
              <td>{plan.eventDate || '(입력 안 함)'}</td>
            </tr>
            <tr>
              <th>검토한 공연장</th>
              <td>
                {venue.name} ({venue.specs.map((s) => `${s.label} ${s.value}`).join(', ')})
              </td>
            </tr>
            <tr>
              <th>판매 예정</th>
              <td>
                스탠딩 {fmt(plan.plannedStanding)}장 · 좌석 {fmt(plan.plannedSeated)}장 · 합계 {fmt(c.plannedTotal)}장
              </td>
            </tr>
          </tbody>
        </table>

        {shot && (
          <>
            <h2>배치 화면</h2>
            <img className="shot" src={shot} alt="3D 배치 화면" />
          </>
        )}

        <h2>무대와 구역</h2>
        <table>
          <thead>
            <tr>
              <th style={{ width: 'auto' }}>항목</th>
              <th style={{ width: 'auto' }}>종류</th>
              <th style={{ width: 'auto' }}>크기</th>
            </tr>
          </thead>
          <tbody>
            {plan.stages.map((st, i) => (
              <tr key={st.id}>
                <td>무대 {i + 1}</td>
                <td>{PRESET_LABEL[st.preset]} 무대</td>
                <td className="num">
                  {st.w}×{st.d}m{st.preset === 'thrust' ? ` + 돌출 ${st.rw}×${st.rd}m` : ''} (바닥 {fmt(stageArea(st), 1)}㎡)
                </td>
              </tr>
            ))}
            {c.zones.map(({ zone, area, net }) => (
              <tr key={zone.id}>
                <td>{zone.name}</td>
                <td>{KIND_LABEL[zone.kind]}</td>
                <td className="num">
                  {zone.kind === 'seated' ? `${fmt(zone.seats)}석 · ` : ''}면적 {fmt(area, 1)}㎡
                  {zone.kind === 'standing' && net < area - 0.05 ? ` → 순면적 ${fmt(net, 1)}㎡` : ''}
                </td>
              </tr>
            ))}
            {plan.exits.map((ex) => (
              <tr key={ex.id}>
                <td>{ex.name}</td>
                <td>출구</td>
                <td className="num">유효너비 {ex.width}m</td>
              </tr>
            ))}
            {plan.stages.length + c.zones.length + plan.exits.length === 0 && (
              <tr>
                <td colSpan={3}>아직 배치한 내용이 없어요.</td>
              </tr>
            )}
          </tbody>
        </table>

        <h2>기준별 스탠딩 인원 (순면적 {fmt(c.standingNet, 1)}㎡)</h2>
        <table>
          <tbody>
            <tr>
              <th>'여유' 단계 상한 (1㎡당 2명)</th>
              <td className="num">{fmt(c.relaxedMax)}명</td>
            </tr>
            <tr>
              <th>권장 할당 기준 (1인당 0.46㎡)</th>
              <td className="num">{fmt(c.recommended)}명</td>
            </tr>
            <tr>
              <th>'주의' 단계 (1㎡당 3~4명)</th>
              <td className="num">
                {fmt(c.cautionMin)}~{fmt(c.cautionMax)}명
              </td>
            </tr>
            <tr>
              <th>'위험' 단계 시작 (1㎡당 5명 이상)</th>
              <td className="num">{fmt(c.dangerFrom)}명부터</td>
            </tr>
            <tr>
              <th>소방 수용인원 산정식 (바닥면적 ÷ 4.6㎡, 소방시설 기준용)</th>
              <td className="num">{fmt(c.fireCode)}명</td>
            </tr>
            <tr>
              <th>좌석 구역 의자 수</th>
              <td className="num">{fmt(c.seatTotal)}석</td>
            </tr>
          </tbody>
        </table>

        <h2>판정</h2>
        <table>
          <tbody>
            <tr>
              <th>스탠딩 밀도</th>
              <td>
                {c.band && c.density !== null ? (
                  <>
                    <span className={`badge ${c.band}`}>{BAND_LABEL[c.band]}</span> 1㎡당 {fmt(c.density, 2)}명 — {verdictText(c, plan.plannedStanding)}
                  </>
                ) : (
                  '스탠딩 구역이나 판매 예정 수량이 없어 판정하지 않았어요.'
                )}
              </td>
            </tr>
            {c.exit && (
              <tr>
                <th>출구</th>
                <td>
                  {c.exit.count === 0 ? (
                    <>출구를 표시하지 않아 비교하지 않았어요. 이 관객 구역이면 출구 2곳 이상, 너비 합계 {fmt(c.exit.requiredSum, 2)}m 이상이 필요해요.</>
                  ) : (
                    <>
                      {fmt(c.exit.count)}곳, 가장 좁은 곳 {fmt(c.exit.minWidth, 2)}m, 합계 {fmt(c.exit.sumWidth, 2)}m (필요 {fmt(c.exit.requiredSum, 2)}m) —{' '}
                      {c.exit.countOk && c.exit.widthOk && c.exit.sumOk ? '기준 충족' : '기준 미달 항목 있음'}
                    </>
                  )}
                  {!c.exit.applies ? ' (관객 구역 300㎡ 미만이라 참고용)' : ''}
                </td>
              </tr>
            )}
            {c.perfNotice && (
              <tr>
                <th>신고</th>
                <td>옥외 {fmt(PERF_PLAN_THRESHOLD)}명 이상: 공연 14일 전까지 재해대처계획 신고 대상</td>
              </tr>
            )}
          </tbody>
        </table>

        <h2>기준 출처</h2>
        <ol className="src">
          {Object.values(SOURCES).map((s) => (
            <li key={s.id}>
              <b>{s.title}</b> — {s.detail}
            </li>
          ))}
        </ol>

        <h2>사용한 공공데이터 (한국체육산업개발)</h2>
        <ol className="src">
          {DATASETS.map((d) => (
            <li key={d.id}>
              {d.name} (공공데이터포털 {d.id}) — {d.use}
            </li>
          ))}
        </ol>

        <p className="foot">
          이 검토서는 3D 실측 모델로 계산한 참고 자료이며, 실제 수용 인원은 공연장 운영자의 재해대처계획과 관할 기관 판단을 따라야 합니다. 단계 사이 값은 더 높은 단계로 판정했습니다.
          <br />
          다시 열기: {link.length > 160 ? `${link.slice(0, 160)}…` : link}
        </p>
      </article>
    </div>
  );
}
