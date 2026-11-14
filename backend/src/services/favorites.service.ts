import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  bairro,
  categories,
  favorites,
  professionalProfiles,
  users,
} from '../db/schema.js';
import { AppError } from '../lib/AppError.js';

export async function toggleFavorite(
  userId: string,
  professionalId: string,
): Promise<{ favorite: boolean }> {
  const target = await db.query.users.findFirst({
    where: and(eq(users.id, professionalId), eq(users.role, 'professional')),
  });
  if (!target) {
    throw new AppError(404, 'NOT_FOUND', 'Profissional não encontrado');
  }

  const existing = await db
    .select()
    .from(favorites)
    .where(
      and(
        eq(favorites.userId, userId),
        eq(favorites.professionalId, professionalId),
      ),
    );

  if (existing.length > 0) {
    await db
      .delete(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.professionalId, professionalId),
        ),
      );
    return { favorite: false };
  }

  await db.insert(favorites).values({ userId, professionalId });
  return { favorite: true };
}

export async function listFavorites(userId: string) {
  return db
    .select({
      id: users.id,
      name: users.name,
      verified: users.verified,
      avatarUrl: users.avatarUrl,
      category: categories.name,
      bairro: bairro.name,
      ratingAvg: professionalProfiles.ratingAvg,
      ratingCount: professionalProfiles.ratingCount,
      priceText: professionalProfiles.priceText,
      priceMin: professionalProfiles.priceMin,
      availableToday: professionalProfiles.availableToday,
      distanceKm: professionalProfiles.distanceKm,
    })
    .from(favorites)
    .innerJoin(users, eq(favorites.professionalId, users.id))
    .innerJoin(
      professionalProfiles,
      eq(favorites.professionalId, professionalProfiles.userId),
    )
    .leftJoin(categories, eq(professionalProfiles.categoryId, categories.id))
    .leftJoin(bairro, eq(professionalProfiles.bairroId, bairro.id))
    .where(eq(favorites.userId, userId));
}
