# Biscate — Redesign Web-First Responsivo

**Data:** 2026-11-15
**Estado:** aprovado em brainstorming (secções 1-3), aguarda revisão
**Contexto:** o Biscate foi implementado mobile-first (herdado do protótipo
telemóvel). O utilizador pediu que a versão seja **web-first**, com hover,
animações nos botões, motion e responsividade — em tudo (landing, login e
app interna).

## Intenção e critérios de sucesso

- A app abre no computador como uma app web de largura completa (≈1200px),
  navegável por top navbar horizontal; o telemóvel mantém o layout actual
  (TabBar inferior) — responsivo, não mobile-only.
- Todo o interactivos tem feedback visível (`:hover`, `:active`,
  `:focus-visible`) com intensidade **polida e subtil**: elevação
  `translateY(-2px)`, escala `0.98` ao premir, transições 150-200ms.
- Motion coerente: transições de página e stagger de grelhas, sempre com
  respeito por `prefers-reduced-motion`.
- **Sucesso:** `lint + typecheck + test + build` verdes nos dois packages,
  129 testes existentes intactos, novos testes de navegação a passar.

## Fora de escopo

- Dependências novas (sem Tailwind/shadcn/UI kit) — CSS partilhado, padrão do repo.
- Mudanças de API/backend, novas rotas, alterações de conteúdo textual da landing.
- Tema escuro, i18n, drag-and-drop.

## Secção 1 — Design system (tokens + interacção global)

**`frontend/src/styles/tokens.css` (extensão):**

```css
/* breakpoints (documentados; usados nas media queries) */
--bp-sm: 480px; --bp-md: 768px; --bp-lg: 1024px; --bp-xl: 1280px;
/* sombras */
--sh-1: 0 1px 2px rgb(17 17 17 / 0.06);
--sh-2: 0 6px 18px rgb(17 17 17 / 0.10);
--sh-3: 0 14px 34px rgb(17 17 17 / 0.14);
/* movimento */
--ease: cubic-bezier(0.2, 0.7, 0.3, 1);
--t-fast: 150ms; --t-med: 200ms;
```

**Novo `frontend/src/styles/system.css`** (importado em `main.tsx`, depois de
`tokens.css`):

- `:focus-visible` global: `outline: 2px solid var(--red); outline-offset: 2px`.
- Hovers só dentro de `@media (hover: hover)` (touch não fica "grudado").
- Regras explícitas por família — **nunca** `button:hover` amplo (evita
  apanhar estrelas, TabBar e botões de ícone):
  - **Lift** (`translateY(-2px)` + `--sh-2`, `:active { scale(.98) }`,
    `transition: transform var(--t-fast) var(--ease), box-shadow var(--t-med) var(--ease)`):
    `.btn-red`, `.plans-continue`, `.btn` (landing), submit do login,
    `.chat-input button`, `.offer-actions button[aria-label='Aceitar proposta']`.
  - **Chips/tabs** (fundo + borda, sem lift): `.chip`, `.dash-tabs button`,
    `.chat-chips button`, `.field`/filtros da pesquisa, `.offer-actions` recusar.
  - **Cards** (`translateY(-3px)` + `--sh-2`): `.stat-card`, `.request-card`,
    `.plan-card`, `.chat-list-item`, `.me-row`, `.me-favorites a`,
    `.offer-list li`, `.ProfessionalCard`, cartões da landing.
  - **Links de navegação**: transição de cor para `--red` + sublinhado
    animado (`::after` scaleX 0→1) na topnav e nav da landing.
- `@keyframes`: pulse curto no badge do sino (uma iteração); utilitários
  `.enter`/`.leave` usados apenas onde fizer sentido.
- `prefers-reduced-motion: reduce` continua global no `index.css` (não mudar).

## Secção 2 — Shell e navegação

- **Divisa: 768px (`--bp-md`)**. Abaixo = layout actual. Acima = top navbar + conteúdo largo.
- **`AppShell` renderiza as duas navegações sempre**; a visibilidade é só
  CSS (`display:none`). Sem `matchMedia` em render → testes existentes não mudam.
  No browser real `display:none` remove a navegação inactiva da árvore a11y
  (sem roles duplicados).
- **Fonte única de entradas:** extrair `navItems(role)` de `TabBar.tsx` para
  um export partilhado (ex.: `components/navItems.ts`) usado por TabBar e topnav.
  - Cliente: Início, Pesquisa, Mensagens, Pedidos, Perfil
  - Profissional: Início, Pesquisa, Mensagens, Planos, Painel, Perfil
- **Topnav (≥768px)** — `.app-topnav`: logo `biscate` · links horizontais
  ícone+texto (lucide) com o hover da secção 1 · à direita sino (NavLink
  `/app/me`, badge) + avatar (iniciais → `/app/me`). Sticky no topo,
  fundo `--red`, `box-shadow: var(--sh-1)`, `height: 64px`,
  `aria-label="Navegação principal"`. Max-width interno alinhado a `.app-main`.
- **TabBar (<768px)**: comportamento e estilo actuais, `aria-label` distinto
  (ex.: "Menu principal").
- **`.app-main`**: desktop `max-width: 1200px; padding: 28px 32px 56px`;
  mobile mantém `16px 16px 88px` e `max-width: 720px`.
- **Login**: cartão centrado 420px sobre padrão vermelho do hero em ≥768px
  (reutilizar o data-URI do padrão da landing); mobile igual ao actual.
- **Landing**: estrutura desktop mantida; ganha hovers/lift da secção 1.

## Secção 3 — Grelhas por página, motion, testes

### Layouts desktop (≥1024px salvo indicação)

| Página | Mobile | Desktop |
| --- | --- | --- |
| Home | coluna, categorias 3-col | categorias 4 col; top-rated em linha larga (6-8 cards); promo + chips de bairro lado a lado |
| Pesquisa | lista vertical | grelha 3 col de resultados; chips+sort numa linha |
| Perfil | coluna única | 2 col: capa/stats/CTAs sticky à esquerda; tabs à direita |
| Chat | lista → sala (rotas separadas) | two-pane ≥1024: `.chat-list` fixo 320px + sala; <1024 mantém rotas |
| Pedidos | cartões empilhados | grelha 2 col; NewRequest em 2 col |
| Planos/Pagamento | 2 col | 4 col; cartão de pagamento 560px centrado |
| Painel | stats 3-col | stats largas + propostas em lista larga; gráfico + altura |
| Me/Notificações/Editar | coluna única | coluna 720px centrada com respiração |

Implementação: **todas as media queries novas usam `min-width`** (a regra
desktop declara-se no fim e só acrescenta; os blocos mobile existentes
ficam intactos e são o fallback — nenhuma regra actual é reescrita ou
duplicada).

### Motion

- `App.tsx`: `<Outlet>` envolto em `AnimatePresence mode="wait"` com
  `MotionPage` (fade + `y: 8`, 250ms, saída 150ms). Respeitar
  `MotionConfig reducedMotion="user"` (já activo em `main.tsx`).
- Stagger de entrada (0.06-0.09s) nas grelhas: Home, Pesquisa, Pedidos,
  Planos, Notificações. Dashboard já tem; chat/splash não mudam.
- Botões/chips: transformações **só em CSS** (secção 1), sem motion library.

### Testes (TDD) e verificação

- **Regra:** os 129 testes existentes ficam verdes (nenhum lê CSS; TabBar
  continua montada).
- Novos:
  1. `components/navItems.test.ts` — entradas por papel (cliente/profissional).
  2. `components/AppShell.test.tsx` — topnav presente com
     `aria-label="Navegação principal"`, links certos para o papel do
     utilizador mockado, e avatar/sino com destino `/app/me`.
- Acessibilidade: um único `nav` visível por breakpoint (via `display:none`),
  `:focus-visible` global, `aria-current` nos links activos (NavLink já dá).
- Verificação final: `backend: lint+typecheck+test`,
  `frontend: lint+typecheck+test+build`, smoke `npm run dev` + inspecção
  manual em ≥1024px e ≤768px.

## Ficheiros a tocar

`tokens.css`, novo `system.css`, `main.tsx`, `App.tsx`, `AppShell.tsx/.css`,
`TabBar.tsx`, novo `components/navItems.ts` (+ testes), CSS de
`Home, Search, Profile, ChatList, ChatRoom, Requests, NewRequest, Plans,
Payment, Dashboard, Me, Notifications, EditProfile, Login`,
`styles/landing.css` (só hovers). **Zero dependências novas.**

## Riscos

- Duplicidade de regras mobile/desktop → mitigado: estender breakpoints
  existentes, não reescrever os blocos mobile.
- Ambiguidade de roles em jsdom (ambas as navs no DOM) → `aria-label`s
  distintos; nenhum teste actual consulta `role=navigation`.
- Query selectors partilhados (ex.: `getByText('Hoje')`) — inalterados por CSS.
