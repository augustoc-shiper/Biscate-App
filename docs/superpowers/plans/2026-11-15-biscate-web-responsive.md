# Biscate Web-First Responsivo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o frontend mobile-first numa app web-first responsiva: top navbar no desktop, grelhas largas, hover/animações polidas e motion — sem dependências novas e com os 129 testes existentes verdes.

**Architecture:** camada de design system CSS (tokens + `system.css` com estados por família de botão), AppShell com as duas navegações montadas (visibilidade por CSS na divisa 768px), `navItems(role)` como fonte única de navegação, grelhas desktop por página via `min-width` acrescentados, e `AnimatePresence` nas transições de página — CSS puro para interacção, motion library só para entradas/saídas.

**Tech Stack:** React 19, react-router-dom 7, motion 14, lucide-react, Vite 8, vitest + testing-library (jsdom), oxlint, TypeScript ~7 — **zero dependências novas**.

**Spec:** `docs/superpowers/specs/2026-11-15-biscate-web-responsive-design.md`

## Global Constraints

- Sem dependências novas (CSS partilhado é o padrão do repo).
- Os 129 testes existentes (91 backend + 38 frontend) ficam verdes; backend intocável.
- Divisa do shell: `768px` (`--bp-md`); grelhas de página: `1024px` (`--bp-lg`).
- Movimento: `--ease: cubic-bezier(0.2,0.7,0.3,1)`, `--t-fast: 150ms`, `--t-med: 200ms`; lift = `translateY(-2px)` botões / `-3px` cards; `:active scale(.98)`; hovers **só** dentro de `@media (hover: hover)`.
- **Proibido** `button:hover` global amplo — só regras por família de classe (spec §Secção 1).
- Sombras: `--sh-1` repouso, `--sh-2` hover, `--sh-3` overlays.
- Media queries novas usam `min-width`; blocos mobile existentes ficam intactos.
- TabBar `aria-label="Menu principal"`; topnav `aria-label="Navegação principal"` (spec §Secção 2).
- `prefers-reduced-motion` global do `index.css` não mudar.
- Commits com a identidade configurada (`joao-sapalo`) — nunca `-c user.name` alternativo; commitar e pushar ao fim de cada task.

## Review Focus

1. **Ambiguidade de roles em jsdom** — ambas as navs estão no DOM; um teste que faça `getByRole('navigation')` sem nome falha. → `AppShell.test.tsx` (Task 2) consulta sempre por `name` (`'Navegação principal'` / `'Menu principal'`); ajustar `TabBar.test.tsx` ao novo label.
2. **TabBar muda de entradas** (`navItems` acrescenta Pesquisa/Início) — `TabBar.test.tsx` pode ter asserções de contagem/label. → Task 1, passo explícito: correr `TabBar.test` e corrigir asserções afectadas (manter o comportamento testado: links por papel).
3. **ChatList montada dentro de ChatRoom (two-pane)** — em `ChatRoom.test.tsx` o mock `listConversations` devolve `undefined` e rebenta em `.then`. → Task 6: adicionar `mockResolvedValue([])` em `beforeEach` + teste novo do painel lateral.
4. **`AnimatePresence mode="wait"` atrasa o mount** das páginas — se algum teste renderizar rotas através do AppShell, pode apanhar a página a sair. → Task 9: suite completa verde é a verificação; nenhum teste actual renderiza `<App/>`, confirmar com grep.
5. **Regras desktop a vencer o mobile abaixo da divisa** — media query mal fechada aplica layout largo a telemóveis. → Tasks 4-8: cada task verifica por grep que o bloco desktop está dentro de `@media (min-width: …)`; smoke manual ≤768 e ≥1024 no Task 10.

---

### Task 1: `navItems` — fonte única de navegação

**Files:**
- Create: `frontend/src/components/navItems.ts`
- Modify: `frontend/src/components/TabBar.tsx` (consumir `navItems`, remover `CLIENT_TABS`/`PROFESSIONAL_TABS`)
- Test: `frontend/src/components/navItems.test.ts` (+ ajustes em `frontend/src/components/TabBar.test.tsx` se falhar)

**Interfaces:**
- Consumes: `lucide-react` (`LucideIcon`), `useAuth().user.role`.
- Produces:
  ```ts
  export type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };
  export function navItems(role: 'client' | 'professional'): NavItem[];
  ```
  Entradas exactas — cliente: `/app` Início (Home, `end:true`), `/app/search` Pesquisa (Search), `/app/chat` Mensagens (MessageCircle), `/app/requests` Pedidos (ListTodo), `/app/me` Perfil (User). Profissional: `/app` Início (Home, `end:true`), `/app/search` Pesquisa (Search), `/app/chat` Mensagens (MessageCircle), `/app/plans` Plano (Tag), `/app/dashboard` Painel (LayoutDashboard, `end:true`), `/app/me` Perfil (User).

- [ ] **Step 1: Escrever o teste falhante** — `navItems.test.ts`:
  - `cliente tem as entradas certas`: `navItems('client')` → labels `['Início','Pesquisa','Mensagens','Pedidos','Perfil']` e `to`s `['/app','/app/search','/app/chat','/app/requests','/app/me']` (map exacto, ordem incluída).
  - `profissional tem as entradas certas`: labels `['Início','Pesquisa','Mensagens','Plano','Painel','Perfil']` e `to`s `['/app','/app/search','/app/chat','/app/plans','/app/dashboard','/app/me']`.
  - `início e painel usam end`: `navItems('client')[0].end === true`; `navItems('professional').find(i => i.to==='/app/dashboard')!.end === true`.
- [ ] **Step 2: Correr → FAIL** — `cd frontend && npx vitest run src/components/navItems.test.ts` → erro de import (módulo não existe).
- [ ] **Step 3: Implementar `navItems.ts`** com o tipo e as entradas da Interfaces; refactar `TabBar.tsx` para `const tabs = navItems(user?.role === 'professional' ? 'professional' : 'client')` (manter markup, classes e `aria-label="Navegação principal"` por agora).
- [ ] **Step 4: Correr frontend completo → PASS** — `cd frontend && npm test`. Se `TabBar.test.tsx` falhar por labels/contagem nova, corrigir as asserções para as entradas da Interfaces (não reverter a funcionalidade).
- [ ] **Step 5: lint+typecheck+build** — `npm run lint && npm run typecheck && npm run build` → 0 erros.
- [ ] **Step 6: Commit** — `git add frontend/src/components/navItems.ts frontend/src/components/navItems.test.ts frontend/src/components/TabBar.tsx frontend/src/components/TabBar.test.tsx && git commit -m "feat: navItems partilhado como fonte única de navegação"` + push.

### Task 2: Top navbar no AppShell

**Files:**
- Create: `frontend/src/components/AppShell.test.tsx`
- Modify: `frontend/src/components/AppShell.tsx`, `frontend/src/components/TabBar.tsx:42` (label), `frontend/src/components/TabBar.test.tsx` (label)

**Interfaces:**
- Consumes: `navItems(role)` (Task 1), `useAuth().user`, `NavLink/Link`, `Bell`, `listNotifications()` de `../../api/notifications.api` (devolve `{ data, meta: { unread: number } }` — já usado em `Me.tsx`).
- Produces: `.app-topnav` (markup completo; estilos desktop na Task 4), badge `.me-badge` no sino da topnav, TabBar com `aria-label="Menu principal"`.

- [ ] **Step 1: Teste falhante** — `AppShell.test.tsx` (mock `../../context/AuthContext` com `useAuth` e mock `../../api/notifications.api` com `listNotifications: vi.fn().mockResolvedValue({ data: [], meta: { unread: 3 } })`, padrão de `Me.test.tsx`; render com `MemoryRouter` + `Routes` com `AppShell` e child index `<p>conteudo</p>`):
  - `renderiza a topnav com o label certo`: `screen.getByRole('navigation', { name: 'Navegação principal' })` existe.
  - `cliente vê os links de cliente na topnav`: dentro da topnav (helper `within`), links com nomes `Início, Pesquisa, Mensagens, Pedidos, Perfil` e **não** `Painel`.
  - `profissional vê Painel e Plano na topnav`: `within(topnav)` contém `Plano` e `Painel`, não contém `Pedidos` (2º teste com `useAuth` a devolver role professional).
  - `sino mostra badge de não lidas e aponta para /app/me`: `getByLabelText('Notificações')` tem `href="/app/me"` e contém texto `3` com `aria-label="3 não lidas"`; `getByLabelText('O meu perfil')` tem `href="/app/me"`.
  - `tabbar mantém label próprio`: `getByRole('navigation', { name: 'Menu principal' })` existe.
- [ ] **Step 2: Correr → FAIL** — `npx vitest run src/components/AppShell.test.tsx` → topnav/label/badge não existem.
- [ ] **Step 3: Implementar**
  - `TabBar.tsx:42`: `aria-label="Menu principal"` (+ actualizar `TabBar.test.tsx` se referir o label antigo).
  - `AppShell.tsx`: `useAuth()` + `useState<number>(0)`/`useEffect` que chama `listNotifications()` e faz `setUnread(res.meta.unread)` (com flag de cancelamento, padrão `Me.tsx`). Depois do `<header className="app-header">`, adicionar
    `<nav className="app-topnav" aria-label="Navegação principal">` com: `Link.app-logo` (bis+kato), `div.app-topnav-links` a mapear `navItems(user?.role…)` em `NavLink` (ícone 20 + label, `className` activo `.on`), e à direita `Link.app-bell` (Bell, `aria-label="Notificações"`, `to="/app/me"`) com `{unread > 0 && <span className="me-badge" aria-label={`${unread} não lidas`}>{unread}</span>}` + `Link.app-avatar` (iniciais de `user.name`, `aria-label="O meu perfil"`, `to="/app/me"`). Manter `<header>`, `<main>` e `<TabBar>` como estão.
- [ ] **Step 4: Correr → PASS** — `npx vitest run src/components/AppShell.test.tsx src/components/TabBar.test.tsx` e depois `npm test` (suite completa).
- [ ] **Step 5: lint+typecheck+build** → 0 erros.
- [ ] **Step 6: Commit** — `feat: top navbar horizontal para desktop` + push.

### Task 3: Design system (tokens + system.css + hovers)

**Files:**
- Modify: `frontend/src/styles/tokens.css`, `frontend/src/main.tsx` (importar system.css após tokens), `frontend/src/styles/landing.css` (hovers), `frontend/src/pages/Login.css` (hovers do submit/tabs)
- Create: `frontend/src/styles/system.css`

**Interfaces:**
- Consumes: tokens existentes (`--red`, `--ink`, `--gold`, `--fl`, `--mu`, `--ln`, `--font`).
- Produces: tokens novos exactos (spec §Secção 1): `--bp-sm/-md/-lg/-xl` (480/768/1024/1280px), `--sh-1/2/3`, `--ease`, `--t-fast: 150ms`, `--t-med: 200ms`; classes/selectores públicos: famílias **lift**, **chip**, **card** do system.css + `@keyframes pulse-badge`.

- [ ] **Step 1: Tokens** — acrescentar os 9 tokens ao fim do `:root` do `tokens.css`.
- [ ] **Step 2: `system.css`** — na ordem (famílias exactas da spec §Secção 1):
  - (a) `:focus-visible` global: `outline: 2px solid var(--red); outline-offset: 2px`.
  - (b) **lift**: seletores `.btn-red, .plans-continue, .btn, .submit, .chat-input button, .offer-actions button[aria-label='Aceitar proposta']` → `transition: transform var(--t-fast) var(--ease), box-shadow var(--t-med) var(--ease)`; `@media (hover: hover) { &:hover { transform: translateY(-2px); box-shadow: var(--sh-2) } }` + `&:active { transform: scale(.98) }`.
  - (c) **chips/tabs** (fundo+borda, sem lift): `.chip, .dash-tabs button, .chat-chips button, .field, .sort-select, .offer-actions button[aria-label='Recusar proposta']` → hover `border-color: var(--red)` / fundo `--fl`.
  - (d) **cards**: `.stat-card, .request-card, .plan-card, .chat-list-item, .me-row, .me-favorites a, .offer-list li, .landing .card` + a classe raiz de `components/ProfessionalCard.css` (grep no ficheiro para o nome exacto, ex.: `.prof-card`) → `@media (hover:hover) { &:hover { transform: translateY(-3px); box-shadow: var(--sh-2) } }` com transição `transform var(--t-fast) var(--ease), box-shadow var(--t-med) var(--ease)`.
  - (e) `@keyframes pulse-badge` (`scale(1)→(1.15)→(1)`, 600ms, 1 iteração) aplicado a `.app-bell .me-badge { animation: pulse-badge .6s var(--ease) }`.
  - (f) links de nav: `.app-topnav a:not(.app-logo):not(.app-bell):not(.app-avatar) ` e `.landing nav a` → transição de cor + `::after` `height:2px; background: currentColor; transform: scaleX(0)` → `scaleX(1)` no hover, `transform-origin: left`.
- [ ] **Step 3: Importar** — `main.tsx`: `import './styles/tokens.css'; import './styles/system.css';` (linha seguinte ao import actual de tokens — verificar ordem existente e acrescentar).
- [ ] **Step 4: Verificar** — `grep -c "hover: hover" src/styles/system.css` ≥ 4; `grep "t-fast" src/styles/tokens.css` ok; `npm run lint && npm run typecheck && npm run build` → 0 erros.
- [ ] **Step 5: Commit** — `feat: camada de design system com hovers e tokens` + push.

### Task 4: Shell desktop (largura, navs por divisa, login com padrão)

**Files:**
- Modify: `frontend/src/components/AppShell.css`, `frontend/src/pages/Login.css`

**Interfaces:**
- Consumes: tokens da Task 3, `.app-topnav` da Task 2.

- [ ] **Step 1: `AppShell.css`** — acrescentar (sem tocar nos blocos existentes):
  - `@media (min-width: 768px)`: `.app-header { display:none }`, `.tabbar { display:none }`, `.app-topnav { display:flex }`.
  - Base (fora de media query, com fallback mobile): `.app-topnav { display:none }`.
  - `@media (min-width: 768px)`: `.app-topnav` → `position: sticky; top:0; height:64px; background: var(--red); color:#fff; box-shadow: var(--sh-1); z-index:10`, interno `display:flex; align-items:center; gap:24px; padding:0 32px` com `.app-topnav-inner { max-width:1200px; margin:0 auto; width:100% }` (ou equivalente: envolver conteúdo numa div no Task 2 — se o markup não tiver wrapper, usar padding e `max-width` no próprio nav com margem automática); `.app-topnav-links { display:flex; gap:6px; margin-left:24px; flex:1 }`; itens `padding:8px 12px; border-radius:10px; gap:6px; font-weight:600; font-size:15px`; `.app-topnav .on { background: rgba(255,255,255,.16) }`.
  - `.app-main` `@media (min-width:768px)`: `max-width:1200px; padding:28px 32px 56px`.
  - `.app-avatar` → 36px, `border-radius:50%`, `background: rgba(255,255,255,.2)`, `display:grid; place-items:center; font-weight:700; font-size:13px; color:#fff`.
  - Mobile: `.app-topnav-links` escondido (`display:none` <768 via o `display:none` base + show no min-width) — garantir que <768 só `.app-header`+`.tabbar` aparecem.
- [ ] **Step 2: `Login.css`** — `@media (min-width:768px)`: fundo `.login-page` (ou wrapper existente) com o mesmo data-URI do padrão vermelho da landing (copiar de `landing.css` `.landing .hero` background-image), cartão centrado `max-width:420px; margin: 48px auto`.
- [ ] **Step 3: Verificar** — `grep -A2 "min-width: 768px" src/components/AppShell.css | grep -c "display"` ≥ 3; `npm run lint && npm run typecheck && npm run build` → 0.
- [ ] **Step 4: Commit** — `feat: shell web-first com topnav e largura desktop` + push.

### Task 5: Grelhas desktop — Home e Pesquisa

**Files:**
- Modify: `frontend/src/pages/app/Home.css`, `frontend/src/pages/app/Search.css`

**Interfaces:**
- Consumes: tokens; classes existentes (`.cat-grid`/`.cards`/`.search-grid` conforme ficheiro — inspecionar antes de escrever).

- [ ] **Step 1: Inspecionar** — `grep -n "grid-template-columns" src/pages/app/Home.css src/pages/app/Search.css` para identificar os seletores exactos.
- [ ] **Step 2: Home.css** — `@media (min-width:1024px)`: grelha de categorias → `repeat(4,1fr)`; secção top-rated → grelha/linha com 6-8 itens (se for scroll horizontal, `overflow-x: visible` e 6 colunas fixas); promo vermelho + chips de bairro em linha (`grid-template-columns: 1.4fr 1fr`) lado a lado; lista de profissionais → `repeat(3,1fr)`.
- [ ] **Step 3: Search.css** — `@media (min-width:1024px)`: grelha de resultados → `repeat(3,1fr)`; linha de filtros (input+chips+sort) `display:flex; gap:12px; align-items:center` com input a crescer (`flex:1`).
- [ ] **Step 4: Verificar** — `grep -c "min-width: 1024px" src/pages/app/Home.css src/pages/app/Search.css` ≥ 1 cada; `npm run lint && npm run typecheck && npm test && npm run build` → verdes (38 testes).
- [ ] **Step 5: Commit** — `feat: grelhas desktop para home e pesquisa` + push.

### Task 6: Perfil 2 colunas + Chat two-pane

**Files:**
- Modify: `frontend/src/pages/app/Profile.css`, `frontend/src/pages/app/ChatRoom.tsx` (+`ChatRoom.css`, `ChatList.css`), `frontend/src/pages/app/ChatRoom.test.tsx`
- Test: `frontend/src/pages/app/ChatRoom.test.tsx` (caso novo)

**Interfaces:**
- Consumes: `ChatList` (default export, já existe), `navItems` (não usado aqui).
- Produces: `.profile-layout` (2 colunas ≥1024), `.chat-room-layout` (aside + sala ≥1024).

- [ ] **Step 1: Teste falhante** — em `ChatRoom.test.tsx`: `beforeEach` passa a fazer `(listConversations as Mock).mockResolvedValue([])` (importar `listConversations` do mock); teste novo `mostra a lista de conversas como painel lateral`: render normal → `await screen.findByRole('list')` dentro de `container.querySelector('.chat-room-layout aside')` **ou** asserção simples: `container.querySelector('.chat-room-layout')` não nulo e contém texto de conversa vazio 'A carregar…'/'Nenhuma conversa ainda.'. Escolher: `expect(container.querySelector('.chat-room-layout aside .chat-list, .chat-room-layout aside .chat-list-empty')).not.toBeNull()` após await.
- [ ] **Step 2: Correr → FAIL** (`npx vitest run src/pages/app/ChatRoom.test.tsx`).
- [ ] **Step 3: Implementar** — `ChatRoom.tsx`: envolver o conteúdo actual num wrapper `<div className="chat-room-layout">` com `<aside className="chat-pane"><ChatList /></aside>` antes do `div.chat-room` actual (importar `ChatList`). CSS: `ChatRoom.css` → base `.chat-pane { display:none }`; `@media (min-width:1024px)`: `.chat-room-layout { display:grid; grid-template-columns: 320px 1fr; gap:24px; align-items:start }`, `.chat-pane { display:block; border-right:1px solid var(--ln); padding-right:16px; position:sticky; top:88px; max-height: calc(100vh - 120px); overflow:auto }`. `ChatList.css`: desktop `max-width:none` (remover/aplicar via min-width se necessário).
- [ ] **Step 4: Profile.css** — `@media (min-width:1024px)`: wrapper `.profile-page`/`.profile-top` → `grid-template-columns: 360px 1fr; gap:28px; align-items:start`; coluna esquerda (capa+stats+CTAs) `position:sticky; top:88px` (se a estrutura actual não tiver wrapper, envolver no `Profile.tsx` em `<div className="profile-layout"><div className="profile-aside">…</div><div className="profile-body">…</div></div>` — markup mínimo, sem mudar conteúdo).
- [ ] **Step 5: Correr → PASS + suite** — `npx vitest run src/pages/app/ChatRoom.test.tsx` e `npm test` (39 testes).
- [ ] **Step 6: lint+typecheck+build** → 0.
- [ ] **Step 7: Commit** — `feat: perfil em duas colunas e chat two-pane no desktop` + push.

### Task 7: Grelhas desktop — Pedidos, Planos, Pagamento, Painel

**Files:**
- Modify: `frontend/src/pages/app/Requests.css`, `frontend/src/pages/app/NewRequest.css`, `frontend/src/pages/app/Plans.css`, `frontend/src/pages/app/Payment.css`, `frontend/src/pages/app/Dashboard.css`

**Interfaces:**
- Consumes: tokens; classes existentes (grep `grid-template-columns`/wrapper antes de escrever).

- [ ] **Step 1: Requests.css** — `@media (min-width:1024px)`: `.request-cards` → `repeat(2,1fr)`; `.requests-header` mantém flex.
- [ ] **Step 2: NewRequest.css** — `@media (min-width:1024px)`: `.new-request` → `display:grid; grid-template-columns: 1fr 1fr; gap:16px 24px` com `h1`, `textarea`/`.field` de descrição, toasts e submit a ocuparem `grid-column: 1 / -1`.
- [ ] **Step 3: Plans.css + Payment.css** — `@media (min-width:1024px)`: `.plan-grid` → `repeat(4,1fr)` (Plans.css); em `Payment.css`, o wrapper do cartão de pagamento → `max-width:560px; margin:0 auto` (`.payment-activated` mantém centrado).
- [ ] **Step 4: Dashboard.css** — `@media (min-width:1024px)`: `.stat-grid` mantém 3 col mas com `padding` maior; `.bar-chart` → `height:260px`; oferta pendente em linha (`li` grid com preço à direita — já parcialmente; ajustar `grid-template-columns:1fr auto`).
- [ ] **Step 5: Verificar** — `grep -c "min-width: 1024px"` nos 5 ficheiros ≥ 1 cada; `npm run lint && npm run typecheck && npm test && npm run build` → verdes.
- [ ] **Step 6: Commit** — `feat: grelhas desktop para pedidos, planos e painel` + push.

### Task 8: Coluna confortável — Me, Notificações, Editar perfil

**Files:**
- Modify: `frontend/src/pages/app/Me.css`, `frontend/src/pages/app/Notifications.css`, `frontend/src/pages/app/EditProfile` (usa `NewRequest.css`)

**Interfaces:**
- Consumes: tokens.

- [ ] **Step 1: Me.css** — `@media (min-width:1024px)`: `.me-page { max-width:720px; margin:0 auto; padding-top:8px }`; `.me-card { padding:24px }`; menu com `font-size:15px`.
- [ ] **Step 2: Notifications.css** — `@media (min-width:1024px)`: `.notif-list { max-width:720px; margin:0 auto }`, itens com `padding:16px 18px`.
- [ ] **Step 3: NewRequest.css** (secção edit-profile) — `@media (min-width:1024px)`: `.edit-profile { max-width:720px; margin:0 auto }`.
- [ ] **Step 4: Verificar** — grep `min-width: 1024px` em cada; `npm run lint && npm run typecheck && npm test && npm run build` → verdes.
- [ ] **Step 5: Commit** — `feat: coluna desktop respirada para perfil e notificações` + push.

### Task 9: Motion — transições de página e staggers

**Files:**
- Modify: `frontend/src/components/AppShell.tsx` (wrapper do `Outlet`), `frontend/src/components/MotionPage.tsx` (assegurar `exit`), `frontend/src/pages/app/Requests.tsx`, `frontend/src/pages/app/Notifications.tsx`, `frontend/src/pages/app/Home.tsx` (stagger onde faltar)
- Test: nenhum novo — verificação é a suite completa.

**Interfaces:**
- Consumes: `motion/react` `AnimatePresence`, `MotionPage` existente, `useLocation`.
- Produces: transição de página activa em todas as rotas internas (Search/Plans/Dashboard já têm stagger próprio — não repetir).

- [ ] **Step 1: Inspecionar** — `cat src/components/MotionPage.tsx`; confirmar `initial/animate/exit` presentes (se não tiver `exit`, acrescentar `exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } } }`).
- [ ] **Step 2: AppShell.tsx** — `const location = useLocation()`; `<main className="app-main">` envolto:
  ```tsx
  <AnimatePresence mode="wait" initial={false}>
    <MotionPage key={location.pathname}>
      <Outlet />
    </MotionPage>
  </AnimatePresence>
  ```
- [ ] **Step 3: Staggers em falta** — `Requests.tsx`: `motion.ul`/`motion.li` com `initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay: i*0.06}}`; `Notifications.tsx`: `motion.li` idem; `Home.tsx`: grelha principal com `motion.div` + delay por índice (se já houver, passar ao passo seguinte — verificar com `grep motion src/pages/app/Home.tsx`).
- [ ] **Step 4: Correr → PASS** — `cd frontend && npm test` (39 testes, nenhum teste renderiza `<App/>` — confirmar `grep -rln "render(<App" src/` sem resultados) + `npm run lint && npm run typecheck && npm run build`.
- [ ] **Step 5: Commit** — `feat: transições de página e staggers de grelha` + push.

### Task 10: Verificação final, smoke e docs

**Files:**
- Modify: `docs/situation.md` (secção de estado do redesign), `readme.md` (seção "Layout" curta)

- [ ] **Step 1: Suite global** — `cd backend && npm run lint && npm run typecheck && npm test` (91) e `cd frontend && npm run lint && npm run typecheck && npm test && npm run build` (39) → tudo 0/verde.
- [ ] **Step 2: Smoke visual** — `npm run dev` (raiz); `curl -s http://localhost:5173 | head -c 200` responde; verificar no browser (ou via grep final) os 5 pontos do Review Focus; parar processos.
- [ ] **Step 3: Docs** — `docs/situation.md`: adicionar linha na tabela de verificação (39 testes frontend) e parágrafo "Redesign web-first (2026-11-15)" com divisas 768/1024 e sistema de hover; `readme.md`: nota curta de layout responsivo.
- [ ] **Step 4: Commit + push final** — `docs: situação após redesign web-first` + `git push`.
