import { useStore } from '../store';
import { CONTEXT_FACTS, DATASETS } from '../data/context';
import { EXAMPLES } from '../data/examples';

export default function Intro() {
  const close = useStore((s) => s.setIntroOpen);
  const loadPlan = useStore((s) => s.loadPlan);
  return (
    <div className="overlay" onClick={() => close(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>올팍 플랜B</h2>
        <p className="lead">
          올림픽공원 공연장을 갑자기 못 쓰게 됐을 때, 옮겨갈 공연장을 3D로 살펴보고 무대와 관객 구역을 배치해 몇 명까지 받을 수 있는지 기준별로 확인하는 도구예요.
        </p>
        <div className="steps">
          <div>
            <b>1. 비어 있는 곳 찾기</b>
            날짜와 관객 수로 공개 일정이 없는 공연장을 추려요.
          </div>
          <div>
            <b>2. 3D로 배치하기</b>
            기관이 공개한 실측 3D 모델 위에 무대, 스탠딩·좌석 구역, 출구를 놓아요.
          </div>
          <div>
            <b>3. 수용 인원 확인</b>
            행안부·소방·피난 기준으로 인원을 계산하고 검토서로 뽑아요.
          </div>
        </div>
        <h3 style={{ fontSize: 14, margin: '0 0 6px' }}>왜 필요한가</h3>
        <ul className="facts">
          {CONTEXT_FACTS.map((f) => (
            <li key={f.url}>
              {f.text}
              <a href={f.url} target="_blank" rel="noreferrer">
                {f.source}
              </a>
            </li>
          ))}
        </ul>
        <h3 style={{ fontSize: 14, margin: '14px 0 0' }}>쓰는 공공데이터 (한국체육산업개발)</h3>
        <table className="datasets">
          <tbody>
            {DATASETS.map((d) => (
              <tr key={d.id}>
                <td>
                  <a href={d.url} target="_blank" rel="noreferrer">
                    {d.name}
                  </a>
                </td>
                <td>{d.use}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="intro-actions">
          <div className="btn-row">
            <span className="muted">예시로 둘러보기</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex.id}
                className="ghost"
                title={ex.desc}
                onClick={() => {
                  loadPlan(ex.plan);
                  close(false);
                }}
              >
                {ex.title}
              </button>
            ))}
          </div>
          <button className="primary" onClick={() => close(false)}>
            직접 시작하기
          </button>
        </div>
      </div>
    </div>
  );
}
