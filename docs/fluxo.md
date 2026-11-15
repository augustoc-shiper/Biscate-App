# Fluxos principais

## 1. Registo / login

1. Landing (`/`) → "Experimentar a app" → `/login` (tabs Entrar | Criar conta).
2. Registo: nome, e-mail, password, papel (cliente/profissional).
   - Profissional cria também `professional_profiles` (categoria, bairro e
     preço com defaults do seed) e começa **sem plano activo**.
3. `POST /auth/register` → `{ user, token }`; `POST /auth/login` idem.
4. O token fica em `localStorage`; o `AuthContext` chama `GET /auth/me` no
   arranque; o axios injeta `Authorization` e, em 401, emite `auth:logout`
   (o contexto limpa a sessão → `ProtectedRoute` manda para `/login`).
5. Pós-login: cliente → `/app` (Home) · profissional → `/app/dashboard`.

## 2. Pesquisa → perfil → chat

1. Home: grelha de categorias, promo vermelho, top-rated, chips de bairro.
2. `/app/search`: input com debounce (query param `q`), chips de categoria,
   ordenação (rating/distance/price), paginação; lê `?category=`/`?bairro=`
   vindos da Home.
3. Card do profissional → `/app/professional/:id`: capa, stats, tabs
   Sobre/Trabalhos/Avaliações, favorito (toggle optimista com revert) e
   **Conversar** → `/app/chat/nova?professionalId=…`.
4. A sala cria a conversa (`POST /conversations`), faz redirect para
   `/app/chat/:id` e entra no room via socket (`conversation:join`).
5. Mensagens: REST na abertura + evento `message:new` (dedupe por id);
   envio `message:send` com ack; `typing` ↔ `typing:state`; bolha de citação
   para `kind:'quote'`; `kind:'rating'` mostra estrelas.

## 3. Pedido → proposta → aceite → avaliação

1. Cliente: `/app/requests` → **Publicar pedido** → categoria (chips),
   descrição (min 10), bairro, quando (Hoje/Esta semana/Flexível).
2. Profissional vê o pedido no fluxo de propostas e envia
   `POST /requests/:id/offers` com preço + mensagem (requer plano activo —
   erro `NO_ACTIVE_PLAN`).
3. Cliente, em `/app/requests`, vê as propostas com **Aceitar**/**Recusar**:
   - `POST /offers/:id/accept` → oferta `accepted`, pedido `in_conversation`
     e é criada (ou reutilizada) a conversa entre os dois.
   - `POST /offers/:id/decline` → oferta `declined`.
4. Após o serviço, o cliente avalia pela sala de chat (estrelas 1-5) →
   `POST /reviews` (só o dono do pedido, uma vez) → transacção que insere a
   mensagem `kind:'rating'` e recalcula `rating_avg`/`rating_count` do
   profissional.

## 4. Plano → pagamento → activação

1. Profissional abre `/app/plans`: 4 planos (destaque "Mais escolhido" no de
   30 dias), selecciona e **Continuar**.
2. `POST /payments` gera `{ entity: '90210', reference: 'XXX XXX XXX' }`
   (referência única) → `/app/plans/pagamento?paymentId=…`.
3. O utilizador paga fora da app (ATM/internet banking/Multicaixa Express) e
   carrega **Já paguei** → `POST /payments/:id/confirm` (idempotente: se
   já confirmado, devolve o mesmo estado).
4. A confirmação grava `plan_expires_at` = hoje + `plans.days` → ecrã
   "Plano activado" (motion check). Sem plano activo, o profissional não
   consegue enviar propostas e o Dashboard mostra o CTA "Escolher plano".
5. O Dashboard (`/app/dashboard`) mostra visitas/contactos/nota, barra de
   dias restantes e propostas pendentes ("Aguarda resposta do cliente").
