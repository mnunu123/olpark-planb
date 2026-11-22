import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { fetchKspoEvents } from './shared/kspo-events.js';

/** 개발·미리보기 서버에서도 배포와 같은 /api/events를 쓰게 해 준다 (배포에서는 api/events.js가 맡는다) */
function eventsApi(): Plugin {
  const handler = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.method !== 'GET') return next();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    try {
      const data = await fetchKspoEvents();
      res.end(JSON.stringify({ source: 'live', ...data }));
    } catch (err) {
      res.statusCode = 502;
      res.end(JSON.stringify({ source: 'live', error: String((err as Error)?.message ?? err) }));
    }
  };
  return {
    name: 'olpark-events-api',
    configureServer(server) {
      server.middlewares.use('/api/events', handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/events', handler);
    },
  };
}

export default defineConfig({
  plugins: [react(), eventsApi()],
  build: {
    chunkSizeWarningLimit: 1600,
  },
});
