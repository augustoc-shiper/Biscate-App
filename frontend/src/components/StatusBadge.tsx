import type { PaymentStatus } from '../api/payments.api';
import type { SubscriptionStatus } from '../api/subscriptions.api';
import './StatusBadge.css';
import { PAYMENT_STATUS, SUBSCRIPTION_STATUS } from './statusLabels';

/** Badge de subscrição (mesmo visual em todo o app). */
export function StatusBadge({ status }: { status: SubscriptionStatus }) {
  return (
    <span className={`status-badge status-${status}`} data-status={status}>
      {SUBSCRIPTION_STATUS[status].label}
    </span>
  );
}

/** Badge de pagamento, com a mesma linguagem visual. */
export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`status-badge status-${status}`} data-status={status}>
      {PAYMENT_STATUS[status].label}
    </span>
  );
}
