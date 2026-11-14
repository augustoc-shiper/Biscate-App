import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  offers,
  professionalProfiles,
  requests,
  users,
} from '../db/schema.js';
import type {
  CreateOfferInput,
  CreateRequestInput,
} from '../dto/requests.dto.js';
import { AppError } from '../lib/AppError.js';
import { ensureConversation } from './conversations.service.js';

export async function createRequest(
  clientId: string,
  input: CreateRequestInput,
) {
  const [created] = await db
    .insert(requests)
    .values({
      clientId,
      categoryId: input.categoryId,
      description: input.description,
      bairroId: input.bairroId,
      when: input.when,
    })
    .returning();
  return created;
}

export async function listRequests(clientId: string) {
  const rows = await db
    .select()
    .from(requests)
    .where(eq(requests.clientId, clientId))
    .orderBy(desc(requests.createdAt));

  const result = [];
  for (const request of rows) {
    const requestOffers = await db
      .select({
        id: offers.id,
        price: offers.price,
        message: offers.message,
        status: offers.status,
        createdAt: offers.createdAt,
        professionalName: users.name,
        professionalId: users.id,
        verified: users.verified,
      })
      .from(offers)
      .innerJoin(users, eq(offers.professionalId, users.id))
      .where(eq(offers.requestId, request.id))
      .orderBy(desc(offers.createdAt));
    result.push({ ...request, offers: requestOffers });
  }
  return result;
}

async function assertActivePlan(professionalId: string): Promise<void> {
  const profile = await db.query.professionalProfiles.findFirst({
    where: eq(professionalProfiles.userId, professionalId),
  });
  if (!profile?.planExpiresAt || profile.planExpiresAt <= new Date()) {
    throw new AppError(
      403,
      'NO_ACTIVE_PLAN',
      'O seu plano expirou. Renove para responder a pedidos.',
    );
  }
}

export async function createOffer(
  professionalId: string,
  requestId: string,
  input: CreateOfferInput,
) {
  const request = await db.query.requests.findFirst({
    where: eq(requests.id, requestId),
  });
  if (!request) {
    throw new AppError(404, 'NOT_FOUND', 'Pedido não encontrado');
  }
  await assertActivePlan(professionalId);

  const [created] = await db
    .insert(offers)
    .values({
      requestId,
      professionalId,
      price: input.price,
      message: input.message,
    })
    .returning();
  return created;
}

async function loadOwnedOffer(
  clientId: string,
  offerId: string,
  targetStatus: 'accepted' | 'declined',
) {
  const offer = await db.query.offers.findFirst({
    where: eq(offers.id, offerId),
  });
  if (!offer) {
    throw new AppError(404, 'NOT_FOUND', 'Proposta não encontrada');
  }
  const request = await db.query.requests.findFirst({
    where: eq(requests.id, offer.requestId),
  });
  if (!request || request.clientId !== clientId) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'Só o dono do pedido pode decidir propostas',
    );
  }
  const [updated] = await db
    .update(offers)
    .set({ status: targetStatus })
    .where(eq(offers.id, offerId))
    .returning();
  return { offer: updated!, request };
}

export async function acceptOffer(clientId: string, offerId: string) {
  const { offer, request } = await loadOwnedOffer(
    clientId,
    offerId,
    'accepted',
  );
  await db
    .update(requests)
    .set({ status: 'in_conversation' })
    .where(
      and(eq(requests.id, request.id), eq(requests.status, 'open')),
    );
  await ensureConversation(request.clientId, offer.professionalId);
  return offer;
}

export async function declineOffer(clientId: string, offerId: string) {
  const { offer } = await loadOwnedOffer(clientId, offerId, 'declined');
  return offer;
}
