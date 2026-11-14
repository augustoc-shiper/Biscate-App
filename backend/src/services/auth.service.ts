import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { professionalProfiles, users, type User } from '../db/schema.js';
import type { LoginInput, RegisterInput } from '../dto/auth.dto.js';
import { AppError } from '../lib/AppError.js';
import { signToken } from '../lib/jwt.js';

export type PublicUser = Omit<User, 'passwordHash'>;

export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _ignored, ...pub } = user;
  return pub;
}

export async function register(
  input: RegisterInput,
): Promise<{ user: PublicUser; token: string }> {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, input.email),
  });
  if (existing) {
    throw new AppError(409, 'EMAIL_TAKEN', 'Este email já está registado');
  }

  const [user] = await db
    .insert(users)
    .values({
      name: input.name,
      email: input.email,
      passwordHash: bcrypt.hashSync(input.password, 10),
      role: input.role,
      phone: input.phone ?? null,
    })
    .returning();

  if (input.role === 'professional') {
    await db.insert(professionalProfiles).values({ userId: user.id });
  }

  return {
    user: toPublicUser(user),
    token: signToken({ id: user.id, role: user.role }),
  };
}

export async function login(
  input: LoginInput,
): Promise<{ user: PublicUser; token: string }> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, input.email),
  });
  if (!user || !bcrypt.compareSync(input.password, user.passwordHash)) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email ou senha incorrectos');
  }
  return {
    user: toPublicUser(user),
    token: signToken({ id: user.id, role: user.role }),
  };
}

export async function getUserById(id: string): Promise<PublicUser> {
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Sessão inválida ou expirada');
  }
  return toPublicUser(user);
}
