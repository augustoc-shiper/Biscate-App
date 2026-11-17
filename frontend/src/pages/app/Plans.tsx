import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Payment, Plan } from '../../api/payments.api';
import { createPayment, listPayments, listPlans } from '../../api/payments.api';
import type { MySubscription, SubscriptionRecord } from '../../api/subscriptions.api';
import { getMySubscription } from '../../api/subscriptions.api';
import { PaymentStatusBadge, StatusBadge } from '../../components/StatusBadge';
import { SUBSCRIPTION_STATUS } from '../../components/statusLabels';
import './Plans.css';

/** Espelham as regras do backend; servem apenas para bloquear a compra na UI. */
const BLOCKING_SUBSCRIPTION = [
  'pending_payment',
  'pending_activation',
  'pending_review',
] as const;
const BLOCKING_PAYMENT = ['pending', 'proof_sent'] as const;

function apiMessage(err: unknown): string {
  const data = (
    err as { response?: { data?: { error?: { message?: string } } } }
  )?.response?.data;
  return data?.error?.message ?? 'Algo correu mal. Tente novamente.';
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-AO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Apresentação do tempo restante; nunca altera o estado da subscrição. */
function remainingLabel(value: string | null): string {
  if (!value) return '—';
  const diff = new Date(value).getTime() - Date.now();
  if (Number.isNaN(diff)) return '—';
  if (diff <= 0) return 'Menos de 1 dia restante';
  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
  return days === 1 ? '1 dia restante' : `${days} dias restantes`;
}

export default function Plans() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<MySubscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load(): Promise<void> {
    const [planRows, subData, paymentRows] = await Promise.all([
      listPlans(),
      getMySubscription(),
      listPayments(),
    ]);
    setPlans(planRows);
    setSubscription(subData);
    setPayments(paymentRows);
  }

  useEffect(() => {
    let cancelled = false;
    load()
      .catch((err) => {
        if (!cancelled) setError(apiMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const current = subscription?.current ?? null;
  const history = useMemo(
    () => subscription?.history ?? [],
    [subscription],
  );

  const blockingSub =
    current && BLOCKING_SUBSCRIPTION.includes(current.status as never)
      ? current
      : null;
  const blockingPayment = payments.find((payment) =>
    (BLOCKING_PAYMENT as readonly string[]).includes(payment.status),
  );
  const blocked = Boolean(blockingSub || blockingPayment);
  const confirmationPlan = plans.find((plan) => plan.id === confirming) ?? null;

  function reason(): string | null {
    if (blockingSub) {
      if (blockingSub.status === 'pending_payment') {
        return 'Existe um pagamento à espera do comprovativo. Envia-o antes de escolher outro plano.';
      }
      if (blockingSub.status === 'pending_activation') {
        return 'O pagamento foi aprovado e a subscrição está em activação. Não é possível efectuar outra compra neste momento.';
      }
      return SUBSCRIPTION_STATUS.pending_review.description;
    }
    if (blockingPayment) {
      return 'Existe um pagamento pendente de análise. Não é possível efectuar outra compra enquanto não for resolvido.';
    }
    return null;
  }

  async function refresh(): Promise<void> {
    setError(null);
    try {
      await load();
    } catch (err) {
      setError(apiMessage(err));
    }
  }

  async function onConfirm(): Promise<void> {
    if (confirming === null) return;
    const planId = confirming;
    setSaving(true);
    setError(null);
    try {
      const payment = await createPayment(planId);
      navigate(`/app/plans/pagamento?paymentId=${payment.id}`);
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="plans-empty">A carregar…</p>;

  return (
    <div className="plans-page">
      <div className="plans-heading">
        <div>
          <h1>A minha subscrição</h1>
          <p className="plans-sub">
            Consulta o teu plano, envia comprovativos e acompanha os pagamentos.
          </p>
        </div>
        <button type="button" className="plans-refresh" onClick={() => void refresh()}>
          Actualizar
        </button>
      </div>

      {error && (
        <div role="alert" className="plans-error">
          {error}
        </div>
      )}

      <section className="sub-current" aria-label="Subscrição actual">
        <div className="sub-current-top">
          <h2>Plano actual</h2>
          {current ? (
            <StatusBadge status={current.status} />
          ) : (
            <span className="status-badge">Sem plano</span>
          )}
        </div>

        {current ? (
          <>
            <p className="sub-current-name">
              {current.planName ?? 'Plano'} · {current.planDays ?? '—'} dias ·{' '}
              {current.planPriceKz ?? '—'} Kz
            </p>
            <p className="sub-current-desc">
              {SUBSCRIPTION_STATUS[current.status].description}
            </p>
            <dl className="sub-facts">
              <div>
                <dt>Activado em</dt>
                <dd>{formatDate(current.activatedAt)}</dd>
              </div>
              <div>
                <dt>Expira em</dt>
                <dd>{formatDate(current.expiresAt)}</dd>
              </div>
              <div>
                <dt>Tempo restante</dt>
                <dd>{current.status === 'active' ? remainingLabel(current.expiresAt) : '—'}</dd>
              </div>
              {current.status === 'pending_activation' && (
                <div>
                  <dt>Prazo de activação</dt>
                  <dd>{formatDate(current.activationDeadline)}</dd>
                </div>
              )}
              {current.needsReview && current.reviewReason && (
                <div>
                  <dt>Motivo da análise</dt>
                  <dd>{current.reviewReason}</dd>
                </div>
              )}
            </dl>
          </>
        ) : (
          <p className="sub-current-desc">
            Ainda não tens um plano. Escolhe um dos planos abaixo para começar.
          </p>
        )}
      </section>

      {reason() && (
        <div className="plans-blocked" role="status">
          <strong>Não é possível comprar agora</strong>
          <p>{reason()}</p>
          {blockingPayment && (
            <Link
              to={`/app/plans/pagamento?paymentId=${blockingPayment.id}`}
              className="plans-link"
            >
              Ver pagamento pendente
            </Link>
          )}
        </div>
      )}

      <h2 className="plans-section-title">Escolher plano</h2>
      <div className="plan-grid">
        {plans.map((plan, index) => (
          <motion.button
            key={plan.id}
            type="button"
            className={selected === plan.id ? 'plan-card on' : 'plan-card'}
            aria-pressed={selected === plan.id}
            aria-label={`Seleccionar plano ${plan.name}`}
            disabled={blocked || saving}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.08 }}
            onClick={() => {
              setSelected(plan.id);
              setConfirming(null);
            }}
          >
            {plan.highlight && <span className="plan-badge">Mais escolhido</span>}
            <strong>{plan.name}</strong>
            <b className="plan-price">{plan.priceKz.toLocaleString('pt-AO')} Kz</b>
            <span className="plan-days">{plan.days} dias</span>
          </motion.button>
        ))}
      </div>

      {selected !== null && !blocked && confirming === null && (
        <button
          type="button"
          className="plans-continue"
          disabled={saving}
          onClick={() => setConfirming(selected)}
        >
          Continuar
        </button>
      )}

      {confirmationPlan && (
        <div className="plans-confirm" role="group" aria-label="Confirmar plano">
          <p>
            Confirma a escolha do plano <strong>{confirmationPlan.name}</strong> por{' '}
            <strong>{confirmationPlan.priceKz.toLocaleString('pt-AO')} Kz</strong> (
            {confirmationPlan.days} dias)? Será gerada uma referência para pagamento manual.
          </p>
          <div className="plans-confirm-actions">
            <button
              type="button"
              className="plans-continue"
              disabled={saving}
              onClick={() => void onConfirm()}
            >
              {saving ? 'A processar…' : 'Confirmar e criar pagamento'}
            </button>
            <button
              type="button"
              className="plans-cancel"
              disabled={saving}
              onClick={() => setConfirming(null)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <section className="sub-history" aria-label="Histórico">
        <h2 className="plans-section-title">Histórico de subscrições</h2>
        {history.length === 0 ? (
          <p className="plans-empty">Sem subscrições registadas.</p>
        ) : (
          <ul className="history-list">
            {history.map((sub: SubscriptionRecord) => (
              <li key={sub.id}>
                <div className="history-main">
                  <StatusBadge status={sub.status} />
                  <span>{sub.planName ?? 'Plano'}</span>
                </div>
                <small>Criada em {formatDate(sub.createdAt)}</small>
                {sub.expiresAt && <small>Expira em {formatDate(sub.expiresAt)}</small>}
              </li>
            ))}
          </ul>
        )}

        <h2 className="plans-section-title">Histórico de pagamentos</h2>
        {payments.length === 0 ? (
          <p className="plans-empty">Sem pagamentos registados.</p>
        ) : (
          <ul className="history-list">
            {payments.map((payment) => (
              <li key={payment.id}>
                <div className="history-main">
                  <PaymentStatusBadge status={payment.status} />
                  <span>{payment.amountKz.toLocaleString('pt-AO')} Kz</span>
                </div>
                <small>Ref. {payment.reference} · {formatDate(payment.createdAt)}</small>
                {(payment.status === 'pending' || payment.status === 'proof_sent') && (
                  <Link
                    to={`/app/plans/pagamento?paymentId=${payment.id}`}
                    className="plans-link"
                  >
                    Ver pagamento
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
