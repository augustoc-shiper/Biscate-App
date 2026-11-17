import { and, desc, eq, inArray, isNull, lte, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  conversations,
  payments,
  plans,
  professionalProfiles,
  subscriptions,
  users,
} from '../db/schema.js';
import { ACTIVATION_GRACE_DAYS, addDays, systemClock } from '../lib/clock.js';
import { AppError } from '../lib/AppError.js';

/** Transacção do Drizzle (node-postgres). */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const ENTITY = '90210';
const BLOCKING_STATUSES = ['pending_payment', 'pending_activation', 'pending_review'] as const;
const APPROVABLE_STATUSES = ['pending', 'proof_sent', 'confirmed'] as const;

function randomReference(): string {
  const digits = Array.from({ length: 9 }, () =>
    Math.floor(Math.random() * 10),
  ).join('');
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
}

/**
 * Locks com ordem FIXA: profissional -> pagamento -> subscrição.
 * `pg_try_advisory_xact_lock` só é válido dentro da transacção que o adquire.
 */
async function tryLock(tx: Tx, key: string): Promise<boolean> {
  const res = await tx.execute(
    sql`select pg_try_advisory_xact_lock(hashtext(${key})) as ok`,
  );
  const row = res.rows[0] as { ok: boolean } | undefined;
  return Boolean(row?.ok);
}

async function acquireLocks(tx: Tx, keys: string[]): Promise<void> {
  for (const key of keys) {
    const acquired = await tryLock(tx, key);
    if (!acquired) {
      throw new AppError(
        409,
        'LOCK_BUSY',
        'Outra operação está a decorrer; tente novamente.',
      );
    }
  }
}

async function subscriptionForPayment(
  tx: Tx,
  payment: typeof payments.$inferSelect,
): Promise<typeof subscriptions.$inferSelect | undefined> {
  if (payment.subscriptionId) {
    const byId = await tx.query.subscriptions.findFirst({
      where: eq(subscriptions.id, payment.subscriptionId),
    });
    if (byId) return byId;
  }
  return tx.query.subscriptions.findFirst({
    where: eq(subscriptions.paymentId, payment.id),
  });
}

/** Visibilidade e activação andam sempre juntas. */
async function syncProfile(
  tx: Tx,
  professionalId: string,
  expiry: Date,
  _now: Date,
): Promise<void> {
  const existing = await tx.query.professionalProfiles.findFirst({
    where: eq(professionalProfiles.userId, professionalId),
  });
  if (existing) {
    await tx
      .update(professionalProfiles)
      .set({ planExpiresAt: expiry, discoverableUntil: expiry })
      .where(eq(professionalProfiles.userId, professionalId));
  } else {
    await tx
      .insert(professionalProfiles)
      .values({
        userId: professionalId,
        planExpiresAt: expiry,
        discoverableUntil: expiry,
      })
      .onConflictDoNothing();
  }
}

async function uniqueReference(tx: Tx): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const reference = randomReference();
    const exists = await tx.query.payments.findFirst({
      where: eq(payments.reference, reference),
    });
    if (!exists) return reference;
  }
  throw new AppError(500, 'INTERNAL_ERROR', 'Não foi possível gerar referência');
}

export async function listPlans() {
  return db.select().from(plans).orderBy(plans.days);
}

export async function listPayments(professionalId: string) {
  return db
    .select()
    .from(payments)
    .where(eq(payments.professionalId, professionalId))
    .orderBy(desc(payments.createdAt));
}

/**
 * Leitura para a UI do profissional: estado corrente e histórico de subscrições.
 * Não altera nada e não expõe dados de outros profissionais.
 */
export async function getMySubscription(professionalId: string) {
  const rows = await db
    .select({
      id: subscriptions.id,
      status: subscriptions.status,
      planId: subscriptions.planId,
      planName: plans.name,
      planDays: plans.days,
      planPriceKz: plans.priceKz,
      paymentId: subscriptions.paymentId,
      paymentReference: payments.reference,
      paymentEntity: payments.entity,
      paymentStatus: payments.status,
      approvedAt: subscriptions.approvedAt,
      activationDeadline: subscriptions.activationDeadline,
      activatedAt: subscriptions.activatedAt,
      expiresAt: subscriptions.expiresAt,
      needsReview: subscriptions.needsReview,
      reviewReason: subscriptions.reviewReason,
      createdAt: subscriptions.createdAt,
      updatedAt: subscriptions.updatedAt,
    })
    .from(subscriptions)
    .leftJoin(plans, eq(subscriptions.planId, plans.id))
    .leftJoin(payments, eq(subscriptions.paymentId, payments.id))
    .where(eq(subscriptions.professionalId, professionalId))
    .orderBy(desc(subscriptions.createdAt));

  return { current: rows[0] ?? null, history: rows };
}

/**
 * Compra. Bloqueia estados pendentes. Renovação (já existe `active`) não cria
 * nova subscrição: apenas liga o pagamento à subscrição corrente.
 */
export async function createPayment(
  professionalId: string,
  planId: number,
  now: Date = systemClock(),
) {
  const plan = await db.query.plans.findFirst({ where: eq(plans.id, planId) });
  if (!plan) {
    throw new AppError(404, 'NOT_FOUND', 'Plano não encontrado');
  }

  return db.transaction(async (tx) => {
    await acquireLocks(tx, [`biskato:sub:buy:${professionalId}`]);

    const current = await tx.query.subscriptions.findMany({
      where: eq(subscriptions.professionalId, professionalId),
      orderBy: [desc(subscriptions.createdAt)],
    });
    if (current.some((s) => (BLOCKING_STATUSES as readonly string[]).includes(s.status))) {
      throw new AppError(
        409,
        'PAYMENT_IN_PROGRESS',
        'Já existe um pagamento ou subscrição em curso.',
      );
    }
    const active = current.find((s) => s.status === 'active');

    const reference = await uniqueReference(tx);
    const [created] = await tx
      .insert(payments)
      .values({
        professionalId,
        planId,
        entity: ENTITY,
        reference,
        amountKz: plan.priceKz,
        status: 'pending',
        createdAt: now,
      })
      .returning();

    let subscriptionId: string;
    if (active) {
      subscriptionId = active.id;
    } else {
      const [createdSub] = await tx
        .insert(subscriptions)
        .values({
          professionalId,
          planId,
          paymentId: created.id,
          status: 'pending_payment',
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      subscriptionId = createdSub.id;
    }

    await tx
      .update(payments)
      .set({ subscriptionId })
      .where(eq(payments.id, created.id));

    return {
      ...created,
      subscriptionId,
      isRenewal: Boolean(active),
    };
  });
}

/** Comprovativo enviado pelo profissional (ramo manual/proof). */
export async function attachProof(
  professionalId: string,
  paymentId: string,
  proofUrl: string,
  now: Date = systemClock(),
) {
  const payment = await db.query.payments.findFirst({
    where: eq(payments.id, paymentId),
  });
  if (!payment) {
    throw new AppError(404, 'NOT_FOUND', 'Pagamento não encontrado');
  }
  if (payment.professionalId !== professionalId) {
    throw new AppError(403, 'FORBIDDEN', 'Pagamento não pertence a este usuário');
  }
  if (payment.status !== 'pending' && payment.status !== 'proof_sent') {
    throw new AppError(409, 'INVALID_STATE', 'Não é possível enviar comprovativo');
  }

  const [updated] = await db
    .update(payments)
    .set({ status: 'proof_sent', proofUrl, proofSentAt: now })
    .where(
      and(
        eq(payments.id, paymentId),
        inArray(payments.status, ['pending', 'proof_sent']),
      ),
    )
    .returning();
  if (!updated) {
    throw new AppError(409, 'INVALID_STATE', 'Não é possível enviar comprovativo');
  }
  return updated;
}

/**
 * Pipeline único de aplicação de pagamento confirmado.
 * Idempotente por `applied_at IS NULL` e protegido por locks de pagamento/subscrição.
 * Chamado pela aprovação admin e preparado para gateways futuros.
 */
export async function applyConfirmedPayment(
  paymentId: string,
  now: Date = systemClock(),
  tx?: Tx,
) {
  const run = async (t: Tx) => {
    const initial = await t.query.payments.findFirst({
      where: eq(payments.id, paymentId),
    });
    if (!initial) {
      throw new AppError(404, 'NOT_FOUND', 'Pagamento não encontrado');
    }
    await acquireLocks(t, [
      `biskato:payment:${paymentId}`,
      ...(initial.subscriptionId ? [`biskato:sub:${initial.subscriptionId}`] : []),
    ]);

    const payment = await t.query.payments.findFirst({
      where: eq(payments.id, paymentId),
    });
    if (!payment) {
      throw new AppError(404, 'NOT_FOUND', 'Pagamento não encontrado');
    }
    if (payment.appliedAt) {
      return {
        applied: false,
        payment,
        subscription: await subscriptionForPayment(t, payment),
      };
    }

    const plan = await t.query.plans.findFirst({
      where: eq(plans.id, payment.planId),
    });
    if (!plan) {
      throw new AppError(404, 'NOT_FOUND', 'Plano não encontrado');
    }

    // Porta condicional de idempotência: só um concorrente avança.
    const [claimed] = await t
      .update(payments)
      .set({ appliedAt: now })
      .where(and(eq(payments.id, paymentId), isNull(payments.appliedAt)))
      .returning();
    if (!claimed) {
      const current = await t.query.payments.findFirst({
        where: eq(payments.id, paymentId),
      });
      return {
        applied: false,
        payment: current!,
        subscription: await subscriptionForPayment(t, current!),
      };
    }

    let sub = await subscriptionForPayment(t, payment);
    if (!sub) {
      const [created] = await t
        .insert(subscriptions)
        .values({
          professionalId: payment.professionalId,
          planId: payment.planId,
          paymentId: payment.id,
          status: 'pending_payment',
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      await t
        .update(payments)
        .set({ subscriptionId: created.id })
        .where(eq(payments.id, payment.id));
      sub = created;
    } else if (sub.status === 'expired' || sub.status === 'rejected') {
      // A subscrição ligada ao pagamento terminou antes da aprovação:
      // este pagamento passa a originar uma nova subscrição.
      const [created] = await t
        .insert(subscriptions)
        .values({
          professionalId: payment.professionalId,
          planId: payment.planId,
          paymentId: payment.id,
          status: 'pending_payment',
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      await t
        .update(payments)
        .set({ subscriptionId: created.id })
        .where(eq(payments.id, payment.id));
      sub = created;
    }

    // Renovação: GREATEST(expires_at, now) + duração do plano.
    // `now` é o parâmetro injectado pelo serviço; nunca now() do PostgreSQL.
    if (sub.status === 'active') {
      const base = Math.max(sub.expiresAt?.getTime() ?? 0, now.getTime());
      const newExpiry = addDays(new Date(base), plan.days);
      const [updated] = await t
        .update(subscriptions)
        .set({ expiresAt: newExpiry, updatedAt: now })
        .where(and(eq(subscriptions.id, sub.id), eq(subscriptions.status, 'active')))
        .returning();
      const finalSub = updated ?? (await t.query.subscriptions.findFirst({
        where: eq(subscriptions.id, sub.id),
      }));
      if (updated) await syncProfile(t, payment.professionalId, newExpiry, now);
      return { applied: true, payment: claimed, subscription: finalSub! };
    }

    // Primeira compra: aprovado, mas activado só na 1.ª mensagem ou no prazo.
    if (
      (['pending_payment', 'pending_review', 'pending_activation'] as string[]).includes(
        sub.status,
      )
    ) {
      const deadline = sub.activationDeadline ?? addDays(now, ACTIVATION_GRACE_DAYS);
      const [updated] = await t
        .update(subscriptions)
        .set({
          status: 'pending_activation',
          approvedAt: sub.approvedAt ?? now,
          activationDeadline: deadline,
          updatedAt: now,
        })
        .where(
          and(
            eq(subscriptions.id, sub.id),
            inArray(subscriptions.status, [
              'pending_payment',
              'pending_review',
              'pending_activation',
            ]),
          ),
        )
        .returning();
      const finalSub = updated ?? (await t.query.subscriptions.findFirst({
        where: eq(subscriptions.id, sub.id),
      }));
      if (updated) {
        await t
          .update(professionalProfiles)
          .set({ discoverableUntil: deadline })
          .where(eq(professionalProfiles.userId, payment.professionalId));
      }
      return { applied: true, payment: claimed, subscription: finalSub! };
    }

    throw new AppError(
      409,
      'SUBSCRIPTION_STATE',
      `Subscrição em estado ${sub.status} não pode ser aplicada.`,
    );
  };

  if (tx) return run(tx);
  return db.transaction(run);
}

/** Aprovação admin: aprova o pagamento e aplica o pipeline uma única vez. */
export async function approvePayment(
  paymentId: string,
  adminId: string,
  now: Date = systemClock(),
) {
  const initial = await db.query.payments.findFirst({
    where: eq(payments.id, paymentId),
  });
  if (!initial) {
    throw new AppError(404, 'NOT_FOUND', 'Pagamento não encontrado');
  }

  return db.transaction(async (tx) => {
    // Ordem fixa: pagamento -> (subscrição, dentro do pipeline).
    // Não usamos a lock de compra aqui para que aprovação e compra não se
    // bloqueiem mutuamente; a compra é barrada pelo estado da subscrição.
    await acquireLocks(tx, [`biskato:payment:${paymentId}`]);

    const payment = await tx.query.payments.findFirst({
      where: eq(payments.id, paymentId),
    });
    if (!payment) {
      throw new AppError(404, 'NOT_FOUND', 'Pagamento não encontrado');
    }
    if (payment.status === 'rejected') {
      throw new AppError(409, 'PAYMENT_REJECTED', 'Pagamento rejeitado');
    }

    if (payment.appliedAt) {
      // Legado confirmed: normaliza o estado sem reaplicar dias.
      if (payment.status === 'confirmed' && !payment.approvedAt) {
        await tx
          .update(payments)
          .set({ status: 'approved', approvedAt: payment.appliedAt })
          .where(eq(payments.id, payment.id));
      }
      return {
        applied: false,
        payment: await tx.query.payments.findFirst({ where: eq(payments.id, paymentId) }),
        subscription: await subscriptionForPayment(tx, payment),
      };
    }

    const [approved] = await tx
      .update(payments)
      .set({ status: 'approved', approvedAt: now, approvedBy: adminId })
      .where(
        and(
          eq(payments.id, paymentId),
          inArray(payments.status, [...APPROVABLE_STATUSES]),
          isNull(payments.approvedAt),
        ),
      )
      .returning();

    if (!approved) {
      const current = await tx.query.payments.findFirst({
        where: eq(payments.id, paymentId),
      });
      return {
        applied: false,
        payment: current!,
        subscription: await subscriptionForPayment(tx, current!),
      };
    }

    const result = await applyConfirmedPayment(paymentId, now, tx);
    return { ...result, payment: result.payment ?? approved };
  });
}

/** Rejeição admin: estado terminal; nunca reverte um pagamento já aprovado. */
export async function rejectPayment(
  paymentId: string,
  adminId: string,
  now: Date = systemClock(),
) {
  const initial = await db.query.payments.findFirst({
    where: eq(payments.id, paymentId),
  });
  if (!initial) {
    throw new AppError(404, 'NOT_FOUND', 'Pagamento não encontrado');
  }

  return db.transaction(async (tx) => {
    await acquireLocks(tx, [`biskato:payment:${paymentId}`]);

    const payment = await tx.query.payments.findFirst({
      where: eq(payments.id, paymentId),
    });
    if (!payment) {
      throw new AppError(404, 'NOT_FOUND', 'Pagamento não encontrado');
    }
    if (payment.status === 'approved' || payment.status === 'rejected' || payment.appliedAt) {
      return {
        rejected: false,
        payment,
        subscription: await subscriptionForPayment(tx, payment),
      };
    }

    const [rejected] = await tx
      .update(payments)
      .set({ status: 'rejected', rejectedAt: now })
      .where(
        and(
          eq(payments.id, paymentId),
          inArray(payments.status, [...APPROVABLE_STATUSES]),
          isNull(payments.rejectedAt),
        ),
      )
      .returning();

    if (!rejected) {
      const current = await tx.query.payments.findFirst({
        where: eq(payments.id, paymentId),
      });
      return {
        rejected: false,
        payment: current!,
        subscription: await subscriptionForPayment(tx, current!),
      };
    }

    const sub = await subscriptionForPayment(tx, payment);
    if (sub && (BLOCKING_STATUSES as readonly string[]).includes(sub.status)) {
      await tx
        .update(subscriptions)
        .set({ status: 'rejected', updatedAt: now })
        .where(eq(subscriptions.id, sub.id));
    }
    // Remove a visibilidade temporária eventualmente concedida na aprovação.
    await tx
      .update(professionalProfiles)
      .set({ discoverableUntil: now })
      .where(eq(professionalProfiles.userId, payment.professionalId));

    return {
      rejected: true,
      payment: rejected,
      subscription: sub
        ? await tx.query.subscriptions.findFirst({ where: eq(subscriptions.id, sub.id) })
        : undefined,
    };
  });
}

export type ActivationMessage = {
  conversationId: string;
  clientId: string;
  professionalId: string;
  kind: string;
  body: string;
  createdAt: Date;
};

/**
 * Primeira mensagem válida de cliente activa a subscrição aprovada.
 *
 * `tx` é opcional para manter a chamada isolada dos testes, mas `sendMessage`
 * passa a sua transacção: inserção da mensagem, actualização da conversa e
 * activação têm assim o mesmo commit/rollback.
 */
export async function activateByMessage(
  message: ActivationMessage,
  now: Date = systemClock(),
  tx?: Tx,
) {
  const run = async (t: Tx) => {
    if (message.kind !== 'text' || !message.body.trim()) {
      return { activated: false, reason: 'invalid_message' as const };
    }
    if (message.clientId === message.professionalId) {
      return { activated: false, reason: 'not_client_professional' as const };
    }

    const client = await t.query.users.findFirst({
      where: eq(users.id, message.clientId),
    });
    // `blocked`/`suspended` são campos aditivos; a gestão pela API ainda não
    // existe nesta fase (ver docs/fase4-subscriptions.md).
    if (!client || client.role !== 'client' || client.blocked || client.suspended) {
      return { activated: false, reason: 'client_not_eligible' as const };
    }

    const conversation = await t.query.conversations.findFirst({
      where: eq(conversations.id, message.conversationId),
    });
    if (
      !conversation ||
      conversation.clientId !== message.clientId ||
      conversation.professionalId !== message.professionalId
    ) {
      return { activated: false, reason: 'invalid_conversation' as const };
    }

    const candidates = await t.query.subscriptions.findMany({
      where: and(
        eq(subscriptions.professionalId, message.professionalId),
        eq(subscriptions.status, 'pending_activation'),
      ),
    });
    // Só mensagens posteriores à aprovação contam.
    const sub = candidates.find(
      (s) => s.approvedAt && s.approvedAt.getTime() < message.createdAt.getTime(),
    );
    if (!sub) {
      return { activated: false, reason: 'no_pending_activation' as const };
    }

    const planId = sub.planId;
    if (!planId) {
      return { activated: false, reason: 'no_plan' as const };
    }

    await acquireLocks(t, [`biskato:sub:${sub.id}`]);

    const plan = await t.query.plans.findFirst({
      where: eq(plans.id, planId),
    });
    if (!plan) {
      return { activated: false, reason: 'no_plan' as const };
    }
    const expiry = addDays(now, plan.days);
    const [activated] = await t
      .update(subscriptions)
      .set({
        status: 'active',
        activatedAt: now,
        activationDeadline: null,
        expiresAt: expiry,
        updatedAt: now,
      })
      .where(
        and(eq(subscriptions.id, sub.id), eq(subscriptions.status, 'pending_activation')),
      )
      .returning();
    if (!activated) {
      return { activated: false, reason: 'already_activated' as const };
    }
    await syncProfile(t, message.professionalId, expiry, now);
    return { activated: true as const, subscription: activated };
  };

  return tx ? run(tx) : db.transaction(run);
}

/** Agendador: activa por prazo e expira subscrições terminadas. */
export async function runSubscriptionsJob(now: Date = systemClock()) {
  return db.transaction(async (tx) => {
    const acquired = await tryLock(tx, 'biskato:subscriptions-job');
    if (!acquired) {
      return { ran: false, activated: 0, expired: 0 };
    }

    let activated = 0;
    let expired = 0;

    const pending = await tx.query.subscriptions.findMany({
      where: and(
        eq(subscriptions.status, 'pending_activation'),
        lte(subscriptions.activationDeadline, now),
      ),
    });
    for (const sub of pending) {
      const planId = sub.planId;
      if (!planId) continue;
      const plan = await tx.query.plans.findFirst({
        where: eq(plans.id, planId),
      });
      if (!plan) continue;
      const expiry = addDays(now, plan.days);
      const [updated] = await tx
        .update(subscriptions)
        .set({
        status: 'active',
        activatedAt: now,
        activationDeadline: null,
        expiresAt: expiry,
        updatedAt: now,
      })
        .where(
          and(eq(subscriptions.id, sub.id), eq(subscriptions.status, 'pending_activation')),
        )
        .returning();
      if (updated) {
        await syncProfile(tx, sub.professionalId, expiry, now);
        activated++;
      }
    }

    const active = await tx.query.subscriptions.findMany({
      where: and(eq(subscriptions.status, 'active'), lte(subscriptions.expiresAt, now)),
    });
    for (const sub of active) {
      const [updated] = await tx
        .update(subscriptions)
        .set({ status: 'expired', updatedAt: now })
        .where(and(eq(subscriptions.id, sub.id), eq(subscriptions.status, 'active')))
        .returning();
      if (updated) {
        await syncProfile(tx, sub.professionalId, now, now);
        expired++;
      }
    }

    return { ran: true, activated, expired };
  });
}

/** Listagem admin (com profissional e estado da subscrição). */
export async function listAdminPayments() {
  return db
    .select({
      id: payments.id,
      professionalId: payments.professionalId,
      professionalName: users.name,
      planId: payments.planId,
      amountKz: payments.amountKz,
      currency: payments.currency,
      status: payments.status,
      reference: payments.reference,
      proofUrl: payments.proofUrl,
      proofSentAt: payments.proofSentAt,
      createdAt: payments.createdAt,
      approvedAt: payments.approvedAt,
      rejectedAt: payments.rejectedAt,
      subscriptionId: payments.subscriptionId,
      subscriptionStatus: subscriptions.status,
    })
    .from(payments)
    .innerJoin(users, eq(payments.professionalId, users.id))
    .leftJoin(subscriptions, eq(payments.subscriptionId, subscriptions.id))
    .orderBy(desc(payments.createdAt));
}

export async function getPaymentForAdmin(paymentId: string) {
  const payment = await db.query.payments.findFirst({
    where: eq(payments.id, paymentId),
  });
  if (!payment) {
    throw new AppError(404, 'NOT_FOUND', 'Pagamento não encontrado');
  }
  return payment;
}
