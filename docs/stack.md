# Stack

| Camada | Tecnologia | Versão | Porquê |
| --- | --- | --- | --- |
| Runtime | Node.js | 26.4 | LTS-ish actual, sem Docker (regra do projeto), `npm` nativo |
| Linguagem | TypeScript | 6 (backend) / ~7 (frontend) | tipar DTOs, serviços e componentes; tsc como verificação obrigatória |
| API | Express | 5.3 | simples, middleware chain clara; com zod para validação de entrada |
| Validação | zod | 4.6 | schemas partilhados em `src/dto`, mensagens de erro legíveis para a UI |
| ORM | Drizzle ORM | 0.45 + drizzle-kit 0.31 | SQL próximo do metal, `push` sem migrations, transacções p/ reviews e pagamentos |
| BD | PostgreSQL | 18.4 | JSONB para `payload` das mensagens, enums nativos, transacções; local via socket `/run/postgresql` |
| Tempo real | Socket.IO | 4.8 (server + client) | rooms (`conversation:join`), acks, presença e typing com reconnect automático |
| Auth | jsonwebtoken + bcryptjs | 9 / 3 | JWT stateless em `Authorization: Bearer`; bcrypt só no servidor |
| Uploads | multer | 2.5 | multipart limitado a 5MB/jpg-png-webp, nomes uuid, servidos em `/uploads` |
| HTTP client | axios | 1.21 | interceptor injeta o token e trata 401 (evento `auth:logout`) |
| Frontend | React | 19.3 | SPA com hooks; `main.tsx` envolve `MotionConfig reducedMotion="user"` |
| Bundler/dev | Vite | 8.3 | arranque instantâneo, `vitest` integrado no mesmo config |
| Router | react-router-dom | 7 | rotas `/login`, `/app/*` protegidas com layout `AppShell` + Outlet |
| Motion | motion (framer) | 14 | `AnimatePresence` (splash, mensagens), `whileInView` (landing), stagger |
| Ícones | lucide-react | 1.73 | ícones ligeiros para a TabBar |
| Testes backend | vitest + supertest | 5.1 / 7.3 | API real com `app` exportada; `globalSetup` faz push+truncate da bd de testes |
| Testes frontend | vitest + testing-library + jsdom | 5.1 / 16.3 | testes por página/componente com router e mocks de módulo |
| Lint | eslint (backend) · oxlint (frontend) | 10.15 / 1.90 | oxlint é rápido; warnings actuais do react pedem atenção ao refact |

## Decisões transversais

- **Monorepo simples** (sem workspaces): `npm --prefix`, scripts na raiz — zero
  config extra, tudo corrido na mesma branch.
- **Sem Docker**: Postgres instalado no sistema, testes usam `biscate_test`
  isolada com `TRUNCATE … RESTART IDENTITY CASCADE` por run.
- **Pagamentos simulados**: entidade `90210` + referência única; a confirmação
  manual (`Já paguei`) activa `plan_expires_at`. Gateway real = futuro.
- **Uploads locais**: `backend/uploads/` gitignored; migração para object
  storage (S3 etc.) é uma camada em `middleware/upload.ts`.
- **SPA + API em portas diferentes**: CORS restrito a `CORS_ORIGIN` em dev.
