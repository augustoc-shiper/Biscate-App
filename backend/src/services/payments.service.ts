/**
 * Fachada de pagamentos. A lógica de subscrições/pagamentos vive em
 * `subscriptions.service.ts` para haver um único pipeline de aplicação.
 */
export {
  applyConfirmedPayment,
  approvePayment,
  attachProof,
  createPayment,
  getMySubscription,
  getPaymentForAdmin,
  listAdminPayments,
  listPayments,
  listPlans,
  rejectPayment,
  runSubscriptionsJob,
} from './subscriptions.service.js';
