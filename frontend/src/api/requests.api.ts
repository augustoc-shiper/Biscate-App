import { apiClient } from './client';

export type Offer = {
  id: string;
  price: number;
  message: string;
  status: 'sent' | 'accepted' | 'declined';
  createdAt: string;
  professionalName: string;
  professionalId: string;
  verified: boolean;
};

export type ServiceRequest = {
  id: string;
  description: string;
  when: 'today' | 'week' | 'flexible';
  status: 'open' | 'in_conversation' | 'done';
  createdAt: string;
  categoryId: number | null;
  bairroId: number | null;
  offers: Offer[];
};

export async function listRequests(): Promise<ServiceRequest[]> {
  const res = await apiClient.get('/requests');
  return (res.data as { data: ServiceRequest[] }).data;
}

export async function createRequest(input: {
  categoryId: number;
  description: string;
  bairroId: number;
  when: 'today' | 'week' | 'flexible';
}): Promise<ServiceRequest> {
  const res = await apiClient.post('/requests', input);
  return (res.data as { data: ServiceRequest }).data;
}
