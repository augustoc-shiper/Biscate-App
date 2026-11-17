import { apiClient } from './client';

export type Plan = {
  id: number;
  name: string;
  days: number;
  priceKz: number;
  highlight: boolean;
};

export type PaymentStatus =
  | 'pending'
  | 'proof_sent'
  | 'confirmed'
  | 'approved'
  | 'rejected';

export type Payment = {
  id: string;
  planId: number;
  professionalId: string;
  entity: string;
  reference: string;
  amountKz: number;
  status: PaymentStatus;
  createdAt: string;
  proofSentAt?: string | null;
  subscriptionId?: string | null;
  isRenewal?: boolean;
};

/** Formatos e limite aceites pelo middleware do backend (multer + bytes mágicos). */
export const PROOF_ACCEPT =
  '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';
export const PROOF_MAX_BYTES = 5 * 1024 * 1024;

export function validateProofFile(file: File): string | null {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    return 'Apenas imagens JPG, JPEG, PNG ou WEBP.';
  }
  if (file.size > PROOF_MAX_BYTES) {
    return 'O comprovativo não pode ultrapassar 5 MB.';
  }
  return null;
}

export async function listPlans(): Promise<Plan[]> {
  const res = await apiClient.get('/plans');
  return (res.data as { data: Plan[] }).data;
}

export async function createPayment(planId: number): Promise<Payment> {
  const res = await apiClient.post('/payments', { planId });
  return (res.data as { data: Payment }).data;
}

export async function listPayments(): Promise<Payment[]> {
  const res = await apiClient.get('/payments');
  return (res.data as { data: Payment[] }).data;
}

/**
 * Envio do comprovativo. O campo do FormData tem de ser `proof` (multer single).
 * A confirmação/aprovação é exclusiva do administrador: não existe confirmPayment.
 */
export async function sendProof(id: string, file: File): Promise<Payment> {
  const form = new FormData();
  form.append('proof', file, file.name);
  const res = await apiClient.post(`/payments/${id}/proof`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return (res.data as { data: Payment }).data;
}
