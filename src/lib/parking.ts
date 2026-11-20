import { useEffect, useState } from 'react';

/**
 * 한국체육산업개발 실시간 주차현황 (공공데이터포털 15168686)
 * 기관이 홈페이지 공공데이터 개방목록에 공개한 키로 호출한다. 응답 예: [{"parking_sum":2117}]
 */
export const PARKING_URL = 'https://www.ksponco.or.kr/online/main/parkingorsApi.do?apiKey=PARKING21803504';

export interface ParkingState {
  count: number | null;
  at: Date | null;
  error: boolean;
}

export function useParking(intervalMs = 60000): ParkingState {
  const [state, setState] = useState<ParkingState>({ count: null, at: null, error: false });
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(PARKING_URL, { cache: 'no-store' });
        const data = await res.json();
        const n = Array.isArray(data) ? Number(data[0]?.parking_sum) : NaN;
        if (alive) setState({ count: Number.isFinite(n) ? n : null, at: new Date(), error: !Number.isFinite(n) });
      } catch {
        if (alive) setState((s) => ({ ...s, error: true }));
      }
    };
    load();
    const t = setInterval(load, intervalMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [intervalMs]);
  return state;
}
