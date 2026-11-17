# HANDOFF — preparação para a FASE 8

Documento de passagem do estado actual do Biskato para continuação da Integração e testes finais (FASE 8).

> **Aviso importante:** o gateway internacional **Visa/Mastercard ainda não foi implementado**. Nesta publicação não existe integração com gateways, webhooks, cartões ou pagamentos internacionais. O fluxo disponível é **manual por comprovativo**, com aprovação administrativa.

---

## 1. Estado actual do projecto

Branch de trabalho: `feature/biskato-subscriptions-and-splash`.

Fases concluídas:

- **FASE 1, FASE 2 e FASE 3** — base full-stack (API, SPA, autenticação, descoberta, pedidos/propostas, chat, avaliações, painel, perfil, notificações, landing).
- **FASE 4** — subscrições e pagamentos no backend (transacções, locks, relógio injectado, moderação aditiva).
- **FASE 5** — implementada juntamente com a FASE 4.
- **FASE 6** — painel administrativo de pagamentos e página do profissional (`/app/plans`, `/app/plans/pagamento`, `/admin`), incluindo o endpoint read-only `GET /api/subscriptions/me`.
- **FASE 7** — Splash Screen animada, integrada uma vez por sessão.

**FASE 8 não foi iniciada.** **FASE 9 fica reservada.** Nesta operação não foram alteradas regras de negócio, esquema funcional, BD de produção/do amigo, `main`, nem funcionalidades de pagamento/subscrição/administração.

---

## 2. Funcionalidades já implementadas

### Base da aplicação

- API REST em Express 5 + PostgreSQL + Drizzle ORM + Socket.IO.
- SPA em React 19 + Vite + TypeScript.
- Autenticação JWT com papéis `client`, `professional` e `admin`.
- Pesquisa de profissionais, favoritos, pedidos, propostas, chat REST/Socket.IO, avaliações, dashboard, perfil, fotos, notificações e landing responsiva.

### Subscrições e pagamentos

- 4 planos vindos do backend (`GET /api/plans`): nomes, preços, dias e destaque são definidos no servidor; o frontend apenas apresenta.
- Criação de pagamento manual com entidade `90210` e referência única de 9 dígitos (`POST /api/payments`).
- Envio de comprovativo pelo profissional (`POST /api/payments/:id/proof`): JPG/JPEG/PNG/WebP, máximo 5 MB, validação de MIME e bytes mágicos; PDF rejeitado.
- A confirmação/aprovação pelo próprio profissional foi removida; apenas administração aprova ou rejeita.
- `GET /api/subscriptions/me`: leitura do estado corrente e histórico da subscrição do profissional autenticado.
- Renovação sem criar nova subscrição quando já existe `active`.

### Administração

- `/admin` lista pagamentos pendentes ou todos, permite ver comprovativo, aprovar ou rejeitar.
- Aprovação/rejeição são definitivas na interface e protegidas no backend por estado e locks.

### Splash Screen

- Marca `biskato` (`bis` branco, `kato` amarelo) e slogan **O seu kamba para qualquer biskate**.
- Sequência curta: `b` + `k` → `biskato` → slogan → fade → aplicação.
- Aparece uma vez por sessão de navegação.

---

## 3. Arquitectura relevante (frontend e backend)

### Backend

- `backend/src/app.ts` monta:
  - `/api/plans` — planos;
  - `/api/payments` — criação, histórico e envio de comprovativo;
  - `/api/subscriptions` — `GET /me`;
  - `/api/admin` — rotas administrativas.
- `backend/src/routes/admin.routes.ts` aplica `requireAuth` + `requireRole('admin')` a todas as rotas:
  - `GET /payments`
  - `GET /payments/:id/proof`
  - `POST /payments/:id/approve`
  - `POST /payments/:id/reject`
- `backend/src/services/payments.service.ts` é uma fachada: reexporta a lógica de `subscriptions.service.ts` para haver um único pipeline de aplicação de pagamento.
- `backend/src/services/subscriptions.service.ts` contém:
  - criação de pagamento/subscrição;
  - aprovação e rejeição administrativas;
  - aplicação idempotente (`applied_at`);
  - activação por mensagem;
  - job de prazo/expiração;
  - listagens para profissional e admin.
- Locks admitsórios PostgreSQL (`pg_try_advisory_xact_lock`) com ordem fixa: profissional → pagamento → subscrição. Conflito devolve `409 LOCK_BUSY`.
- `backend/src/lib/clock.ts` injecta `now`; decisões temporais de negócio usam o relógio do serviço, não `now()` do PostgreSQL.
- Comprovativos são gravados em `backend/uploads/` (gitignored) e servidos ao admin por endpoint autenticado. `resolveProofPath()` bloqueia traversal.

### Frontend

- `frontend/src/App.tsx` — rotas e guarda da Splash; `/admin` protegido por `ProtectedRoute roles={['admin']}`.
- `frontend/src/components/ProtectedRoute.tsx` — verifica token e, opcionalmente, papel.
- `frontend/src/api/payments.api.ts` — planos, pagamentos, validação e upload do comprovativo. Não existe `confirmPayment`.
- `frontend/src/api/subscriptions.api.ts` — `getMySubscription()`, apenas leitura.
- `frontend/src/api/admin.api.ts` — listagem, decisões e `getProofBlob()` (blob autenticado).
- `frontend/src/pages/app/Plans.tsx` — estado actual, bloqueios, confirmação de compra e históricos.
- `frontend/src/pages/app/Payment.tsx` — upload/estado do comprovativo.
- `frontend/src/pages/admin/AdminPayments.tsx` — painel administrativo.
- `frontend/src/components/StatusBadge.tsx` + `statusLabels.ts` — rótulos únicos para estados.
- `frontend/src/api/client.ts` — base URL fixa `http://localhost:3001/api`; token JWT em `localStorage`.

### Base de dados

- Tabela `subscriptions` e colunas aditivas em `payments`, `professional_profiles` e `users`.
- Migrações em `backend/migrations/`:
  - `0001_enums.sql` — valores de enum;
  - `0002_subscriptions_and_admin.sql` — subscrições, colunas aditivas, backfill e FK;
  - `0003_client_moderation.sql` — `users.blocked` e `users.suspended`.
- `payments.subscription_id` tem exactamente uma foreign key (`payments_subscription_id_subscriptions_id_fk`).

---

## 4. Regras de negócio das subscrições

- Estados de subscrição: `pending_payment`, `pending_activation`, `active`, `expired`, `rejected`, `pending_review`.
- Estados de pagamento: `pending`, `proof_sent`, `confirmed`, `approved`, `rejected`.
- Enquanto existir subscrição em `pending_payment`, `pending_activation` ou `pending_review`, ou pagamento em `pending`/`proof_sent`, o profissional não pode comprar outro plano. O frontend bloqueia a compra; o backend devolve `409 PAYMENT_IN_PROGRESS`.
- Renovação com subscrição `active`: o pagamento é ligado à subscrição existente e a validade passa a `GREATEST(expires_at, agora) + dias do plano`. Não soma dias a partir de uma data já expirada nem duplica subscrições.
- Primeira compra: aprovada pelo admin → `pending_activation` com prazo de **3 dias** (`ACTIVATION_GRACE_DAYS`). Esse prazo **não desconta os dias contratados**.
- `professional_profiles.discoverable_until` controla visibilidade/contactabilidade temporária; a validade real continua em `plan_expires_at`. `activePlan()` e `assertActivePlan()` consideram qualquer uma das duas janelas.
- Se um cliente estiver `blocked` ou `suspended`, a primeira mensagem não activa a subscrição. Estes campos são aditivos e **não têm API/admin nesta fase**.
- Planos, nomes, preços, dias e estados vêm sempre do backend.

---

## 5. Aprovação de pagamentos

1. O profissional escolhe plano e cria pagamento (`pending`).
2. Envia comprovativo (`proof_sent`).
3. O admin vê o comprovativo e decide:
   - **Aprovar** (`POST /api/admin/payments/:id/approve`): estados aprováveis `pending`, `proof_sent` e `confirmed`; grava `approved_at`, `approved_by` e chama o pipeline uma única vez, protegido por `applied_at`.
   - **Rejeitar** (`POST /api/admin/payments/:id/reject`): estado terminal; não reverte pagamento já aprovado; marca a subscrição bloqueada como `rejected` e remove a visibilidade temporária.
4. O resultado é idempotente: uma segunda aprovação não reaplica dias nem cria outra subscrição.
5. O comprovativo não é servido como URL pública: o frontend pede um blob autenticado e cria uma URL temporária, libertada ao fechar.

---

## 6. Activação por primeira mensagem e pelo scheduler

### Primeira mensagem

`sendMessage()` insere a mensagem, actualiza `conversations.last_message_at` e chama `activateByMessage()` na **mesma transacção**. Se a lock da subscrição falhar, nada é gravado; uma nova tentativa produz exactamente uma mensagem.

A activação exige:

- mensagem de texto válida (não vazia);
- remetente cliente e destinatário profissional da mesma conversa;
- cliente com papel `client`, não bloqueado nem suspenso;
- subscrição em `pending_activation`;
- mensagem criada **depois** de `approved_at`;
- lock `biskato:sub:<id>`.

Ao activar: `status = active`, `activated_at = agora`, `expires_at = agora + dias do plano`, `activation_deadline = null` e perfil sincronizado.

### Scheduler

`runSubscriptionsJob()` é chamado ao arranque do servidor e a cada **5 minutos** em `backend/src/server.ts`.

- Usa a lock `biskato:subscriptions-job`.
- Activa por prazo as subscrições `pending_activation` cujo `activation_deadline` chegou.
- Marca como `expired` as subscrições `active` cujo `expires_at` chegou.
- Mesa mensagem e scheduler usam o mesmo predicado de estado, pelo que apenas um activa uma dada subscrição.

---

## 7. Painel administrativo

- Rota: `/admin`, protegida por token e papel `admin`.
- Filtros: **Pendentes** (`pending`, `proof_sent`, `confirmed`) e **Todos**.
- Por pagamento: nome do profissional, referência, valor/moeda, data, estado, data do comprovativo e estado da subscrição.
- Acções: **Ver comprovativo**, **Aprovar**, **Rejeitar**, sempre com confirmação explícita.
- O botão "Ver comprovativo" abre um modal com a imagem obtida por `getProofBlob()`; `proofUrl` é usado apenas como sinal de existência.

Criação da primeira conta admin: `seedAdmin()` em `backend/src/db/seed.ts`, apenas a partir de variáveis de ambiente; em produção sem essas variáveis falha, e um email existente com outro papel não é promovido automaticamente.

---

## 8. Splash Screen

- Ficheiros: `frontend/src/components/Splash.tsx`, `Splash.css`, `Splash.test.tsx` e integração em `frontend/src/App.tsx`.
- Cores exactas via variáveis CSS inline: fundo `#C8102E`, `bis` `#FFFFFF`, `kato` `#F2B705`.
- Slogan exacto: **O seu kamba para qualquer biskate**.
- Linha do tempo: `0 ms` `b` + `k`; `260 ms` `is` + `ato`; `560 ms` slogan; `1200 ms` fade; `1600 ms` `onDone`.
- React + CSS puro; **sem `motion/react` na Splash** e sem `AnimatePresence` em `App.tsx`.
- `sessionStorage` `biskato:splash-seen` garante uma apresentação por sessão; mudar de página ou remontar a app não a repete.
- `prefers-reduced-motion` termina imediatamente e desactiva transições.
- Timeout determinístico de 1600 ms evita bloqueio permanente.
- Sem overflow horizontal em 390 px, 768 px e 1280 px.

---

## 9. Variáveis de ambiente necessárias (sem valores)

Configurar localmente em `.env` (gitignored). **Não incluir valores neste documento nem publicá-los.**

Backend:

- `DATABASE_URL` — ligação da aplicação.
- `DATABASE_URL_TEST` — ligação exclusiva da base de testes.
- `JWT_SECRET` — assinatura dos tokens; obrigatório em produção.
- `CORS_ORIGIN` — origem permitida.
- `PORT` — porta da API.
- `ADMIN_EMAIL` — email da primeira conta admin via seed.
- `ADMIN_PASSWORD` — password da primeira conta admin via seed.
- `ADMIN_NAME` — nome da primeira conta admin via seed.

Frontend: a base da API está definida em `frontend/src/api/client.ts` (`http://localhost:3001/api`); não há variável de ambiente para esse valor nesta fase.

---

## 10. Instalação e execução

Pré-requisitos testados: Node.js 26.4 (>= 20 deve funcionar), npm 12, PostgreSQL 18 (qualquer Postgres >= 14 serve).

```bash
# dependências
npm install --prefix backend
npm install --prefix frontend

# bases de dados (dev e testes separadas)
# criar biscate e biscate_test

# schema + dados de demonstração apenas em dev
npm run db:push --prefix backend
npm run seed --prefix backend

# executar (backend :3001 + frontend :5173)
npm run dev
# ou separadamente:
npm run dev:backend
npm run dev:frontend
```

Nota: `npm run seed` insere dados de demonstração apenas fora de produção. A conta admin depende das variáveis `ADMIN_*` da secção 9.

---

## 11. Configuração de base de dados local isolada

- Usar uma BD dedicada a testes, distinta da BD de desenvolvimento e de qualquer BD do amigo/produção.
- Definir `DATABASE_URL_TEST` para essa BD e garantir que `DATABASE_URL` **nunca** aponta para ela fora dos testes.
- `backend/tests/globalSetup.ts` executa `drizzle-kit push --force` e depois `TRUNCATE ... RESTART IDENTITY CASCADE` apenas na BD indicada por `DATABASE_URL_TEST`.
- Na validação desta publicação foi usada uma ligação explicitamente verificada como:
  - base: `biscate_test`;
  - endereço: `127.0.0.1`;
  - porta: `5432`.
- Antes de executar migrações ou seeds, confirmar sempre o nome da BD corrente. Nenhuma migração/seed foi executada noutra BD.

---

## 12. Testes já executados e resultados

| Verificação | Resultado |
| --- | --- |
| Backend `npm run typecheck` | OK |
| Backend `npm run lint` | 0 erros |
| Backend `npm test` | **17 ficheiros / 111 testes OK** |
| Frontend `npm run typecheck` | OK |
| Frontend `npm run lint` | exit 0; 5 avisos pré-existentes, nenhum bloqueante |
| Frontend `npm test` | **17 ficheiros / 54 testes OK** |
| Frontend `npm run build` | OK; aviso pré-existente de chunk > 500 kB |

Avisos de lint frontend pré-existentes: `useSocket.ts`, `AuthContext.tsx`, `AdminPayments.tsx`, `Payment.tsx` e `Plans.tsx`.

Verificação em browser real da Splash (servidor estático local, sem BD):

- cores computadas `rgb(200, 16, 46)`, `rgb(255, 255, 255)` e `rgb(242, 183, 5)`;
- palavra `biskato` e slogan exactos;
- transição para a Landing e navegação para `/login` sem reaparecimento;
- 0 erros na consola;
- 390 px, 768 px e 1280 px sem overflow horizontal.

Testes de backend incluem concorrência, idempotência, backfill, mensagem + activação e scheduler, todos contra a BD isolada de testes.

---

## 13. Limitações conhecidas e funcionalidades adiadas

- **Gateway Visa/Mastercard não implementado.** Também não há webhooks, cartões, pagamentos internacionais nem conciliação automática com banco.
- Fluxo de pagamento é manual por comprovativo.
- `users.blocked` / `users.suspended` existem e são lidos na activação, mas **não há API nem ecrã admin para os gerir**.
- Fotos e comprovativos ficam em `backend/uploads/` (local, gitignored); sem object storage.
- Sem `GET /api/profile`; o EditProfile envia apenas campos alterados.
- Selo "Verificado" é estático (seed), sem fluxo de verificação de documento.
- Notificações com `limit(100)` sem paginação; chat sem replay histórico após reconexão.
- Avisos de lint frontend e aviso de chunk > 500 kB no build permanecem.
- Docs do plano citam como trabalho futuro: gateway real, OAuth, SMS, deploy e i18n.
- `Biscate-App/` permanece apenas como protótipo de referência.

---

## 14. O que falta realizar na FASE 8

A FASE 8 — **Integração e testes finais** — ainda não foi iniciada e deve ser executada pelo continuar da implementação.

Âmbito previsto pelo estado actual (sem alterações feitas aqui):

- Integrar ponta a ponta backend + frontend com a BD isolada configurada.
- Confirmar o fluxo completo: plano → pagamento → comprovativo → aprovação admin → activação por mensagem/scheduler → visibilidade no painel do profissional.
- Validar/criar a conta admin via `ADMIN_*` e testar as rotas `/admin` com token de admin.
- Repetir testes finais de navegação, responsividade, reduced motion e consola após a integração.
- rever as limitações da secção 13 e decidir o que fica para a fase seguinte.

---

## 15. Reservado para a FASE 9

A FASE 9 fica **reservada e não iniciada**. Não existe implementação nem especificação nova nesta publicação.

Temas já assinalados em documentação como futuros e que podem ser decididos nessa altura: gateway real de pagamentos, OAuth, SMS, deploy e i18n. A moderação administrativa de `blocked`/`suspended` também carece de decisão explícita.

**O gateway internacional Visa/Mastercard não foi implementado e não foi iniciado nesta operação.**

---

## Estado de publicação

- Remote de destino autorizado: `myfork` → `https://github.com/augustoc-shiper/Biscate-App.git`.
- Branch publicada: `feature/biskato-subscriptions-and-splash`.
- `source` é o repositório original local e **não foi usado para publicação**.
- `main` não foi alterada; repositório original e BDs do amigo/produção permanecem intactos.
