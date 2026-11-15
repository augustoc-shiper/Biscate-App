import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Payment as PaymentData } from '../../api/payments.api';
import { confirmPayment, listPayments } from '../../api/payments.api';
import './Plans.css';

function apiMessage(err: unknown): string {
  const data = (
    err as { response?: { data?: { error?: { message?: string } } } }
  )?.response?.data;
  return data?.error?.message ?? 'Algo correu mal. Tente novamente.';
}

export default function Payment() {
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('paymentId');

  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!paymentId) return;
    let cancelled = false;
    listPayments()
      .then((rows) => {
        if (cancelled) return;
        const found = rows.find((row) => row.id === paymentId) ?? null;
        setPayment(found);
        if (!found) setError('Pagamento não encontrado.');
        if (found?.status === 'confirmed') setActivated(true);
      })
      .catch((err) => {
        if (!cancelled) setError(apiMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  async function onPaid(): Promise<void> {
    if (!payment) return;
    setSaving(true);
    setError(null);
    try {
      await confirmPayment(payment.id);
      setActivated(true);
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!paymentId) {
    return (
      <p className="plans-empty" role="alert">
        Pagamento não encontrado.
      </p>
    );
  }

  if (loading) return <p className="plans-empty">A carregar…</p>;

  if (activated) {
    return (
      <motion.div
        className="payment-activated"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
      >
        <motion.span
          className="check"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14 }}
          aria-hidden
        >
          ✓
        </motion.span>
        <h1>Plano activado</h1>
        <p>Ya! O teu plano está activo. Podes começar a receber pedidos.</p>
        <Link to="/app" className="plans-continue">
          Continuar
        </Link>
      </motion.div>
    );
  }

  if (error || !payment) {
    return (
      <p className="plans-empty" role="alert">
        {error ?? 'Pagamento não encontrado.'}
      </p>
    );
  }

  return (
    <div className="payment-page">
      <h1>Pagamento</h1>
      <p className="plans-sub">
        Pague no Multicaixa, ATM ou Internet Banking usando os dados abaixo.
      </p>

      <div className="payment-box">
        <div className="payment-row">
          <span>Entidade</span>
          <b data-testid="entidade">{payment.entity}</b>
        </div>
        <div className="payment-row">
          <span>Referência</span>
          <b data-testid="referencia">{payment.reference}</b>
        </div>
        <div className="payment-row">
          <span>Estado</span>
          <b>{payment.status === 'confirmed' ? 'Confirmado' : 'Pendente'}</b>
        </div>
      </div>

      {error && (
        <div role="alert" className="plans-error">
          {error}
        </div>
      )}

      <button
        type="button"
        className="plans-continue"
        disabled={saving}
        onClick={() => void onPaid()}
      >
        {saving ? 'A confirmar…' : 'Já paguei'}
      </button>
    </div>
  );
}
