import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Plan } from '../../api/payments.api';
import { createPayment, listPlans } from '../../api/payments.api';
import './Plans.css';

function apiMessage(err: unknown): string {
  const data = (
    err as { response?: { data?: { error?: { message?: string } } } }
  )?.response?.data;
  return data?.error?.message ?? 'Algo correu mal. Tente novamente.';
}

export default function Plans() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listPlans()
      .then((rows) => {
        if (!cancelled) {
          setPlans(rows);
          setSelected((current) => current ?? rows[0]?.id ?? null);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onContinue(): Promise<void> {
    if (selected === null) return;
    setSaving(true);
    setError(null);
    try {
      const payment = await createPayment(selected);
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
      <h1>Planos para profissionais</h1>
      <p className="plans-sub">
        Activa o teu plano para receber pedidos e enviar propostas.
      </p>

      <div className="plan-grid">
        {plans.map((plan, index) => (
          <motion.button
            key={plan.id}
            type="button"
            className={selected === plan.id ? 'plan-card on' : 'plan-card'}
            aria-pressed={selected === plan.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.08 }}
            onClick={() => setSelected(plan.id)}
          >
            {plan.highlight && (
              <span className="plan-badge">Mais escolhido</span>
            )}
            <strong>{plan.name}</strong>
            <b className="plan-price">{plan.priceKz} Kz</b>
            <span className="plan-days">{plan.days} dias</span>
          </motion.button>
        ))}
      </div>

      {error && (
        <div role="alert" className="plans-error">
          {error}
        </div>
      )}

      <button
        type="button"
        className="plans-continue"
        disabled={selected === null || saving}
        onClick={() => void onContinue()}
      >
        {saving ? 'A processar…' : 'Continuar'}
      </button>
    </div>
  );
}
