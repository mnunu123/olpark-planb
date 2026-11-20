import { useState } from 'react';
import { useStore } from '../store';
import { useParking } from '../lib/parking';
import { shareUrl } from '../lib/share';
import { fmt } from '../lib/capacity';

function ParkingChip() {
  const p = useParking();
  const time = p.at ? p.at.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <div
      className={`parking ${p.error || p.count === null ? 'err' : ''}`}
      title="한국체육산업개발 실시간 주차현황 (동2·남2·북2 주차장), 1분마다 갱신"
    >
      <span className="dot" />
      올림픽공원 주차 {p.count !== null ? <b>{fmt(p.count)}대</b> : <b>확인 중</b>}
      {time && <span>· {time}</span>}
    </div>
  );
}

export default function TopBar() {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const plan = useStore((s) => s.plan);
  const openReport = useStore((s) => s.setReportOpen);
  const openIntro = useStore((s) => s.setIntroOpen);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const url = shareUrl(plan);
    history.replaceState(null, '', url);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('이 링크를 복사하세요', url);
    }
  };

  return (
    <header className="topbar">
      <div className="brand" onClick={() => openIntro(true)} title="소개 다시 보기">
        <span className="logo" />
        <div>
          <b>올팍 플랜B</b>
          <small>대체 공연장 3D 검토</small>
        </div>
      </div>
      <nav className="tabs">
        <button className={tab === 'finder' ? 'on' : ''} onClick={() => setTab('finder')}>
          대체 공연장 찾기
        </button>
        <button className={tab === 'plan' ? 'on' : ''} onClick={() => setTab('plan')}>
          3D 배치·수용 인원
        </button>
      </nav>
      <div className="top-right">
        <ParkingChip />
        <button className="ghost" onClick={copy}>
          {copied ? '링크 복사됨' : '공유 링크'}
        </button>
        <button className="primary" onClick={() => openReport(true)}>
          검토서 만들기
        </button>
      </div>
    </header>
  );
}
