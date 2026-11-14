# Biscate — Especificação de Design

**Data:** 2026-11-14
**Estado:** Aprovado pelo utilizador (perguntas respondidas, design delegado para avanço autónomo)

## 1. Visão geral

Transformar o protótipo estático do Biscate (marketplace que liga clientes a profissionais locais em Luanda) numa aplicação web real:

- **Backend:** Node.js + Express, PostgreSQL 18 + Drizzle ORM, JWT (e-mail + senha), Socket.IO para chat, CORS, DTOs, clean architecture em camadas.
- **Frontend:** React 18 puro com Vite (CRA descontinuado — utilizador aprovou Vite), lucide-react para ícones, `motion` (framer-motion) para transições + CSS para micro-interações, SPA única com landing em `/` e app em `/app/*`.
- **Processo:** scaffold inicial, **commit a cada feature**, testes no backend e no frontend.

Sucesso: aplicação funcional de ponta a ponta — registo/login, pesquisa de profissionais com filtros, perfil, chat em tempo real, pedidos com orçamentos, planos com pagamento simulado, painel do profissional, avaliações e favoritos — com dados de demonstração do protótipo.

## 2. Decisões confirmadas

| Tema | Decisão |
|---|---|
| Escopo | MVP completo (tudo do protótipo) |
| Auth | E-mail + senha, JWT (access + refresh simples em cookie ou body) |
| Chat | Socket.IO (tempo real, presença, "a escrever...") |
| Pagamentos | Simulado (entidade/referência geradas, botão "Já paguei") |
| Base de dados | PostgreSQL 18 local (sem Docker) |
| Estrutura | Monorepo `biskato/` com `backend/`, `frontend/`, `docs/`; git init na raiz |
| Frontend | Vite + React, motion + CSS |
| Seed | Dados do protótipo (6 profissionais, 8 categorias, 6 bairros, planos, utilizadores de teste) |
| Fotos | Upload local em `backend/uploads/` servido pela API |
| Testes | Backend (integração dos endpoints) + frontend (componentes/fluxos) |
| Landing + app | Uma SPA só: `/` landing, `/app/*` app |
| Idioma | Português de Angola (pt-AO) |

## 3. Arquitetura

### 3.1 Backend — camadas clássicas

```
backend/
├── src/
│   ├── routes/          # rotas Express + validação DTO por domínio
│   ├── controllers/     # request → service → response
│   ├── services/        # regras de negócio
│   ├── db/
│   │   ├── schema.ts    # schema Drizzle
│   │   ├── client.ts    # pool/pg client
│   │   └── seed.ts      # dados do protótipo
│   ├── middleware/      # auth JWT, erro global, cors, upload
│   ├── sockets/         # lógica Socket.IO
│   ├── app.ts           # express app (cors, json, rotas)
│   └── server.ts        # http + socket.io
├── tests/               # testes de integração
└── uploads/             # fotos (gitignored)
```

Fluxo de requisição: `route → DTO (zod) → controller → service → drizzle → resposta JSON`.

Regras transversais:
- Todas as respostas seguem `{ data }` ou `{ error: { message, code } }`.
- Erros capturados por middleware global → 400/401/403/404/500 consistentes.
- CORS com origem do frontend em `VITE/CORS_ORIGIN` (default `http://localhost:5173`).
- JWT no header `Authorization: Bearer`.

### 3.2 Frontend — pastas por funcionalidade

```
frontend/src/
├── api/            # cliente fetch/axios + módulos (auth, professionals, chat...)
├── context/        # AuthContext
├── hooks/          # useProfessionals, useChat, useNotifications...
├── pages/          # Landing, Login, Home, Search, Profile, Chat, Requests, Plans, Dashboard, ...
├── components/     # Button, Card, TabBar, StarRating, MotionPage...
└── styles/         # tokens (cores do protótipo: #C8102E, #F7B500, Inter)
```

Motions: `motion` para transições entre páginas (fade/slide), stagger nas listas, entrada do splash; CSS para hovers/estados. `prefers-reduced-motion` respeitado.

## 4. Modelo de dados (Drizzle + PostgreSQL)

```
users                id, name, email(unique), password_hash, role(client|professional),
                     phone, bio, avatar_url, verified, created_at
professional_profiles user_id PK/FK, category_id, bairro_id, price_text,
                     response_time, available_today, plan_expires_at,
                     rating_avg, rating_count, visits_count, distance_km, created_at
categories           id, name, icon
bairro               id, name
work_photos          id, professional_id, url, created_at
favorites            user_id, professional_id (PK composta)
requests             id, client_id, category_id, description, bairro_id,
                     when(today|week|flexible), status(open|in_conversation|done), created_at
offers               id, request_id, professional_id, price, message,
                     status(sent|accepted|declined), created_at
conversations        id, client_id, professional_id, last_message_at (unique par)
messages             id, conversation_id, sender_id, body,
                     kind(text|image|quote|rating), payload jsonb, read_at, created_at
reviews              id, conversation_id, reviewer_id, reviewed_id, stars, comment, created_at
plans                id, days, price_kz, name, highlight
payments             id, professional_id, plan_id, entity, reference, amount_kz,
                     status(pending|confirmed), confirmed_at
notifications        id, user_id, kind, body, read_at, created_at
```

- **Plano activo:** `plan_expires_at > now()` — só aparece nas pesquisas quem tem plano activo (clientes não filtram por isso na listagem pública? Não: filtragem aplicada sempre que `role=professional`).
- **Selo Verificado:** `users.verified` (seed marca 4 de 6 como true).
- **Avaliação:** `rating_avg`/`rating_count` no profile, actualizados transaccionalmente após cada review.
- Distâncias (`km`) simuladas no seed (coluna `distance_km` no profile para ordenação "mais perto").

## 5. API (REST, prefixo `/api`)

### Auth
- `POST /auth/register` — { name, email, password, role, phone? } → { user, token }
- `POST /auth/login` — { email, password } → { user, token }
- `GET /auth/me` — user actual

### Profissionais (público)
- `GET /professionals?category=&bairro=&q=&sort=rating|distance|price&page=`
- `GET /professionals/:id` — perfil + fotos + avaliações
- `GET /categories`, `GET /bairro` (seed estático nas tabelas)

### Cliente autenticado
- `POST /favorites/:professionalId` (toggle), `GET /favorites`
- `POST /requests` — publicar pedido
- `GET /requests` — pedidos do cliente (+ propostas)
- `POST /requests/:id/offers` — (profissional) propor orçamento
- `POST /offers/:id/accept|decline`
- `POST /reviews` — { conversationId, stars, comment }
- `GET /notifications`, `POST /notifications/read`

### Chat
- `GET /conversations`, `GET /conversations/:id/messages`
- `POST /conversations` — { professionalId } (inicia ou reutiliza)
- `POST /conversations/:id/messages` — { body, kind, payload? } (persistência também via REST para fallback)
- Socket.IO events: `join:conversation`, `message:send`, `message:new`, `typing:start|stop`, `presence`

### Profissional
- `GET /dashboard` — visitas, contactos, nota, propostas pendentes
- `PUT /profile` — editar perfil, fotos (`POST /profile/photos` multipart), apagar foto
- `POST /payments` — { planId } → gera entidade/referência; `POST /payments/:id/confirm` — "Já paguei"
- `GET /payments` — histórico

### Paginação/filtros
Listagens paginadas (`limit` default 20, `meta: { total, page }`). Índices em `professional_profiles(category_id, bairro_id)`, `messages(conversation_id, created_at)`.

## 6. Socket.IO

- Auth no handshake: token JWT em `handshake.auth.token`; sem token → ligação rejeitada.
- Salas: `conversation:<id>`; eventos:
  - client → server: `conversation:join`, `message:send {conversationId, body, kind, payload}`, `typing`
  - server → client: `message:new`, `typing:state`, `presence`
- Persistência via service (mesmo código do REST); envio a todos na sala incluindo remetente (ack com id).
- Notificação push criada para o destinatário quando offline (tabela `notifications`).

## 7. Frontend — rotas e páginas

```
/                    Landing (hero, problema, como funciona, planos, faq) — dados estáticos
/login               Login + registo apenas com e-mail e senha (OAuth Google/Facebook fica fora do âmbito desta fase)
/app                 Home (categorias, destaques, por bairro, como funciona)
/app/search          Pesquisa com chips categoria, bairro, ordenação
/app/professional/:id Perfil (sobre, trabalhos, avaliações, conversar, favorito)
/app/chat            Lista de conversas
/app/chat/:id        Mensagens (tempo real, typing, orçamento, avaliação)
/app/requests        Pedidos activos/concluídos + publicar novo
/app/plans           Escolher plano (cliente vê info; profissional compra)
/app/dashboard       Painel do profissional (resumo/estatísticas, plano, propostas)
/app/me              Perfil do utilizador, favoritos, notificações, ajuda, sair, trocar conta
```

- **Tabs inferiores** (como protótipo): cliente [Início, Mensagens, Pedidos, Perfil]; profissional [Painel, Mensagens, Plano, Perfil].
- **Visitante:** `login` com email/senha apenas (OAuth fora do âmbito); utilizadores de teste no seed.
- Splash de abertura com logo e tagline (motion).
- Notificações via sino → lista.

## 8. Seed

- 8 categorias (com ícone lucide), 6 bairros, 4 planos (500/1000/3000/30000 Kz).
- 6 profissionais do protótipo (nomes, bairros, notas, preços, descrições, verified, distance_km).
- 2 clientes de exemplo + 1 profissional + 1 cliente para login (`cliente@biscate.ao` / `profissional@biscate.ao`, senha `biscate123`).
- Conversas/mensagens exemplo, 1 pedido com 2 propostas, favoritos, notificações, 1 pagamento confirmado.

## 9. Tratamento de erros

- Middleware único de erro; `AppError(message, status, code)`.
- Validação zod em todos os DTOs de entrada → 400 com lista de erros de campo.
- 401 sem/expirado token; 403 (não é o dono); 404 recurso; 409 email duplicado.
- Frontend: interceptor de erros → toast; loading states nas listagens; empty states desenhados (como protótipo).

## 10. Testes

- **Backend:** vitest + supertest, `tests/` com setup de base de teste (schema criado num database de teste; seed mínimo). Cobrir: register/login/me, listagem e filtros de profissionais, CRUD pedidos/propostas, conversas/mensagens, favoritos, payments confirm, guardas de auth.
- **Frontend:** vitest + React Testing Library. Cobrir: formulário de login, listagem de profissionais com filtro, envio de mensagem no chat (mock API), StarRating, tabs.
- `npm test` em cada pasta.

## 11. Documentação (raiz do repo e docs/)

| Ficheiro | Conteúdo |
|---|---|
| `readme.md` | O que é, como instalar/executar, estrutura, credenciais seed |
| `docs/situation.md` | Ponto de situação actual — **actualizado ao fim de cada milestone** |
| `docs/contexto.md` | O que já se fez + o que se segue |
| `docs/stack.md` | Todas as tecnologias com versões e porquê |
| `docs/fluxo.md` | Fluxos da aplicação (registo, pesquisa, chat, pedido, plano) |

## 12. Processo de entrega

- Commits por feature seguindo o plano (`feat: ...`, `test: ...`, `docs: ...`).
- Ordem: scaffold → schema/migrations/seed → auth → professionals → favorites/requests/offers → chat REST+socket → payments → dashboard/uploads → frontend base (shell, auth, tokens) → páginas cliente → chat UI → dashboard profissional → motions/polish → docs finais.
- Lint/typecheck (eslint + tsc) passam antes do estado final.
