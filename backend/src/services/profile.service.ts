import fs from 'node:fs';
import path from 'node:path';
import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  conversations,
  offers,
  professionalProfiles,
  requests,
  users,
  workPhotos,
} from '../db/schema.js';
import type { UpdateProfileInput } from '../dto/profile.dto.js';
import { AppError } from '../lib/AppError.js';
import { UPLOAD_DIR } from '../middleware/upload.js';

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
) {
  if (input.bio !== undefined) {
    await db.update(users).set({ bio: input.bio }).where(eq(users.id, userId));
  }

  const profileSet: Partial<typeof professionalProfiles.$inferInsert> = {};
  if (input.priceText !== undefined) profileSet.priceText = input.priceText;
  if (input.categoryId !== undefined) profileSet.categoryId = input.categoryId;
  if (input.bairroId !== undefined) profileSet.bairroId = input.bairroId;
  if (input.availableToday !== undefined)
    profileSet.availableToday = input.availableToday;
  if (input.responseTime !== undefined)
    profileSet.responseTime = input.responseTime;

  if (Object.keys(profileSet).length > 0) {
    await db
      .update(professionalProfiles)
      .set(profileSet)
      .where(eq(professionalProfiles.userId, userId));
  }

  return getProfile(userId);
}

export async function getProfile(userId: string) {
  const profile = await db.query.professionalProfiles.findFirst({
    where: eq(professionalProfiles.userId, userId),
  });
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { bio: true },
  });
  if (!profile) {
    throw new AppError(404, 'NOT_FOUND', 'Perfil não encontrado');
  }
  return { ...profile, bio: user?.bio ?? null };
}

export async function addPhoto(
  professionalId: string,
  file: Express.Multer.File,
) {
  const [existing] = await db
    .select({ n: count() })
    .from(workPhotos)
    .where(eq(workPhotos.professionalId, professionalId));

  if (Number(existing?.n ?? 0) >= 6) {
    fs.rmSync(path.join(UPLOAD_DIR, file.filename), { force: true });
    throw new AppError(400, 'PHOTO_LIMIT', 'Máximo de 6 fotos de trabalho');
  }

  const [created] = await db
    .insert(workPhotos)
    .values({ professionalId, url: `/uploads/${file.filename}` })
    .returning();
  return created;
}

export async function removePhoto(
  professionalId: string,
  photoId: string,
): Promise<void> {
  const photo = await db.query.workPhotos.findFirst({
    where: eq(workPhotos.id, photoId),
  });
  if (!photo) {
    throw new AppError(404, 'NOT_FOUND', 'Foto não encontrada');
  }
  if (photo.professionalId !== professionalId) {
    throw new AppError(403, 'FORBIDDEN', 'Foto não pertence a este usuário');
  }
  await db.delete(workPhotos).where(eq(workPhotos.id, photoId));
  fs.rmSync(path.join(UPLOAD_DIR, path.basename(photo.url)), { force: true });
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getDashboard(professionalId: string) {
  const profile = await db.query.professionalProfiles.findFirst({
    where: eq(professionalProfiles.userId, professionalId),
  });
  if (!profile) {
    throw new AppError(404, 'NOT_FOUND', 'Perfil não encontrado');
  }

  const [convs] = await db
    .select({ n: count() })
    .from(conversations)
    .where(eq(conversations.professionalId, professionalId));

  const active = !!profile.planExpiresAt && profile.planExpiresAt > new Date();
  const daysLeft = active
    ? Math.ceil(
        (profile.planExpiresAt!.getTime() - Date.now()) / DAY_MS,
      )
    : 0;

  const pendingOffers = await db
    .select({
      id: offers.id,
      price: offers.price,
      message: offers.message,
      status: offers.status,
      createdAt: offers.createdAt,
      request: {
        id: requests.id,
        description: requests.description,
        status: requests.status,
      },
    })
    .from(offers)
    .innerJoin(requests, eq(offers.requestId, requests.id))
    .where(
      and(
        eq(offers.professionalId, professionalId),
        eq(offers.status, 'sent'),
      ),
    )
    .orderBy(desc(offers.createdAt));

  return {
    visitas: profile.visitsCount,
    contactos: Number(convs?.n ?? 0),
    ratingAvg: profile.ratingAvg,
    plan: { active, daysLeft },
    pendingOffers,
  };
}
