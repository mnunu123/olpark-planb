import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { useStore } from './store';
import './styles.css';

// 시연 영상 녹화나 디버깅 때 콘솔에서 상태를 보기 위한 연결
(window as unknown as { __planb: typeof useStore }).__planb = useStore;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
