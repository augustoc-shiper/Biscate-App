import http from 'node:http';
import { createApp } from './app.js';
import { config } from './config.js';
import { createSocketServer } from './sockets/index.js';
import { runSubscriptionsJob } from './services/subscriptions.service.js';

const server = http.createServer(createApp());
createSocketServer(server, { corsOrigin: config.corsOrigin });

/** Agenda: activação por prazo + expiração. Não depende de now() do PostgreSQL. */
function tickSubscriptions(): void {
  void runSubscriptionsJob().catch((err: unknown) => {
    console.error('[subscriptions-job]', err);
  });
}

tickSubscriptions();
const jobTimer = setInterval(tickSubscriptions, 5 * 60 * 1000);
jobTimer.unref();

server.listen(config.port, () => {
  console.log(`Biscate API a correr em http://localhost:${config.port}`);
});
