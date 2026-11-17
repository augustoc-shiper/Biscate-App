import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { AppError } from './AppError.js';

export type JwtPayload = {
  id: string;
  role: 'client' | 'professional' | 'admin';
};

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Sessão inválida ou expirada');
  }
}
