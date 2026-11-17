import type { PaymentStatus } from '../api/payments.api';
import type { SubscriptionStatus } from '../api/subscriptions.api';

export type StatusInfo = { label: string; description: string };

/** Textos únicos para os estados de subscrição — usados na página e no histórico. */
export const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, StatusInfo> = {
  pending_payment: {
    label: 'Pagamento pendente',
    description:
      'Aguardamos o comprovativo de pagamento. Envia-o para continuar.',
  },
  pending_activation: {
    label: 'Em activação',
    description:
      'Pagamento aprovado. Tens até 3 dias para receber a primeira mensagem válida de um cliente. Esse período não desconta os dias contratados.',
  },
  active: {
    label: 'Activo',
    description: 'O teu plano está activo e podes receber pedidos.',
  },
  expired: {
    label: 'Expirado',
    description: 'O plano terminou. Escolhe um novo plano para continuar.',
  },
  rejected: {
    label: 'Rejeitado',
    description:
      'O pagamento foi rejeitado pela administração. Escolhe um novo plano para tentar novamente.',
  },
  pending_review: {
    label: 'Em análise',
    description:
      'Existe uma situação que precisa de análise administrativa. Não é possível efectuar outra compra enquanto não for resolvida.',
  },
};

export const PAYMENT_STATUS: Record<PaymentStatus, StatusInfo> = {
  pending: { label: 'Pendente', description: 'Aguarda o envio do comprovativo.' },
  proof_sent: {
    label: 'Comprovativo enviado',
    description: 'Aguarda a análise da administração.',
  },
  confirmed: { label: 'Confirmado', description: 'Pagamento confirmado.' },
  approved: { label: 'Aprovado', description: 'Pagamento aprovado.' },
  rejected: { label: 'Rejeitado', description: 'Pagamento rejeitado.' },
};
