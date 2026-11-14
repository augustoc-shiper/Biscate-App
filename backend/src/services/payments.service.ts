import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { payments, plans, professionalProfiles } from '../db/schema.js';
import { AppError } from '../lib/AppError.js';

const ENTITY = '90210';

function randomReference(): string {
  const digits = Array.from({ length: 9 }, () =>
    Math.floor(Math.random() * 10),
  ).join('');
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
}

export async function listPlans() {
  return db.select().from(plans).orderBy(plans.days);
}

export async function createPayment(professionalId: string, planId: number) {
  const plan = await db.query.plans.findFirst({ where: eq(plans.id, planId) });
  if (!plan) {
    throw new AppError(404, 'NOT_FOUND', 'Plano não encontrado');
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const reference = randomReference();
    const existing = await db.query.payments.findFirst({
      where: eq(payments.reference, reference),
    });
    if (existing) continue;

    const [created] = await db
      .insert(payments)
      .values({
        professionalId,
        planId,
        entity: ENTITY,
        reference,
        amountKz: plan.priceKz,
        status: 'pending',
      })
      .returning();
    return created;
  }
  throw new AppError(500, 'INTERNAL_ERROR', 'Não foi possível gerar referência');
}

export async function listPayments(professionalId: string) {
  return db
    .select()
    .from(payments)
    .where(eq(payments.professionalId, professionalId))
    .orderBy(desc(payments.createdAt));
}

export async function confirmPayment(
  professionalId: string,
  paymentId: string,
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
  if (payment.status === 'confirmed') {
    return payment;
  }

  const plan = await db.query.plans.findFirst({
    where: eq(plans.id, payment.planId),
  });
  if (!plan) {
    throw new AppError(404, 'NOT_FOUND', 'Plano não encontrado');
  }

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(payments)
      .set({ status: 'confirmed', confirmedAt: new Date() })
      .where(
        and(eq(payments.id, paymentId), eq(payments.status, 'pending')),
      )
      .returning();

    if (!updated) {
      const current = await tx.query.payments.findFirst({
        where: eq(payments.id, paymentId),
      });
      return current!;
    }

    const [profile] = await tx
      .select()
      .from(professionalProfiles)
      .where(eq(professionalProfiles.userId, professionalId))
      .limit(1);

    const base =
      profile?.planExpiresAt && profile.planExpiresAt > new Date()
        ? profile.planExpiresAt
        : new Date();
    const newExpiry = new Date(base.getTime() + plan.days * 24 * 60 * 60 * 1000);

    if (profile) {
      await tx
        .update(professionalProfiles)
        .set({ planExpiresAt: newExpiry })
        .where(eq(professionalProfiles.userId, professionalId));
    } else {
      await tx.insert(professionalProfiles).values({
        userId: professionalId,
        planExpiresAt: newExpiry,
      });
    }

    return updated;
  });
}
