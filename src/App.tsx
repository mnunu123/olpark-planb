import { useEffect } from 'react';
import { useStore } from './store';
import VenueScene from './scene/VenueScene';
import TopBar from './ui/TopBar';
import PlanPanel from './ui/PlanPanel';
import FinderPanel from './ui/FinderPanel';
import ResultPanel from './ui/ResultPanel';
import ViewToolbar, { Legend, ModeBanner } from './ui/ViewToolbar';
import Report from './ui/Report';
import Intro from './ui/Intro';
import { readPlanFromHash } from './lib/share';

export default function App() {
  const tab = useStore((s) => s.tab);
  const reportOpen = useStore((s) => s.reportOpen);
  const introOpen = useStore((s) => s.introOpen);
  // 모델이 다 불려야 bounds가 채워지므로, 비어 있는 동안은 불러오는 중으로 본다
  const bounds = useStore((s) => s.bounds);

  // 공유 링크로 들어오면 그 배치를 불러오고 소개는 건너뛴다
  useEffect(() => {
    const p = readPlanFromHash();
    if (p) {
      useStore.getState().loadPlan(p);
      useStore.getState().setIntroOpen(false);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      const s = useStore.getState();
      if (e.key === 'Escape') {
        if (s.reportOpen) s.setReportOpen(false);
        else if (s.mode !== 'view') s.cancelMode();
        else s.select(null);
      } else if (e.key === 'Enter' && s.mode === 'draw') {
        s.finishDraft();
      } else if (e.key === 'Backspace' && s.mode === 'draw') {
        e.preventDefault();
        s.undoDraftPoint();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && s.mode === 'view' && s.selected) {
        e.preventDefault();
        const { type, id } = s.selected;
        if (type === 'zone') s.removeZone(id);
        if (type === 'stage') s.removeStage(id);
        if (type === 'exit') s.removeExit(id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <div className="app">
        <TopBar />
        <div className="main">
          <aside className="panel left">{tab === 'plan' ? <PlanPanel /> : <FinderPanel />}</aside>
          <div className="stage-area">
            <VenueScene />
            {!bounds && <div className="loading canvas-loading">공연장 3D 불러오는 중…</div>}
            <ModeBanner />
            <Legend />
            <ViewToolbar />
          </div>
          <aside className="panel right">
            <ResultPanel />
          </aside>
        </div>
      </div>
      {reportOpen && <Report />}
      {introOpen && <Intro />}
    </>
  );
}
