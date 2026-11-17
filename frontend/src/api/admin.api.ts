import { apiClient } from './client';
import type { PaymentStatus } from './payments.api';
import type { SubscriptionStatus } from './subscriptions.api';

export type AdminPayment = {
  id: string;
  professionalId: string;
  professionalName: string;
  planId: number;
  amountKz: number;
  currency: string;
  status: PaymentStatus;
  reference: string;
  /** Sinalização de que existe comprovativo; nunca é usada como URL pública. */
  proofUrl: string | null;
  proofSentAt: string | null;
  createdAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  subscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus | null;
};

export type AdminDecision = {
  payment: AdminPayment;
  subscription: unknown;
  applied?: boolean;
  rejected?: boolean;
};

export async function listAdminPayments(): Promise<AdminPayment[]> {
  const res = await apiClient.get('/admin/payments');
  return (res.data as { data: AdminPayment[] }).data;
}

export async function approvePayment(id: string): Promise<AdminDecision> {
  const res = await apiClient.post(`/admin/payments/${id}/approve`);
  return (res.data as { data: AdminDecision }).data;
}

export async function rejectPayment(id: string): Promise<AdminDecision> {
  const res = await apiClient.post(`/admin/payments/${id}/reject`);
  return (res.data as { data: AdminDecision }).data;
}

/**
 * Comprovativo autenticado: o token é injetado pelo interceptor do apiClient e
 * a resposta é um blob. A URL de visualização é temporária e criada na página.
 */
export async function getProofBlob(id: string): Promise<Blob> {
  const res = await apiClient.get(`/admin/payments/${id}/proof`, {
    responseType: 'blob',
  });
  return res.data as Blob;
}
