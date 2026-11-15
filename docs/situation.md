# Situation — estado final

> Data: 14/15 Nov 2026 · Branch: `feat/biscate-fullstack` (30 commits,
> `main` intacta até ao merge final)

## Estado

O Biscate está **funcional de ponta a ponta**: API REST + Socket.IO com
PostgreSQL 18, SPA React 19 com auth, chat em tempo real, pedidos/propostas,
avaliações, planos com pagamento simulado, uploads, notificações, landing e
31 páginas/rotas testadas. Todas as 23 tasks do plano foram executadas com
TDD (teste vermelho → implementar → verde → lint/typecheck → commit).

## Verificação (executada, saída real)

| Verificação | Resultado |
| --- | --- |
| `backend: npm run lint` | **0 erros** (eslint) |
| `backend: npm run typecheck` | **0 erros** |
| `backend: npm test` | **91/91** (15 ficheiros) |
| `frontend: npm run lint` | **0 erros** (oxlint; 2 warnings, ver gaps) |
| `frontend: npm run typecheck` | **0 erros** |
| `frontend: npm test` | **38/38** |
| `frontend: npm run build` | **0 erros** (tsc -b + vite build) |

### Smoke test (backend real a correr + curl)

```
GET  /api/health                          → {"data":{"status":"ok"}}
GET  /api/professionals?limit=2           → 200, dados do seed
GET  /api/professionals?category=Pedreiro → total=1 (Manuel Kiala)
GET  /api/professionals?bairro=Talatona&sort=distance → total=1
GET  /api/professionals?q=joaquim         → total=1 (Joaquim Neto)
GET  /api/professionals/seed-user-joaquim → 200
GET  /api/plans                           → 4 planos (1 mês highlight)
POST /api/auth/login (cliente@biscate.ao) → token JWT
GET  /api/bairro → 6 · GET /api/categories → 8
GET  /api/nao-existe                      → 404 com {error:{message,code}}
```

Nota: `category` no querystring é o **nome** da categoria (`Pedreiro`), não o
id — é assim que a UI consome (Search/Home) e como o backend compara.

## Features completas

- **Auth**: register/login/me, JWT, papéis, sessão persistente, 401 global.
- **Descoberta**: pesquisa com `q`/categoria/bairro/sorteio/paginação,
  detalhe com trabalhos + avaliações, favoritos toggle.
- **Pedidos e propostas**: publicar (cliente), enviar proposta exige plano
  activo, aceitar/recusar com criação de conversa.
- **Chat**: REST + Socket.IO (rooms, ack, typing, presença), bolhas de
  texto/citação/avaliação, criação de conversa via `chat/nova`.
- **Avaliações**: só o dono do pedido, uma vez, com recálculo de média.
- **Planos/pagamentos**: 4 planos, entidade `90210`, referência única,
  confirm idempotente, `plan_expires_at`, ecrã de activação animado.
- **Painel**: stats, barra de dias, tabs (resumo/estatísticas), propostas
  pendentes.
- **Perfil**: edição (merge parcial), upload de fotos (máx. 6), notificações
  com badge e marcação ao abrir.
- **Landing**: conteúdo do protótipo com motion `whileInView`/stagger,
  `reduced-motion` respeitado em toda a app.

## Estrutura de testes

- **Backend (91)**: auth, professionals, favorites, requests/offers,
  conversations, socket (payloads), reviews, payments (limpeza do plano no
  `afterAll`), profile/dashboard, notifications, professionals search,
  schema idempotente. `tests/globalSetup.ts` faz `drizzle-kit push` +
  `TRUNCATE … RESTART IDENTITY CASCADE` por run; ficheiros sequenciais.
- **Frontend (38)**: Auth/Login (6), shell/splash (4), Search (3),
  ProfessionalCard (2), ChatRoom (3), useSocket (2), Requests (5), Plans/Payment
  (2), Dashboard (2), Me/Notifications (2), Landing (3).

## Known gaps / decisões em aberto

1. **oxlint warnings (2, não bloqueiam)**: `react(set-state-in-effect)` em
   `hooks/useSocket.ts` (socket externo criado no effect) e
   `react(only-export-components)` no `AuthContext` (hook partilhado no
   mesmo ficheiro). Resolver movendo o socket para `useSyncExternalStore`
   e o hook para `auth/useAuth.ts`.
2. **Sem `GET /api/profile`**: o EditProfile começa com o formulário vazio e
   envia só campos alterados (a spec só previa PUT+photos).
3. **Pagamento é simulado**: "Já paguei" confirma manualmente — sem
   webhook/gateway.
4. **Selo Verificado estático** (seed) — sem fluxo de verificação de BI.
5. **Fotos locais** em `backend/uploads/` (gitignored) — sem object storage.
6. **Notificações limit(100)** sem paginação; chat sem replay histórico
   após reconexão.
7. **`price_min`** foi acrescentado ao schema (o `price_text` é display) —
   documentado no self-review do plano.
8. **Protótipo** fica em `Biscate-App/` só como referência (não serve nada).

## Comandos rápidos

```bash
createb biscate && createb biscate_test   # uma vez
npm install --prefix backend && npm install --prefix frontend
npm run db:push --prefix backend && npm run seed --prefix backend
npm run dev                               # backend :3001 + frontend :5173
npm run lint && npm run typecheck && npm test   # verificação global
```
