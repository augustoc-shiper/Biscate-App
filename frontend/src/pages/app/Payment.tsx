import { motion } from 'motion/react';
import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Payment as PaymentData } from '../../api/payments.api';
import {
  listPayments,
  PROOF_ACCEPT,
  sendProof,
  validateProofFile,
} from '../../api/payments.api';
import { PaymentStatusBadge } from '../../components/StatusBadge';
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
  const [loading, setLoading] = useState(Boolean(paymentId));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    if (!paymentId) return;
    const rows = await listPayments();
    const found = rows.find((row) => row.id === paymentId) ?? null;
    setPayment(found);
    if (!found) setError('Pagamento não encontrado.');
  }, [paymentId]);

  useEffect(() => {
    if (!paymentId) return;
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
  }, [paymentId, load]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const picked = event.target.files?.[0] ?? null;
    setFile(picked);
    setFileError(picked ? validateProofFile(picked) : 'Selecciona um comprovativo.');
    if (picked) setSent(false);
  }

  async function refreshStatus(): Promise<void> {
    setError(null);
    try {
      await load();
    } catch (err) {
      setError(apiMessage(err));
    }
  }

  async function onSubmit(): Promise<void> {
    if (!payment || !file) return;
    const invalid = validateProofFile(file);
    if (invalid) {
      setFileError(invalid);
      return;
    }
    setSaving(true);
    setError(null);
    setFileError(null);
    try {
      const updated = await sendProof(payment.id, file);
      setPayment(updated);
      setSent(true);
      setFile(null);
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

  if (!payment) {
    return (
      <p className="plans-empty" role="alert">
        {error ?? 'Pagamento não encontrado.'}
      </p>
    );
  }

  const awaitingReview =
    payment.status === 'proof_sent' || payment.status === 'confirmed';

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
          <span>Valor</span>
          <b>{payment.amountKz.toLocaleString('pt-AO')} Kz</b>
        </div>
        <div className="payment-row">
          <span>Estado</span>
          <PaymentStatusBadge status={payment.status} />
        </div>
      </div>

      {(sent || awaitingReview) && (
        <motion.div
          className="proof-sent"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          role="status"
        >
          <strong>Comprovativo enviado</strong>
          <p>
            Está a aguardar a análise da administração. Podes acompanhar o estado
            aqui; a aprovação é feita apenas pela administração.
          </p>
        </motion.div>
      )}

      {error && (
        <div role="alert" className="plans-error">
          {error}
        </div>
      )}

      {payment.status === 'pending' || payment.status === 'proof_sent' ? (
        <section className="proof-upload" aria-label="Enviar comprovativo">
          <h2>Enviar comprovativo</h2>
          <label htmlFor="proof-file">Ficheiro (JPG, JPEG, PNG ou WEBP, até 5 MB)</label>
          <input
            id="proof-file"
            type="file"
            accept={PROOF_ACCEPT}
            onChange={onFileChange}
          />
          {fileError && (
            <p className="plans-error" role="alert">
              {fileError}
            </p>
          )}
          <button
            type="button"
            className="plans-continue"
            disabled={!file || Boolean(fileError) || saving}
            onClick={() => void onSubmit()}
          >
            {saving ? 'A enviar…' : 'Enviar comprovativo'}
          </button>
        </section>
      ) : (
        <p className="plans-sub">
          Este pagamento já não aceita comprovativos. Consulta o estado acima.
        </p>
      )}

      <div className="payment-actions">
        <button type="button" className="plans-refresh" onClick={() => void refreshStatus()}>
          Actualizar estado
        </button>
        <Link to="/app/plans" className="plans-link">
          Voltar à subscrição
        </Link>
      </div>
    </div>
  );
}
