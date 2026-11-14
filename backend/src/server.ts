import http from 'node:http';
import { createApp } from './app.js';
import { config } from './config.js';
import { createSocketServer } from './sockets/index.js';

const server = http.createServer(createApp());
createSocketServer(server, { corsOrigin: config.corsOrigin });

server.listen(config.port, () => {
  console.log(`Biscate API a correr em http://localhost:${config.port}`);
});
