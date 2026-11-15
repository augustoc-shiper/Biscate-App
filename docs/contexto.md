# Contexto

## Feito (por milestone)

### M1 — Fundação (Tasks 1-4)
- Monorepo `backend/ frontend/ docs/` com scripts agregados na raiz.
- Schema Drizzle com **14 tabelas** (users, professional_profiles, categories,
  bairro, favorites, requests, offers, conversations, messages, reviews,
  plans, payments, notifications, work_photos) + índices e enums.
- Seed com os dados do protótipo: 8 categorias, 6 bairros, 6 profissionais
  (avaliações, fotos, distâncias, planos), 3 clientes, pedidos, propostas,
  conversas com mensagens, notificações e pagamentos.
- App Express: CORS, JSON, `/uploads` estático, 404+error handler com
  `{ error: { message, code } }`, `GET /api/health`.

### M2 — API core (Tasks 5-14)
- Auth JWT: register/login/me, bcrypt, papéis `client`/`professional`.
- Profissionais: listagem paginada com `q`, `category`(nome), `bairro`,
  `sort` (rating/distance/price), detalhe com trabalhos e avaliações.
- Favoritos (toggle), pedidos + propostas com aceitação transaccional e
  regra de plano activo (`NO_ACTIVE_PLAN`).
- Conversas REST + Socket.IO: handshake com token, rooms, `message:send`
  com ack, `typing`, presença online/offline, notificação inline.
- Avaliações com recálculo de média transaccional.
- Planos/pagamentos simulados (entidade `90210`, referência única,
  confirm idempotente + `plan_expires_at`).
- Dashboard (`visitas`, `contactos`, `ratingAvg`, `plan.daysLeft`,
  propostas pendentes), `PUT /profile` (merge parcial), upload de fotos
  (máx. 6, 5MB, jpg/png/webp), notificações (lista com `meta.unread`, read).

### M3 — Frontend base (Tasks 15-17)
- Vite + React 19 + TS, vitest/jsdom, tokens CSS, `MotionConfig`.
- axios client com interceptor de token e 401, `AuthContext`, `ProtectedRoute`.
- Login/registo com tabs ARIA, validação inline e erros da API.
- Shell: splash animada (2,2s), header com sino, TabBar por papel.

### M4 — Páginas da app (Tasks 18-21)
- Home, pesquisa (URL-driven), perfil do profissional com favoritos.
- Chat: lista, sala, socket, typing, bolhas de texto/citação/avaliação.
- Pedidos (cliente: publicar + aceitar/recusar propostas) e planos/
  pagamento com ecrã "Plano activado".
- Dashboard do profissional (stats, barra de plano, tabs, propostas),
  Notificações (marca como lidas ao abrir), Me (badge de não lidas, logout),
  EditProfile (bio/preço/categoria/bairro/fotos).

### M5 — Landing + docs (Tasks 22-23)
- Landing 1:1 com o protótipo (hero com padrão + ilustração, problema,
  como funciona, dois públicos, planos, FAQ com 5 `details`, CTA) com
  motion `whileInView` e stagger.
- Documentação: `readme.md`, `docs/{situation,stack,fluxo,contexto}.md`.

## A seguir

- **Gateway de pagamento real** (Multicaixa Express / EMIS / referência
  verdadeira) substituindo o confirm manual — mantendo a idempotência.
- **OAuth / SMS**: login por telefone (+244) e verificação de BI para o selo
  Verificado (hoje é estático no seed).
- **Deploy**: Dockerfile, Postgres gerido, CDN para `uploads/` (ou S3),
  `JWT_SECRET`/`CORS_ORIGIN` obrigatórios em env.
- **i18n**: textos em pt-AO com Extract/Mistral (ensako/kimbundu na landing).
- **Paginação real no chat/notificações** (limit 100 fixo), histórico de
  conversas no socket com replay.
- **Android/i18n PWA**: manifest + service worker (o protótipo era mobile-first).
- **Moderación/segurança**: rate limiting, scan de fotos, aprovação de perfis.
