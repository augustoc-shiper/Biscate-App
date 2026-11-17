import { apiClient } from './client';
import type { PaymentStatus } from './payments.api';

export type SubscriptionStatus =
  | 'pending_payment'
  | 'pending_activation'
  | 'active'
  | 'expired'
  | 'rejected'
  | 'pending_review';

export type SubscriptionRecord = {
  id: string;
  status: SubscriptionStatus;
  planId: number | null;
  planName: string | null;
  planDays: number | null;
  planPriceKz: number | null;
  paymentId: string | null;
  paymentReference: string | null;
  paymentEntity: string | null;
  paymentStatus: PaymentStatus | null;
  approvedAt: string | null;
  activationDeadline: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  needsReview: boolean;
  reviewReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MySubscription = {
  current: SubscriptionRecord | null;
  history: SubscriptionRecord[];
};

/** Endpoint de leitura do backend; nunca calcula nem altera estados no cliente. */
export async function getMySubscription(): Promise<MySubscription> {
  const res = await apiClient.get('/subscriptions/me');
  return (res.data as { data: MySubscription }).data;
}
