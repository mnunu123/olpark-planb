import { useStore } from '../store';
import { getVenue } from '../data/venues';
import { COLORS } from '../scene/VenueScene';

const KIND_LABEL = { standing: '스탠딩', seated: '좌석', excluded: '제외' } as const;

export function ModeBanner() {
  const mode = useStore((s) => s.mode);
  const kind = useStore((s) => s.drawKind);
  const draft = useStore((s) => s.draft);
  const finish = useStore((s) => s.finishDraft);
  const cancel = useStore((s) => s.cancelMode);
  const undo = useStore((s) => s.undoDraftPoint);
  if (mode === 'view') return null;
  return (
    <div className="mode-banner">
      {mode === 'draw' && (
        <>
          <span>
            <b style={{ color: COLORS[kind] }}>{KIND_LABEL[kind]} 구역</b> 꼭짓점 {draft.length}개 · 바닥을 클릭해 찍고 첫 점을 다시 누르면 닫혀요
          </span>
          <button className="btn small" disabled={draft.length === 0} onClick={undo}>
            되돌리기 <kbd>⌫</kbd>
          </button>
          <button className="btn small" disabled={draft.length < 3} onClick={finish}>
            완료 <kbd>Enter</kbd>
          </button>
          <button className="btn small" onClick={cancel}>
            취소 <kbd>Esc</kbd>
          </button>
        </>
      )}
      {mode === 'place-stage' && (
        <>
          <span>무대를 놓을 바닥을 클릭하세요</span>
          <button className="btn small" onClick={cancel}>
            취소 <kbd>Esc</kbd>
          </button>
        </>
      )}
      {mode === 'exit' && (
        <>
          <span>출구 위치를 클릭하세요 (여러 개 찍을 수 있어요)</span>
          <button className="btn small" onClick={cancel}>
            끝내기 <kbd>Esc</kbd>
          </button>
        </>
      )}
    </div>
  );
}

export default function ViewToolbar() {
  const clip = useStore((s) => s.clip);
  const setClip = useStore((s) => s.setClip);
  const topView = useStore((s) => s.topView);
  const toggleTop = useStore((s) => s.toggleTopView);
  const reset = useStore((s) => s.resetView);
  const venue = getVenue(useStore((s) => s.plan.venueId));

  return (
    <div className="toolbar">
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {venue.kind === 'indoor' ? '지붕 자르기' : '위쪽 자르기'}
        <input type="range" min={0.1} max={1} step={0.01} value={clip} onChange={(e) => setClip(Number(e.target.value))} />
        <span style={{ width: 54, textAlign: 'right' }}>{clip >= 0.999 ? '안 자름' : `${Math.round(clip * 100)}%`}</span>
      </label>
      <button className={`btn small ${topView ? 'on' : ''}`} onClick={toggleTop}>
        위에서 보기
      </button>
      <button className="btn small" onClick={reset}>
        시점 처음으로
      </button>
    </div>
  );
}

export function Legend() {
  return (
    <div className="legend">
      <span>
        <i style={{ background: COLORS.standing }} />
        스탠딩
      </span>
      <span>
        <i style={{ background: COLORS.seated }} />
        좌석
      </span>
      <span>
        <i style={{ background: COLORS.excluded }} />
        제외
      </span>
      <span>
        <i style={{ background: COLORS.stage }} />
        무대
      </span>
      <span>
        <i style={{ background: COLORS.exit }} />
        출구
      </span>
    </div>
  );
}
