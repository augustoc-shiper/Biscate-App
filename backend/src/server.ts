import http from 'node:http';
import { createApp } from './app.js';
import { config } from './config.js';

const server = http.createServer(createApp());

server.listen(config.port, () => {
  console.log(`Biscate API a correr em http://localhost:${config.port}`);
});
