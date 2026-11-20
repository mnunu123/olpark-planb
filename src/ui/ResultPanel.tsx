import { useMemo } from 'react';
import { useStore } from '../store';
import { getVenue } from '../data/venues';
import { BAND_LABEL, calcPlan, fmt, type PlanCalc } from '../lib/capacity';
import {
  EXIT_MIN_COUNT,
  EXIT_MIN_WIDTH,
  EXIT_RULE_MIN_AREA,
  EXIT_WIDTH_PER_100M2,
  PERF_PLAN_THRESHOLD,
  SOURCES,
} from '../data/standards';

/** 밀도가 낮은 기준부터 높은 기준 순서로 보여준다 */
export function StandardsTable({ c }: { c: PlanCalc }) {
  return (
    <table className="std-table">
      <tbody>
        <tr>
          <td>
            '여유' 단계 상한
            <small>행안부 가이드라인, 1㎡당 2명</small>
          </td>
          <td>{fmt(c.relaxedMax)}명</td>
        </tr>
        <tr>
          <td>
            권장 할당 기준
            <small>행안부 가이드라인, 서서 보는 관람 1인당 0.46㎡</small>
          </td>
          <td>{fmt(c.recommended)}명</td>
        </tr>
        <tr>
          <td>
            '주의' 단계
            <small>1㎡당 3~4명</small>
          </td>
          <td>
            {fmt(c.cautionMin)}~{fmt(c.cautionMax)}명
          </td>
        </tr>
        <tr>
          <td>
            '위험' 단계 시작
            <small>1㎡당 5명 이상</small>
          </td>
          <td>{fmt(c.dangerFrom)}명부터</td>
        </tr>
        <tr>
          <td>
            소방 수용인원 산정식
            <small>문화·집회시설 바닥면적 ÷ 4.6㎡. 소방시설 설치 기준을 정할 때 쓰는 법정 산정식이라 공연 인원 상한과는 성격이 달라요.</small>
          </td>
          <td>{fmt(c.fireCode)}명</td>
        </tr>
      </tbody>
    </table>
  );
}

export function verdictText(c: PlanCalc, plannedStanding: number): string {
  if (c.density === null || c.band === null) return '';
  const d = fmt(c.density, 2);
  const head = `스탠딩 ${fmt(plannedStanding)}명이면 1㎡당 ${d}명이라`;
  if (c.band === 'danger') return `${head} 가이드라인 '위험' 단계예요. 판매 수량을 줄이거나 구역을 넓혀야 해요.`;
  if (c.band === 'caution') {
    if (c.overRecommended > 0) return `${head} '주의' 단계예요. 1인당 0.46㎡ 권장 기준보다 ${fmt(c.overRecommended)}명 많아요.`;
    return `${head} 1인당 0.46㎡ 권장 기준 안이지만, '여유' 단계(1㎡당 2명)는 넘어서 '주의'로 봐요.`;
  }
  return `${head} '여유' 단계이고, 1인당 0.46㎡ 권장 기준 안이에요.`;
}

export default function ResultPanel() {
  const plan = useStore((s) => s.plan);
  const venue = getVenue(plan.venueId);
  const c = useMemo(() => calcPlan(plan), [plan]);
  const hasStanding = c.standingNet > 0;

  return (
    <>
      <section>
        <h3>수용 인원 확인</h3>
        <div className="result-hero">
          <div className="stat">
            <small>스탠딩 구역 순면적</small>
            <b>
              {fmt(c.standingNet, 1)}
              <em>㎡</em>
            </b>
          </div>
          <div className="stat">
            <small>권장 할당 기준 스탠딩 인원</small>
            <b>
              {fmt(c.recommended)}
              <em>명</em>
            </b>
          </div>
          <div className="stat">
            <small>좌석 구역 의자 수</small>
            <b>
              {fmt(c.seatTotal)}
              <em>석</em>
            </b>
          </div>
          <div className="stat">
            <small>판매 예정 합계</small>
            <b>
              {fmt(c.plannedTotal)}
              <em>장</em>
            </b>
          </div>
        </div>
        {!hasStanding && <p className="hint">왼쪽 4번에서 스탠딩 구역을 그리면 기준별 인원이 나와요.</p>}
      </section>

      {hasStanding && (
        <section>
          <h3>스탠딩 구역 기준별 인원</h3>
          <StandardsTable c={c} />
          {c.band && c.density !== null ? (
            <div className={`verdict ${c.band}`}>
              <span className={`band ${c.band}`}>{BAND_LABEL[c.band]}</span>
              <p style={{ margin: '6px 0 0' }}>{verdictText(c, plan.plannedStanding)}</p>
            </div>
          ) : (
            <p className="hint">스탠딩 판매 예정 수량을 넣으면 밀도를 판정해요.</p>
          )}
          {plan.plannedSeated > 0 && c.seatTotal > 0 && plan.plannedSeated > c.seatTotal && (
            <div className="verdict danger">
              좌석 판매 예정({fmt(plan.plannedSeated)}장)이 그린 좌석 구역 의자 수({fmt(c.seatTotal)}석)보다 많아요.
            </div>
          )}
        </section>
      )}

      {c.exit && (
        <section>
          <h3>출구 기준 비교</h3>
          {c.exit.count === 0 ? (
            <p className="hint">
              왼쪽 5번에서 출구를 찍으면 피난 규정(출구 {EXIT_MIN_COUNT}곳 이상, 각 {EXIT_MIN_WIDTH}m 이상, 관객 구역 100㎡마다 너비{' '}
              {EXIT_WIDTH_PER_100M2}m)과 비교해요. 지금 관객 구역 {fmt(c.exit.floorArea, 0)}㎡라면 출구 너비 합계가 {fmt(c.exit.requiredSum, 2)}m
              이상이어야 해요.
            </p>
          ) : (
          <ul className="checks">
            <li className={c.exit.countOk ? 'ok' : 'no'}>
              <span className="mark">{c.exit.countOk ? '✓' : '✕'}</span>
              <span>
                출구 {fmt(c.exit.count)}곳 (기준 {EXIT_MIN_COUNT}곳 이상)
              </span>
            </li>
            <li className={c.exit.count === 0 ? 'na' : c.exit.widthOk ? 'ok' : 'no'}>
              <span className="mark">{c.exit.count === 0 ? '–' : c.exit.widthOk ? '✓' : '✕'}</span>
              <span>
                가장 좁은 출구 {fmt(c.exit.minWidth, 2)}m (기준 각 {EXIT_MIN_WIDTH}m 이상)
              </span>
            </li>
            <li className={c.exit.count === 0 ? 'na' : c.exit.sumOk ? 'ok' : 'no'}>
              <span className="mark">{c.exit.count === 0 ? '–' : c.exit.sumOk ? '✓' : '✕'}</span>
              <span>
                너비 합계 {fmt(c.exit.sumWidth, 2)}m / 필요 {fmt(c.exit.requiredSum, 2)}m (관객 구역 {fmt(c.exit.floorArea, 0)}㎡, 100㎡마다{' '}
                {EXIT_WIDTH_PER_100M2}m)
              </span>
            </li>
          </ul>
          )}
          {!c.exit.applies && <p className="hint">관객 구역이 {EXIT_RULE_MIN_AREA}㎡ 미만이면 이 규정은 적용되지 않아서 참고로만 보여줘요.</p>}
        </section>
      )}

      {c.perfNotice && (
        <section>
          <div className="verdict caution">
            옥외 공연장에서 {fmt(PERF_PLAN_THRESHOLD)}명 이상 관람이 예상되면 공연 14일 전까지 재해대처계획을 신고해야 해요 (변경은 7일 전까지).
          </div>
        </section>
      )}

      <section>
        <details className="sources">
          <summary>계산 기준과 출처 보기</summary>
          <ol>
            {Object.values(SOURCES).map((s) => (
              <li key={s.id}>
                <b>{s.title}</b>
                <br />
                {s.detail}
              </li>
            ))}
          </ol>
        </details>
        <p className="disclaimer">
          단계 사이 값(1㎡당 2명 초과 3명 미만, 4명 초과 5명 미만)은 더 높은 단계로 봐요. 이 계산은 검토용 참고값이고, 실제 수용 인원은 {venue.shortName} 운영자의 재해대처계획과 관할 기관 판단을 따라야 해요.
        </p>
      </section>
    </>
  );
}
