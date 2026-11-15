import { apiClient } from './client';

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'client' | 'professional';
  phone?: string | null;
  avatarUrl?: string | null;
  verified?: boolean;
  createdAt?: string;
};

export type AuthSession = { user: User; token: string };

export type RegisterData = {
  name: string;
  email: string;
  password: string;
  role: 'client' | 'professional';
  phone?: string;
};

export async function loginRequest(
  email: string,
  password: string,
): Promise<AuthSession> {
  const res = await apiClient.post('/auth/login', { email, password });
  return res.data.data as AuthSession;
}

export async function registerRequest(
  data: RegisterData,
): Promise<AuthSession> {
  const res = await apiClient.post('/auth/register', data);
  return res.data.data as AuthSession;
}

export async function meRequest(): Promise<User> {
  const res = await apiClient.get('/auth/me');
  return res.data.data as User;
}
