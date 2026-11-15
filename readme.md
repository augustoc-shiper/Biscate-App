# Biscate

Marketplace angolano de serviços no bairro — encontre quem resolve, ou seja
quem resolve. O protótipo estático (`Biscate-App/`) foi transformado numa app
web full-stack: API REST + chat em tempo real + SPA React.

- **backend/** — Node.js + Express 5 + PostgreSQL 18 + Drizzle ORM + Socket.IO
- **frontend/** — Vite + React 19 + TypeScript + motion + vitest
- **docs/** — spec, plano e documentação (`docs/situation.md` é o ponto de situação)

## Pré-requisitos

| Ferramenta | Versão testada |
| --- | --- |
| Node.js | 26.4 (>= 20 deve funcionar) |
| npm | 12 |
| PostgreSQL | 18 (socket local `/run/postgresql`; qualquer Postgres >= 14 serve) |

## Setup

```bash
# 1. bases de dados (uma para dev, outra para testes)
createb biscate
createb biscate_test

# 2. dependências
npm install --prefix backend
npm install --prefix frontend

# 3. schema + dados de demonstração (apenas dev)
npm run db:push --prefix backend
npm run seed --prefix backend

# 4. correr (backend :3001 + frontend :5173)
npm run dev            # na raiz, sobe os dois
# ou separadamente:
npm run dev:backend
npm run dev:frontend
```

Variáveis opcionais do backend (`backend/src/config.ts`):
`PORT` (3001), `CORS_ORIGIN` (http://localhost:5173), `JWT_SECRET`
(`biscate-dev-secret` em dev — **obrigatório em produção**).

## Credenciais do seed

Todas com password `biscate123`:

| Conta | Papel | Email |
| --- | --- | --- |
| Ana Matos | cliente | `cliente@biscate.ao` |
| Joaquim Neto | profissional (Electricista) | `profissional@biscate.ao` |
| Manuel Kiala | profissional (Pedreiro) | `manuel.kiala@biscate.ao` |
| Teresa Domingos | profissional (Costura) | `teresa.domingos@biscate.ao` |

O seed cria também 8 categorias, 6 bairros de Luanda, 6 profissionais com
avaliações, favoritos, pedidos, propostas, conversas/mensagens, notificações e
planos/pagamentos.

## Estrutura

```
backend/
  src/
    app.ts server.ts      # express, CORS, rotas, error handler
    config.ts             # env com defaults de dev
    routes/               # 12 routers (auth, professionals, requests, ...)
    controllers/          # parse + service + respond({data})
    services/             # regra de negócio (transacções drizzle)
    dto/                  # schemas zod por domínio
    middleware/           # auth JWT, roles, upload multer, erros
    sockets/              # socket.io (join, message:send, typing, presence)
    db/                   # schema (14 tabelas), seed, client
  tests/                  # vitest + supertest, globalSetup (push+truncate)
  uploads/                # fotos locais (gitignored)
frontend/
  src/
    api/                  # axios client + 1 módulo por domínio
    context/              # AuthContext (JWT, /me no arranque)
    hooks/                # useProfessionals, useSocket
    components/           # TabBar, AppShell, Splash, cards, bubbles
    pages/                # Landing, Login
    pages/app/            # Home, Search, Profile, Chat, Requests, Plans, ...
    styles/               # tokens.css, landing.css
docs/                     # situation, stack, fluxo, contexto + spec/plano
```

## Comandos

```bash
# na raiz (ambos os packages)
npm run lint
npm run typecheck
npm test

# backend
npm test          # 91 testes (vitest + supertest, bd de testes isolada)
npm run lint      # eslint
npm run typecheck # tsc --noEmit
npm run db:push   # sincroniza schema com a bd dev
npm run seed      # dados de demonstração (idempotente)

# frontend
npm test          # 38 testes (vitest + testing-library + jsdom)
npm run lint      # oxlint
npm run typecheck # tsc -b
npm run build     # produção
```

## Pontos de entrada da API

Todas as respostas seguem `{ data }` / `{ error: { message, code } }`
(listagens incluem `meta`). Base: `http://localhost:3001/api`

- `GET /health` — healthcheck (público)
- `POST /auth/register` `POST /auth/login` `GET /auth/me`
- `GET /professionals` (filtros `q`, `category`(**nome**), `bairro`, `sort`,
  `page`, `limit`) `GET /professionals/:id`
- `GET /favorites` `POST /favorites/:id/toggle`
- `POST /requests` `GET /requests` `POST /requests/:id/offers`
  `POST /offers/:id/accept|decline`
- `GET /conversations` `POST /conversations`
  `GET|POST /conversations/:id/messages`
- `POST /reviews` · `GET /plans` · `POST|GET /payments` `POST /payments/:id/confirm`
- `GET /dashboard` · `PUT /profile` `POST /profile/photos` `DELETE /profile/photos/:id`
- `GET /notifications` `POST /notifications/read`
- `GET /categories` `GET /bairro` (meta pública)

Documentação completa: `docs/superpowers/specs/2026-11-14-biscate-design.md`.

## Docs

- `docs/situation.md` — estado final, o que foi verificado, known gaps
- `docs/stack.md` — tecnologias e porquê
- `docs/fluxo.md` — fluxos principais da app
- `docs/contexto.md` — o que está feito e o que vem a seguir
