# Biscate Full-Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o protótipo estático do Biscate numa aplicação web real (Express + Drizzle + Postgres no backend, Vite + React no frontend) com todas as features do protótipo.

**Architecture:** Backend em camadas clássicas (`routes → DTO zod → controllers → services → drizzle`), REST em `/api` com Socket.IO para chat. Frontend SPA única (landing `/`, app `/app/*`) com camadas leves (`api/context/hooks/pages/components`). Commits por feature.

**Tech Stack:** Node 26, TypeScript, Express 5, Drizzle ORM + node-postgres, Socket.IO, JWT (jsonwebtoken), bcryptjs, zod, multer, vitest + supertest; React 18, Vite, react-router-dom 6, axios, motion, lucide-react, vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-14-biscate-design.md`

## Global Constraints

- IDs: UUID (`gen_random_uuid()`) para todas as tabelas excepto `categories`, `bairro`, `plans` (serial int).
- Respostas API: sucesso `{ data: ... }`; erro `{ error: { message, code } }` — código em MAIÚSCULAS (ex. `VALIDATION_ERROR`, `UNAUTHORIZED`).
- Portas: backend `3001`, frontend `5173`. CORS origin `http://localhost:5173` (env `CORS_ORIGIN`).
- DATABASE_URL dev: `postgres:///biscate?host=/run/postgresql`; testes: `postgres:///biscate_test?host=/run/postgresql` (env `DATABASE_URL`, `DATABASE_URL_TEST`). Auth por socket, utilizador do OS.
- JWT: env `JWT_SECRET` (default dev `biscate-dev-secret`), expiração 7 dias, header `Authorization: Bearer <token>`.
- Senhas: bcryptjs, 10 rounds. Credenciais seed: `cliente@biscate.ao` e `profissional@biscate.ao`, senha `biscate123`.
- Valores em Kwanza: inteiros (`price_kz`). Textos da UI em português de Angola.
- Pesquisa pública só devolve profissionais com `plan_expires_at > now()`.
- Uploads em `backend/uploads/` (gitignore), servidos em `GET /uploads/:file`.
- `prefers-reduced-motion` respeitado no frontend. Sem Docker.
- Cada task termina com commit conventional (`feat:`, `test:`, `docs:`, `chore:`).
- Lint: `npm run lint` e typecheck `npm run typecheck` em `backend/` e `frontend/` passam no fim de cada task que toque nesses projectos.

## Review Focus

1. **Guardas de auth em endpoints protegidos** — endpoints sem token devem dar 401 com `UNAUTHORIZED`; expirado igual. Teste: `auth.middleware.test.ts` (Task 5) + chamada sem token em cada task protegida.
2. **Ownership** — um utilizador não lê/escreve conversas ou pedidos de outro (403 `FORBIDDEN`). Teste: `requests.test.ts` (Task 8) e `conversations.test.ts` (Task 9) com utilizador A a aceder a recurso de B.
3. **Gate de plano** — profissional sem plano activo não aparece na listagem pública; com plano activo aparece. Teste: `professionals.test.ts` (Task 6).
4. **Socket handshake e persistência** — ligação sem/expirado token rejeitada; mensagem enviada via socket persiste exactamente uma vez e chega à sala. Teste: `socket.test.ts` (Task 10).
5. **Activar plano idempotente** — confirmar pagamento duas vezes não duplica dias. Teste: `payments.test.ts` (Task 12).

---

### Task 1: Scaffold do monorepo

**Files:**
- Create: `package.json` (raiz, scripts `dev`, `lint`, `typecheck`, `test`), `backend/package.json`, `backend/tsconfig.json`, `backend/.eslintrc` (flat `eslint.config.js`), `backend/.env.example`, `frontend/` (via `npm create vite@latest frontend -- --template react-ts`), `.gitignore` (já existe — ampliar se preciso)

**Interfaces:**
- Produz: estrutura onde as tasks seguintes criam `backend/src/**` e `frontend/src/**`.

- [ ] **Step 1: Criar `backend/` à mão** — `npm init -y` em `backend/`; instalar deps: `express@^5 zod jsonwebtoken bcryptjs cors drizzle-orm pg socket.io multer` e dev `typescript tsx vitest supertest @types/* drizzle-kit @vitest/coverage-v8 eslint typescript-eslint`; `tsconfig.json` com `strict`, `module: nodenext`, `outDir: dist`.
- [ ] **Step 2: Scripts backend** — `dev` (`tsx watch src/server.ts`), `build` (`tsc`), `start`, `test` (`vitest run`), `lint` (`eslint src tests`), `typecheck` (`tsc --noEmit`), `db:push` (`drizzle-kit push`), `seed` (`tsx src/db/seed.ts`).
- [ ] **Step 3: Criar frontend com Vite** — `npm create vite@latest frontend -- --template react-ts`; instalar `react-router-dom axios motion lucide-react` e dev `vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom eslint typescript-eslint`; scripts `dev`, `build`, `test` (`vitest run`), `lint`, `typecheck`.
- [ ] **Step 4: Verificar** — `backend: npm run typecheck && npm test` (passa sem testes) e `frontend: npm run build` OK.
- [ ] **Step 5: Commit** — `chore: scaffold monorepo (backend express+drizzle, frontend vite+react)`

### Task 2: Schema Drizzle + migrations

**Files:**
- Create: `backend/src/db/schema.ts`, `backend/src/db/client.ts`, `backend/drizzle.config.ts`, `backend/tests/setup.ts`
- Test: `backend/tests/schema.test.ts`

**Interfaces:**
- Produz: tabelas nomeadas exactamente como no spec §4; exports `db` (drizzle instance), `pool`; todos os selects/inserts das tasks seguintes usam estes nomes (`users`, `professionalProfiles`, `categories`, `bairro`, `workPhotos`, `favorites`, `requests`, `offers`, `conversations`, `messages`, `reviews`, `plans`, `payments`, `notifications`).

- [ ] **Step 1: Escrever teste falhando** — `schema.test.ts`: `beforeAll` faz `drizzle-kit push`/migracao do `DATABASE_URL_TEST` + `SELECT 1`; `it('tem as 13 tabelas')` conta `information_schema.tables` onde table_schema='public' e espera 13 (após seed haverá mais? não — 13 tabelas exactas do spec §4); `it('gen_random_uuid como default')` insere user sem id e espera uuid.
- [ ] **Step 2: Correr e falhar** — `cd backend && npm test` → FAIL (ficheiros não existem).
- [ ] **Step 3: Implementar schema** — `schema.ts` com as 13 tabelas do spec §4 (pgTable, uuid pk default `sql`gen_random_uuid()``, timestamps `created_at` default now()); `professional_profiles` inclui também `price_min integer` (para `sort=price`; `price_text` é só display) e `distance_km integer`; `client.ts` cria `Pool` com `DATABASE_URL ?? DATABASE_URL_TEST`; `drizzle.config.ts` dialect postgresql, url do env.
- [ ] **Step 4: Correr teste** — `npm test` → PASS.
- [ ] **Step 5: Push dev + Commit** — `npm run db:push`; `git add -A && git commit -m "feat: schema drizzle com as 13 tabelas"`.

### Task 3: Seed com dados do protótipo

**Files:**
- Create: `backend/src/db/seed.ts`
- Test: `backend/tests/seed.test.ts`

**Interfaces:**
- Produz: 8 categorias (Pedreiro, Electricista, Canalizador, Costura, Limpeza, Mudanças, Explicações, Pintura), 6 bairros (Maianga, Talatona, Viana, Cazenga, Kilamba, Rangel), 4 planos (3 dias/500, 1 semana/1000, 1 mês/3000 highlight, 1 ano/30000), 6 profissionais do protótipo (nomes/notas/preços/bairros do spec §8, verified: Manuel, Teresa, Joaquim, Esperança), 2 clientes + 1 profissional de login, conversas/mensagens exemplo, 1 pedido com 2 propostas, favoritos, notificações, 1 pagamento confirmado. Idempotente (upsert por email/nome).

- [ ] **Step 1: Teste falhando** — `seed.test.ts`: chama `seed(db)` sobre `DATABASE_URL_TEST` limpo; asserts: `categories=8`, `bairro=6`, `plans=4`, `professionalProfiles=6`, `users>=9`, existe `jose@...`? Não — existe user com email `profissional@biscate.ao` e `planExpiresAt > now()` nele; existe payment `confirmed`.
- [ ] **Step 2: Correr → FAIL.**
- [ ] **Step 3: Implementar `seed.ts`** — função `export async function seed(db)` com dados copiados do protótipo (`Biscate-App/biscate/app/index.html` linhas 86-96 para P, SV, PL); script CLI corre contra `DATABASE_URL`.
- [ ] **Step 4: `npm test` → PASS; `npm run seed` no dev OK.**
- [ ] **Step 5: Commit** — `feat: seed com dados do protótipo`.

### Task 4: Core do backend (app, erros, health)

**Files:**
- Create: `backend/src/app.ts`, `backend/src/server.ts`, `backend/src/middleware/error.ts`, `backend/src/lib/AppError.ts`, `backend/src/lib/respond.ts`
- Test: `backend/tests/health.test.ts`

**Interfaces:**
- Produz: `createApp()` devolve Express app (cors com `CORS_ORIGIN`, `express.json()`, monta rotas em `/api`, handler 404 e `errorHandler`); `AppError(message, status, code)`; `ok(res, data)` → `{ data }`, `fail` tratado pelo errorHandler. Tasks seguintes: `import { ok } from '../lib/respond'`.

- [ ] **Step 1: Teste falhando** — `health.test.ts`: `GET /api/health` → 200 `{ data: { status: 'ok' } }`; `GET /api/rota-inexistente` → 404 `{ error: { message, code: 'NOT_FOUND' } }`; `POST /api/health` body inválido JSON? (skip) — errorHandler devolve 500 `{ error: { code: 'INTERNAL' } }` para exceção lançada numa rota de teste montada no mesmo app.
- [ ] **Step 2: Correr → FAIL.**
- [ ] **Step 3: Implementar** os 5 ficheiros.
- [ ] **Step 4: `npm test` → PASS.**
- [ ] **Step 5: Commit** — `feat: app express, middleware de erro e healthcheck`.

### Task 5: Auth (register/login/me) + JWT middleware

**Files:**
- Create: `backend/src/routes/auth.routes.ts`, `backend/src/controllers/auth.controller.ts`, `backend/src/services/auth.service.ts`, `backend/src/dto/auth.dto.ts`, `backend/src/middleware/auth.ts`, `backend/src/lib/jwt.ts`
- Test: `backend/tests/auth.test.ts`, `backend/tests/auth.middleware.test.ts`

**Interfaces:**
- Produz: `POST /api/auth/register` body `{name,email,password,role:'client'|'professional',phone?}` → 202? Não → **201** `{data:{user,token}}`; duplicado → 409 `EMAIL_TAKEN`. `POST /api/auth/login` `{email,password}` → 200 `{data:{user,token}}`; erro → 401 `INVALID_CREDENTIALS`. `GET /api/auth/me` (auth) → `{data:user}`. `requireAuth` middleware: `req.user = { id, role }`. DTOs zod: `RegisterDto`, `LoginDto`. `signToken({id,role})`, `verifyToken(token)`.

- [ ] **Step 1: Testes falhando** — `auth.test.ts`: registar cliente 201 sem password no response; email repetido 409 `EMAIL_TAKEN`; login ok 200 com token; password errada 401; login inexistente 401. `auth.middleware.test.ts`: sem header → 401 `UNAUTHORIZED`; token inválido → 401; token expirado (expiração -1s) → 401; válido → 200 e `req.user.id` preenchido (rota espelho `/api/auth/me`).
- [ ] **Step 2: Correr → FAIL.**
- [ ] **Step 3: Implementar** com bcryptjs (`hash`/`compare`), jwt `sign/verify`, tabela `users`.
- [ ] **Step 4: `npm test` → PASS.**
- [ ] **Step 5: Commit** — `feat: auth jwt (register, login, me)`.

### Task 6: Listagem e detalhe de profissionais

**Files:**
- Create: `backend/src/routes/professionals.routes.ts`, `backend/src/controllers/professionals.controller.ts`, `backend/src/services/professionals.service.ts`, `backend/src/dto/professionals.dto.ts`
- Test: `backend/tests/professionals.test.ts`

**Interfaces:**
- Produz: `GET /api/professionals?category=&bairro=&q=&sort=rating|distance|price&page=1&limit=20` → `{data:[{id,name,category,bairro,ratingAvg,ratingCount,priceText,verified,availableToday,distanceKm,avatarUrl}], meta:{total,page,limit}}`; `GET /api/professionals/:id` → `{data:{...perfil, bio, phone?, workPhotos:[], reviews:[...]}}`; `GET /api/categories`, `GET /api/bairro`. Query zod com defaults. Ordenação: rating desc, distance asc, price asc (price extraído de coluna `price_min` numeric no profile — **novo**: adicionar `price_min` ao schema na Task 2? Spec tem só `price_text` — ordenar por `price_min`: adicionar coluna `price_min integer` ao profile no Task 2 e seed).

- [ ] **Step 1: Teste falhando** — `professionals.test.ts` (com seed mínimo do test db): lista com plano activo → 200 e só profissionais com plano activo (criar 1 profile sem plano e excluir do result); filtro `?category=Pedreiro` → todos Pedreiro; `?bairro=Cazenga`; `?q=manuel` → matches; `sort=rating` ordena desc; `meta.total` correcto; `/:id` 200 com `reviews` array; id inexistente → 404 `NOT_FOUND`; `GET /api/categories` → 8.
- [ ] **Step 2: Correr → FAIL.**
- [ ] **Step 3: Implementar** (join `professionalProfiles` + `users` + `categories` + `bairro`, filtro por `planExpiresAt > now()`).
- [ ] **Step 4: `npm test` → PASS.**
- [ ] **Step 5: Commit** — `feat: listagem e detalhe de profissionais com filtros`.

### Task 7: Favoritos

**Files:**
- Create: `backend/src/routes/favorites.routes.ts`, `backend/src/services/favorites.service.ts`, `backend/src/dto/favorites.dto.ts`
- Test: `backend/tests/favorites.test.ts`

**Interfaces:**
- Produz: `POST /api/favorites/:professionalId` (auth) → `{data:{favorite:boolean}}` (toggle); `GET /api/favorites` (auth) → `{data:[profissionais como listagem]}`.

- [ ] **Step 1: Teste falhando** — sem token 401; toggle primeiro true, segundo false; GET devolve só os favoritados; profissional inexistente 404.
- [ ] **Step 2: Correr → FAIL.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: PASS → Commit** `feat: favoritos toggle e listagem`.

### Task 8: Pedidos (requests) e propostas (offers)

**Files:**
- Create: `backend/src/routes/requests.routes.ts`, `backend/src/services/requests.service.ts`, `backend/src/dto/requests.dto.ts`
- Test: `backend/tests/requests.test.ts`

**Interfaces:**
- Produz: `POST /api/requests` (client) `{categoryId,description,bairroId,when:'today'|'week'|'flexible'}` → 201 pedido; `GET /api/requests` (client, próprios, com `offers` aninhadas) → `{data:[...]}`; `POST /api/requests/:id/offers` (professional, plano activo) `{price,message}` → 201 offer; `POST /api/offers/:id/accept|decline` (client dono) → offer actualizada; accept move request para `in_conversation` e cria/activa conversa entre client e professional. 403 se não dono; 403 se profissional sem plano (`NO_ACTIVE_PLAN`).

- [ ] **Step 1: Teste falhando** — criar pedido 201; listar só os meus; profissional com plano oferece 201; sem plano 403 `NO_ACTIVE_PLAN`; outro client aceita 403; accept 200 muda status; request 404 inexistente.
- [ ] **Step 2: Correr → FAIL.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: PASS → Commit** `feat: pedidos e propostas com aceitação`.

### Task 9: Conversas e mensagens (REST)

**Files:**
- Create: `backend/src/routes/conversations.routes.ts`, `backend/src/services/conversations.service.ts`, `backend/src/dto/conversations.dto.ts`
- Test: `backend/tests/conversations.test.ts`

**Interfaces:**
- Produz: `POST /api/conversations` (auth) `{professionalId}` → 201 (reutiliza existente se houver); `GET /api/conversations` → lista com peer, lastMessage, unreadCount; `GET /api/conversations/:id/messages?before=` → `{data:[...], meta}`; `POST /api/conversations/:id/messages` `{body?,kind:'text'|'image'|'quote'|'rating',payload?}` → 201 message. Só participantes (403 caso contrário). Marca `read_at` do peer ao GET messages. Funções de service exportadas e reutilizadas pelo Socket (Task 10): `sendMessage(db, {conversationId, senderId, body, kind, payload})`, `listMessages`, `ensureConversation`.

- [ ] **Step 1: Teste falhando** — criar conversa 201; segunda vez devolve a mesma (200/201 com mesmo id); enviar mensagem 201 com `createdAt`; participante B vê mensagens; não-participante 403; GET marca lidas (`unreadCount` do B passa a 0).
- [ ] **Step 2: Correr → FAIL.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: PASS → Commit** `feat: conversas e mensagens rest`.

### Task 10: Socket.IO (chat em tempo real)

**Files:**
- Create: `backend/src/sockets/index.ts`, modificar `backend/src/server.ts` (http server + io)
- Test: `backend/tests/socket.test.ts`

**Interfaces:**
- Produz: `createSocketServer(httpServer, {corsOrigin})`; handshake `socket.handshake.auth.token` (jwt) → `socket.data.user`; eventos: client→server `conversation:join {conversationId}` (só participante), `message:send {conversationId, body, kind?, payload?}` → persiste via `sendMessage` e emite `message:new` para sala `conversation:<id>` (inclui remetente) com ack `(err, message)`; `typing {conversationId, isTyping}` → `typing:state` para sala; emite `presence:{userId:true|false}` na join/leave. Cria `notifications` row se peer offline.

- [ ] **Step 1: Teste falhando** — `socket.test.ts` com `io(URL, {auth:{token}})`: sem token liga e é desconectado (`connect_error`); com token de A em conversa de A consegue join; B (participante) recebe `message:new` quando A envia; mensagem persiste (conta 1 na db); ack devolve message com id; não-participante join → erro ack; typing chega ao par.
- [ ] **Step 2: Correr → FAIL.**
- [ ] **Step 3: Implementar** ligando `server.ts` a `createApp()` + `http.createServer` + `createSocketServer`.
- [ ] **Step 4: PASS → Commit** `feat: socket.io chat em tempo real`.

### Task 11: Avaliações (reviews)

**Files:**
- Create: `backend/src/routes/reviews.routes.ts`, `backend/src/services/reviews.service.ts`, `backend/src/dto/reviews.dto.ts`
- Test: `backend/tests/reviews.test.ts`

**Interfaces:**
- Produz: `POST /api/reviews` (auth) `{conversationId, stars:1-5, comment?}` → 201 review; só client participante e uma review por conversa (409 `REVIEW_EXISTS`); transacção: insert review + recalcular `rating_avg`/`rating_count` do professional. Também emite sistema message `kind:'rating'` na conversa.

- [ ] **Step 1: Teste falhando** — client cria 201; profile `rating_avg`/`rating_count` actualizados; segunda review 409; stars 0 → 400 `VALIDATION_ERROR`; profissional tenta avaliar 403.
- [ ] **Step 2: Correr → FAIL.**
- [ ] **Step 3: Implementar (transacção drizzle).**
- [ ] **Step 4: PASS → Commit** `feat: avaliações com actualização de nota`.

### Task 12: Planos e pagamentos simulados

**Files:**
- Create: `backend/src/routes/payments.routes.ts`, `backend/src/services/payments.service.ts`, `backend/src/dto/payments.dto.ts`
- Test: `backend/tests/payments.test.ts`

**Interfaces:**
- Produz: `GET /api/plans` (público) → 4 planos; `POST /api/payments` (professional) `{planId}` → 201 `{entity:'90210', reference:<9 dígitos>, amountKz, status:'pending'}`; `POST /api/payments/:id/confirm` (dono) → activa: `plan_expires_at = max(now, actual) + days`; idempotente (2ª confirmação não soma — devolve 200 e não altera se já confirmed); `GET /api/payments` → histórico.

- [ ] **Step 1: Teste falhando** — plans 4; payment 201 com entity `90210` e reference único; confirm 200 `plan_expires_at ≈ now+days`; confirm 2ª vez não muda `plan_expires_at`; confirm de payment alheio 403.
- [ ] **Step 2: Correr → FAIL.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: PASS → Commit** `feat: planos e pagamentos simulados por referência`.

### Task 13: Painel, edição de perfil e uploads

**Files:**
- Create: `backend/src/routes/dashboard.routes.ts`, `backend/src/routes/profile.routes.ts`, `backend/src/middleware/upload.ts`, modificar `backend/src/app.ts` (montar `express.static('uploads')` em `/uploads`)
- Test: `backend/tests/dashboard.test.ts`, `backend/tests/profile.test.ts`

**Interfaces:**
- Produz: `GET /api/dashboard` (professional) → `{visitas, contactos, ratingAvg, plan:{active,daysLeft}, pendingOffers:[...]}` (visitas = `visits_count` do profile, actualiza +1 quando? não — seed/mock; contactos = nº de conversas); `PUT /api/profile` `{bio, priceText, categoryId, bairroId, availableToday, responseTime}` → profile; `POST /api/profile/photos` (multipart `photo`, máx 5MB, jpg/png/webp) → 201 `{url:'/uploads/<uuid>.<ext>'}` (máx 6 fotos); `DELETE /api/profile/photos/:id` (dono). Serve estático em `/uploads`.

- [ ] **Step 1: Testes falhando** — dashboard 200 com `plan.daysLeft` número; PUT actualiza; POST photo com multer grava ficheiro e row; photo >5MB 400; DELETE ok; cliente (role client) em dashboard 403.
- [ ] **Step 2: Correr → FAIL.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: PASS → Commit** `feat: dashboard, edição de perfil e upload de fotos`.

### Task 14: Notificações

**Files:**
- Create: `backend/src/routes/notifications.routes.ts`, `backend/src/services/notifications.service.ts`
- Test: `backend/tests/notifications.test.ts`

**Interfaces:**
- Produz: `GET /api/notifications` (auth) → `{data:[{id,kind,body,readAt,createdAt}], meta:{unread}}`; `POST /api/notifications/read` `{ids?:[]}` (vazio = todas) → `{data:{updated:n}}`. Helper `notify(db, userId, kind, body)` usado por Task 10.

- [ ] **Step 1: Teste falhando** — criar via helper, GET lista, unread conta, mark all → unread 0.
- [ ] **Step 2: Correr → FAIL.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: PASS → Commit** `feat: notificações`.

### Task 15: Frontend base (shell, api client, auth context)

**Files:**
- Create: `frontend/src/api/client.ts`, `frontend/src/api/auth.api.ts`, `frontend/src/context/AuthContext.tsx`, `frontend/src/components/ProtectedRoute.tsx`, `frontend/src/main.tsx`, `frontend/src/App.tsx` (rotas), `frontend/src/styles/tokens.css`
- Test: `frontend/src/context/AuthContext.test.tsx`, `frontend/src/api/client.test.ts`

**Interfaces:**
- Produz: `apiClient` (axios instance, baseURL `http://localhost:3001/api`, interceptor que injecta `Authorization` de `localStorage.token` e trata 401 → logout); `AuthContext` `{user, token, login(email,password), register(data), logout, loading}`; `ProtectedRoute` redireciona para `/login` sem token; rotas declaradas em `App.tsx` (páginas placeholder `Home` etc. — páginas concretas nas tasks seguintes). `tokens.css`: variáveis `--red:#C8102E; --gold:#F7B500; --ink:#111; --fl:#F3F3F3; --mu:#5E5E5E; --ln:#E8E8E8` + fonte Inter (system fallback).

- [ ] **Step 1: Testes falhando** — `AuthContext.test.tsx`: `login` guarda token no localStorage e user no state (mock axios); `logout` limpa; `client.test.ts`: interceptor adiciona header (mock adapter). **Nota:** `vitest` + jsdom + setup com `@testing-library/jest-dom`.
- [ ] **Step 2: Correr → FAIL.**
- [ ] **Step 3: Implementar** + rotas placeholder em `App.tsx` (todas as rotas do spec §7 com componentes vazios `export default function X(){return null}` — só para o shell compilar).
- [ ] **Step 4: `npm test` → PASS; `npm run build` OK.**
- [ ] **Step 5: Commit** — `feat: frontend base (rotas, api client, auth context)`.

### Task 16: Página de login/registo

**Files:**
- Create: `frontend/src/pages/Login.tsx`, `frontend/src/components/MotionPage.tsx` (wrapper motion fade/slide)
- Test: `frontend/src/pages/Login.test.tsx`

**Interfaces:**
- Consome: `AuthContext.login/register`. Produz: formulário com tabs Entrar/Criar conta (nome, email, senha, escolha cliente/profissional no registo), erros de validação inline, botão com estado loading; após login → `/app`; visual do protótipo (hero vermelho com padrão + logo).

- [ ] **Step 1: Teste falhando** — renderiza "Entrar"/"Criar conta"; submeter com email inválido mostra erro; `login` chamado com valores do form (mock do contexto); erro de API mostra mensagem.
- [ ] **Step 2: Correr → FAIL.**
- [ ] **Step 3: Implementar com `MotionPage`.**
- [ ] **Step 4: PASS → Commit** `feat: página de login e registo`.

### Task 17: Shell da app (splash, tabs, header)

**Files:**
- Create: `frontend/src/components/TabBar.tsx`, `frontend/src/components/AppShell.tsx`, `frontend/src/components/Splash.tsx`, `frontend/src/pages/app/Placeholder.tsx` (remover placeholders → páginas reais tasks 18-21)
- Test: `frontend/src/components/TabBar.test.tsx`

**Interfaces:**
- Produz: `AppShell` envolve rotas `/app/*` com header (logo, sino→`/app/me`), `TabBar` com tabs por role (cliente: Início/Mensagens/Pedidos/Perfil; profissional: Painel/Mensagens/Plano/Perfil — ícones lucide `Home, MessageCircle, ListTodo, User, LayoutDashboard, Tag`), activa por `useLocation`; `Splash` full-screen vermelho com logo + tagline "O seu kamba para qualquer biscate.", sai com fade após 2,2s (motion, pula se `prefers-reduced-motion`).

- [ ] **Step 1: Teste falhando** — TabBar renderiza 4 tabs do cliente; tab activa tem destaque; splash desaparece (timer fake) chamando `onDone`.
- [ ] **Step 2: Correr → FAIL.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: PASS → Commit** `feat: shell da app com splash e tabs`.

### Task 18: Home, pesquisa e perfil do profissional

**Files:**
- Create: `frontend/src/pages/app/Home.tsx`, `frontend/src/pages/app/Search.tsx`, `frontend/src/pages/app/Profile.tsx`, `frontend/src/api/professionals.api.ts`, `frontend/src/hooks/useProfessionals.ts`, `frontend/src/components/ProfessionalCard.tsx`, `frontend/src/components/StarRating.tsx`
- Test: `frontend/src/pages/app/Search.test.tsx`, `frontend/src/components/ProfessionalCard.test.tsx`

**Interfaces:**
- Consome: `GET /professionals`, `/categories`, `/bairro`, `/professionals/:id`, `POST /favorites/:id`. Home: saudação, grid de 8 categorias, card vermelho promocional, "Mais bem avaliados" (horizontal scroll), chips de bairro, lista. Search: chips categoria + input q + ordenação + lista com `motion` stagger. Profile: capa, avatar, stats, tabs Sobre/Trabalhos/Avaliações, botões Conversar (→ `/app/chat/nova?professionalId=`) e favorito (toggle optimista).

- [ ] **Step 1: Testes falhando** — Search: digitar no input filtra (mock api), chips mudam resultado, lista mostra nomes; ProfessionalCard mostra nome, nota, verified badge, preço.
- [ ] **Step 2: Correr → FAIL.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: PASS → Commit** `feat: home, pesquisa e perfil de profissional`.

### Task 19: Chat UI (lista + conversa + socket + avaliação)

**Files:**
- Create: `frontend/src/pages/app/ChatList.tsx`, `frontend/src/pages/app/ChatRoom.tsx`, `frontend/src/api/chat.api.ts`, `frontend/src/hooks/useSocket.ts`, `frontend/src/components/MessageBubble.tsx`, `frontend/src/components/QuoteCard.tsx`
- Test: `frontend/src/pages/app/ChatRoom.test.tsx`, `frontend/src/hooks/useSocket.test.ts`

**Interfaces:**
- Consome: `GET /conversations`, `/:id/messages`, `POST` message; socket.io-client ligado a `http://localhost:3001` com `auth:{token}`; eventos do Task 10. `ChatRoom`: mensagens, input com botão enviar, typing indicator, quick-chips ("Quanto custa?", "Pedir orçamento" → bubble quote), ao receber `kind:'rating'` mostrar StarRating e submeter `POST /reviews`. Transição `AnimatePresence` nas mensagens.

- [ ] **Step 1: Testes falhando** — ChatRoom renderiza mensagens do mock; enviar adiciona bubble do utilizador e chama api; useSocket liga com token do localStorage (mock socket.io-client); erro de envio mostra toast de erro.
- [ ] **Step 2: Correr → FAIL.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: PASS → Commit** `feat: interface de chat em tempo real`.

### Task 20: Pedidos e planos/pagamentos (UI)

**Files:**
- Create: `frontend/src/pages/app/Requests.tsx`, `frontend/src/pages/app/NewRequest.tsx`, `frontend/src/pages/app/Plans.tsx`, `frontend/src/pages/app/Payment.tsx`, `frontend/src/api/requests.api.ts`, `frontend/src/api/payments.api.ts`
- Test: `frontend/src/pages/app/Requests.test.tsx`, `frontend/src/pages/app/Plans.test.tsx`

**Interfaces:**
- Consome endpoints Tasks 8 e 12. Requests: lista activos/concluídos com pills de estado, botão "Publicar pedido" → NewRequest (chips categoria, textarea, bairro, quando, submit). Plans: 4 planos (destaque "Mais escolhido"), seleccionar → Continuar → Payment com entidade/referência geradas, botão "Já paguei" → confirm → ecrã "Plano activado" (motion check).

- [ ] **Step 1: Testes falhando** — Requests mostra estados do mock e submeter NewRequest chama api com payload correcto; Plans selecciona plano e Payment mostra `90210` e reference; "Já paguei" chama confirm.
- [ ] **Step 2: Correr → FAIL.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: PASS → Commit** `feat: ui de pedidos, planos e pagamento`.

### Task 21: Painel do profissional + perfil do utilizador + notificações

**Files:**
- Create: `frontend/src/pages/app/Dashboard.tsx`, `frontend/src/pages/app/Me.tsx`, `frontend/src/pages/app/Notifications.tsx`, `frontend/src/pages/app/EditProfile.tsx`, `frontend/src/api/dashboard.api.ts`, `frontend/src/api/notifications.api.ts`
- Test: `frontend/src/pages/app/Dashboard.test.tsx`, `frontend/src/pages/app/Me.test.tsx`

**Interfaces:**
- Consome Tasks 13, 14. Dashboard: card de plano (activo com dias restantes + barra / expirado com CTA Escolher plano), tabs Resumo/Estatísticas (gráfico de barras CSS), propostas pendentes com aceitar/recusar. Me: dados do user, Favoritos, Notificações (badge com `meta.unread`), Ajuda (details), Terminar sessão, trocar para conta profissional (não implementado — toast "em breve" se role client não tiver profile? na verdade seed tem ambas as contas; trocar = logout+login da outra — manter simples: mostrar conta actual e link para logout). EditProfile: form com bio/preço/categoria/bairro/fotos (upload).

- [ ] **Step 1: Testes falhando** — Dashboard mostra stats e estado do plano (mock); Me chama logout no botão; Notifications marca como lidas ao abrir.
- [ ] **Step 2: Correr → FAIL.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: PASS → Commit** `feat: painel do profissional, perfil e notificações`.

### Task 22: Landing page + polimento de motions

**Files:**
- Create: `frontend/src/pages/Landing.tsx` (+ secções), `frontend/src/styles/landing.css`
- Test: `frontend/src/pages/Landing.test.tsx`

**Interfaces:**
- Conteúdo estático do protótipo `Biscate-App/biscate/index.html` (hero com padrão e ilustração SVG, problema, como funciona, clientes/profissionais, planos, FAQ, CTA) — SVGs copiados. CTAs: "Experimentar a app" → `/login`. Motion: fade/slide de secções ao entrar na viewport (`whileInView`), stagger nos cards.

- [ ] **Step 1: Teste falhando** — renderiza h1 "Encontre quem resolve. Ou seja quem resolve."; 8 categorias? (não — landing não tem categorias); FAQ tem 5 `details`; botão CTA navega para `/login`.
- [ ] **Step 2: Correr → FAIL.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: PASS → Commit** `feat: landing page com motions`.

### Task 23: Documentação final + verificação

**Files:**
- Create: `readme.md`, `docs/situation.md`, `docs/contexto.md`, `docs/stack.md`, `docs/fluxo.md`

- [ ] **Step 1: readme.md** — o que é, pré-requisitos (Node 26, Postgres 18), setup (`createdb`, `npm i`, `npm run db:push`, `npm run seed`, `npm run dev`), credenciais seed, estrutura de pastas, comandos (test/lint).
- [ ] **Step 2: docs/stack.md** — tecnologias + versões + porquê (tabela).
- [ ] **Step 3: docs/fluxo.md** — fluxos: registo/login, pesquisa→perfil→chat, pedido→proposta→aceite→avaliação, plano→pagamento→activação.
- [ ] **Step 4: docs/contexto.md** — feito (lista por milestone) + a seguir (gateway real, OAuth, SMS, deploy, i18n).
- [ ] **Step 5: docs/situation.md** — ponto de situação: estado final, comandos verificados, features completas, known gaps.
- [ ] **Step 6: Verificação final** — em `backend/`: `npm run lint && npm run typecheck && npm test`; em `frontend/`: `npm run lint && npm run typecheck && npm test && npm run build`; smoke: subir backend+seed e `curl /api/health`, `/api/profissionais`… (`/api/professionals`). Corrigir o que falhar.
- [ ] **Step 7: Commit** — `docs: readme, situation, contexto, stack e fluxo` (+ fix commits se necessários).

---

## Self-review notes (após escrita)

- **Spec coverage:** §3 backend/frontend → Tasks 1,4,15; §4 dados → 2,3; §5 API → 5-14; §6 socket → 10; §7 rotas → 15-22; §8 seed → 3; §9 erros → 4,5 (+ DTOs em cada task); §10 testes → todos; §11 docs → 23; §12 processo → commits em cada task.
- **Ajuste feito:** adicionada coluna `price_min integer` a `professionalProfiles` (necessária para `sort=price`, o `price_text` é display-only) — reflectido na Task 2/6.
