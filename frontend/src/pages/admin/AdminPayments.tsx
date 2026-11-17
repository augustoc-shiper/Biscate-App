import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  approvePayment,
  getProofBlob,
  listAdminPayments,
  rejectPayment,
  type AdminPayment,
} from '../../api/admin.api';
import { PaymentStatusBadge } from '../../components/StatusBadge';
import './AdminPayments.css';

type Action = 'approve' | 'reject';
type Confirming = { id: string; action: Action };
type Filter = 'pending' | 'all';

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

export default function AdminPayments() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('pending');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Confirming | null>(null);
  const [proof, setProof] = useState<{ url: string; title: string } | null>(null);
  const proofUrlRef = useRef<string | null>(null);

  async function load(): Promise<void> {
    const rows = await listAdminPayments();
    setPayments(rows);
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

  // A URL temporária do comprovativo é sempre libertada.
  useEffect(
    () => () => {
      if (proofUrlRef.current && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(proofUrlRef.current);
      }
    },
    [],
  );

  function closeProof(): void {
    setProof(null);
    if (proofUrlRef.current && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(proofUrlRef.current);
    }
    proofUrlRef.current = null;
  }

  async function openProof(payment: AdminPayment): Promise<void> {
    setError(null);
    setBusy(payment.id);
    try {
      const blob = await getProofBlob(payment.id);
      closeProof();
      const url =
        typeof URL.createObjectURL === 'function'
          ? URL.createObjectURL(blob)
          : '';
      proofUrlRef.current = url;
      setProof({
        url,
        title: `Comprovativo · ${payment.professionalName} · ${payment.reference}`,
      });
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function decide(payment: AdminPayment, action: Action): Promise<void> {
    setBusy(payment.id);
    setError(null);
    setNotice(null);
    try {
      if (action === 'approve') await approvePayment(payment.id);
      else await rejectPayment(payment.id);
      setNotice(
        action === 'approve'
          ? `Pagamento de ${payment.professionalName} aprovado.`
          : `Pagamento de ${payment.professionalName} rejeitado.`,
      );
      setConfirming(null);
      await load();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusy(null);
    }
  }

  const visible = payments.filter((payment) =>
    filter === 'pending'
      ? payment.status === 'pending' ||
        payment.status === 'proof_sent' ||
        payment.status === 'confirmed'
      : true,
  );

  if (loading) return <p className="admin-empty">A carregar…</p>;

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1>Administração · Pagamentos</h1>
          <p>Analisa comprovativos e decide sobre os pagamentos manuais.</p>
        </div>
        <Link to="/app" className="admin-link">
          Voltar à app
        </Link>
      </header>

      <div className="admin-filters" role="group" aria-label="Filtrar pagamentos">
        <button
          type="button"
          className={filter === 'pending' ? 'on' : ''}
          onClick={() => setFilter('pending')}
        >
          Pendentes
        </button>
        <button
          type="button"
          className={filter === 'all' ? 'on' : ''}
          onClick={() => setFilter('all')}
        >
          Todos
        </button>
      </div>

      {notice && (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="admin-empty">Nenhum pagamento nesta vista.</p>
      ) : (
        <ul className="admin-list">
          {visible.map((payment) => (
            <li key={payment.id} className="admin-card">
              <div className="admin-card-top">
                <strong>{payment.professionalName}</strong>
                <PaymentStatusBadge status={payment.status} />
              </div>
              <dl className="admin-facts">
                <div>
                  <dt>Referência</dt>
                  <dd>{payment.reference}</dd>
                </div>
                <div>
                  <dt>Valor</dt>
                  <dd>
                    {payment.amountKz.toLocaleString('pt-AO')} {payment.currency}
                  </dd>
                </div>
                <div>
                  <dt>Criado</dt>
                  <dd>{formatDate(payment.createdAt)}</dd>
                </div>
                <div>
                  <dt>Comprovativo</dt>
                  <dd>{payment.proofSentAt ? formatDate(payment.proofSentAt) : '—'}</dd>
                </div>
              </dl>

              {confirming?.id === payment.id ? (
                <div className="admin-confirm" role="group" aria-label="Confirmar decisão">
                  <p>
                    Confirmas {confirming.action === 'approve' ? 'a aprovação' : 'a rejeição'}{' '}
                    deste pagamento? Esta acção é definitiva.
                  </p>
                  <div className="admin-actions">
                    <button
                      type="button"
                      className="admin-button danger"
                      disabled={busy === payment.id}
                      onClick={() => void decide(payment, confirming.action)}
                    >
                      {busy === payment.id
                        ? 'A processar…'
                        : confirming.action === 'approve'
                          ? 'Confirmar aprovação'
                          : 'Confirmar rejeição'}
                    </button>
                    <button
                      type="button"
                      className="admin-button ghost"
                      disabled={busy === payment.id}
                      onClick={() => setConfirming(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="admin-actions">
                  {payment.proofUrl && (
                    <button
                      type="button"
                      className="admin-button ghost"
                      disabled={busy === payment.id}
                      onClick={() => void openProof(payment)}
                    >
                      Ver comprovativo
                    </button>
                  )}
                  <button
                    type="button"
                    className="admin-button approve"
                    disabled={busy === payment.id}
                    onClick={() => setConfirming({ id: payment.id, action: 'approve' })}
                  >
                    Aprovar
                  </button>
                  <button
                    type="button"
                    className="admin-button reject"
                    disabled={busy === payment.id}
                    onClick={() => setConfirming({ id: payment.id, action: 'reject' })}
                  >
                    Rejeitar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {proof && (
        <div className="admin-modal" role="dialog" aria-modal="true" aria-label={proof.title}>
          <div className="admin-modal-inner">
            <div className="admin-modal-head">
              <strong>{proof.title}</strong>
              <button type="button" className="admin-button ghost" onClick={closeProof}>
                Fechar
              </button>
            </div>
            {proof.url ? (
              <img src={proof.url} alt={proof.title} />
            ) : (
              <p>Pré-visualização indisponível neste ambiente.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
