# FASE 4 — subscrições e pagamentos (backend)

Notas de encerramento da FASE 4. Não inclui frontend nem Splash Screen.

## Relógio

Todos os serviços de subscrição recebem `now` como parâmetro (`systemClock()` por
omissão). Os testes usam `vi.useFakeTimers({ toFake: ['Date'] })` com `2030-01-01T12:00:00Z`.
Não há `now()` do PostgreSQL em decisões temporais de negócio no código de serviço:
a renovação calcula `GREATEST(expires_at, now) + dias do plano` em JavaScript
(`Math.max(expires_at, now.getTime())`).

Ocorrências de `now()` no SQL que **não** são decisões de negócio em runtime:

- `migrations/0002_subscriptions_and_admin.sql`: `DEFAULT now()` em colunas de
  auditoria e `now()` no backfill único de 2026 (executado uma vez na migração).
- `migrations/0003_client_moderation.sql`: apenas `DEFAULT now()`.
- `backend/tests/*.test.ts`: `now()` em dados de fixture/backfill, não na lógica
  testada.

## Moderação (limitação conhecida)

As colunas `users.blocked` e `users.suspended` são **aditivas**, com
`DEFAULT false`, introduzidas em `migrations/0003_client_moderation.sql`.

- São lidas em `activateByMessage()` (`subscriptions.service.ts`): um cliente
  bloqueado ou suspenso não activa a subscrição pela primeira mensagem.
- **Não existe API administrativa para as alterar** nesta fase. Não há rota,
  controller, serviço ou ecrã para moderação; as únicas escritas estão em
  `backend/tests/subscriptions.test.ts`, por SQL directo à BD de teste.
- A gestão destes campos ficará para uma fase posterior e tem de ser decidida
  explicitamente (incluindo quem pode bloquear e como rever uma decisão).

## Transacção mensagem + activação

`sendMessage()` insere a mensagem, actualiza `conversations.last_message_at` e
chama `activateByMessage()` com a **mesma transacção** (`tx`). Se a aquisição da
lock `biskato:sub:<id>` falhar, a transacção inteira é revertida: não fica
mensagem órfã nem actualização de conversa. Uma nova tentativa com o mesmo input
produz exactamente uma mensagem.

A assinatura pública de `sendMessage()` não mudou; o controller REST e o
handler socket continuam a chamar da mesma forma.

## Agendador

`runSubscriptionsJob()` usa a lock `biskato:subscriptions-job` e actualiza com
predicado `status = 'pending_activation'` + `RETURNING`. A activação por
mensagem usa a lock `biskato:sub:<id>` e o mesmo predicado, pelo que apenas uma
das duas pode activar uma mesma subscrição.
