import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  ilike,
  or,
} from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  bairro,
  categories,
  professionalProfiles,
  reviews,
  users,
  workPhotos,
} from '../db/schema.js';
import type { ProfessionalQuery } from '../dto/professionals.dto.js';
import { AppError } from '../lib/AppError.js';

function activePlan() {
  return gt(professionalProfiles.planExpiresAt, new Date());
}

function buildFilters(query: ProfessionalQuery) {
  const conditions = [eq(users.role, 'professional'), activePlan()];
  if (query.category) {
    conditions.push(eq(categories.name, query.category));
  }
  if (query.bairro) {
    conditions.push(eq(bairro.name, query.bairro));
  }
  if (query.q) {
    const pattern = `%${query.q}%`;
    conditions.push(
      or(
        ilike(users.name, pattern),
        ilike(categories.name, pattern),
        ilike(bairro.name, pattern),
      )!,
    );
  }
  return and(...conditions);
}

const sortColumn = {
  rating: desc(professionalProfiles.ratingAvg),
  distance: asc(professionalProfiles.distanceKm),
  price: asc(professionalProfiles.priceMin),
};

export async function listProfessionals(query: ProfessionalQuery) {
  const filters = buildFilters(query);

  const rows = await db
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
    .from(professionalProfiles)
    .innerJoin(users, eq(professionalProfiles.userId, users.id))
    .leftJoin(categories, eq(professionalProfiles.categoryId, categories.id))
    .leftJoin(bairro, eq(professionalProfiles.bairroId, bairro.id))
    .where(filters)
    .orderBy(sortColumn[query.sort], asc(users.name))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  const [totalRow] = await db
    .select({ total: count() })
    .from(professionalProfiles)
    .innerJoin(users, eq(professionalProfiles.userId, users.id))
    .leftJoin(categories, eq(professionalProfiles.categoryId, categories.id))
    .leftJoin(bairro, eq(professionalProfiles.bairroId, bairro.id))
    .where(filters);

  return {
    data: rows,
    meta: { total: totalRow?.total ?? 0, page: query.page, limit: query.limit },
  };
}

export async function getProfessional(id: string) {
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      verified: users.verified,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
      phone: users.phone,
      category: categories.name,
      bairro: bairro.name,
      priceText: professionalProfiles.priceText,
      priceMin: professionalProfiles.priceMin,
      responseTime: professionalProfiles.responseTime,
      availableToday: professionalProfiles.availableToday,
      ratingAvg: professionalProfiles.ratingAvg,
      ratingCount: professionalProfiles.ratingCount,
      distanceKm: professionalProfiles.distanceKm,
    })
    .from(professionalProfiles)
    .innerJoin(users, eq(professionalProfiles.userId, users.id))
    .leftJoin(categories, eq(professionalProfiles.categoryId, categories.id))
    .leftJoin(bairro, eq(professionalProfiles.bairroId, bairro.id))
    .where(eq(users.id, id))
    .limit(1);

  if (!row) {
    throw new AppError(404, 'NOT_FOUND', 'Profissional não encontrado');
  }

  const photos = await db
    .select({ id: workPhotos.id, url: workPhotos.url })
    .from(workPhotos)
    .where(eq(workPhotos.professionalId, id));

  const reviewRows = await db
    .select({
      id: reviews.id,
      stars: reviews.stars,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      reviewerName: users.name,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.reviewerId, users.id))
    .where(eq(reviews.reviewedId, id))
    .orderBy(desc(reviews.createdAt));

  return {
    ...row,
    workPhotos: photos,
    reviews: reviewRows,
  };
}

export async function listCategories() {
  return db.select().from(categories).orderBy(categories.id);
}

export async function listBairro() {
  return db.select().from(bairro).orderBy(bairro.id);
}
