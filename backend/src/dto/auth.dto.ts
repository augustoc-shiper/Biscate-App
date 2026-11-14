import { z } from 'zod';

export const RegisterDto = z.object({
  name: z.string().min(2, 'Nome demasiado curto'),
  email: z.email('Email inválido'),
  password: z.string().min(6, 'A senha precisa de 6+ caracteres'),
  role: z.enum(['client', 'professional']),
  phone: z.string().min(6).optional(),
});

export const LoginDto = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

export type RegisterInput = z.infer<typeof RegisterDto>;
export type LoginInput = z.infer<typeof LoginDto>;
