import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { DashboardData } from '../../api/dashboard.api';
import { getDashboard } from '../../api/dashboard.api';
import './Dashboard.css';

type Tab = 'resumo' | 'estatisticas';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('resumo');

  useEffect(() => {
    let cancelled = false;
    getDashboard()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (cancelled) return;
        const body = (
          err as { response?: { data?: { error?: { message?: string } } } }
        )?.response?.data;
        setError(body?.error?.message ?? 'Não foi possível carregar o painel.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="dash-empty" role="alert">{error}</p>;
  if (!data) return <p className="dash-empty">A carregar…</p>;

  const stats = [
    { label: 'Visitas ao perfil', value: data.visitas },
    { label: 'Contactos', value: data.contactos },
    { label: 'Avaliação', value: data.ratingAvg },
  ];

  return (
    <div className="dashboard">
      <div className="stat-grid">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            className="stat-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.07 }}
          >
            <b>{stat.value}</b>
            <span>{stat.label}</span>
          </motion.div>
        ))}
      </div>

      <div className={data.plan.active ? 'plan-card dash' : 'plan-card dash off'}>
        {data.plan.active ? (
          <>
            <strong>Plano activo</strong>
            <span>{data.plan.daysLeft} dias restantes</span>
            <div className="plan-bar" aria-hidden>
              <div
                className="plan-bar-fill"
                style={{
                  width: `${Math.max(4, Math.min(100, (data.plan.daysLeft / 30) * 100))}%`,
                }}
              />
            </div>
          </>
        ) : (
          <>
            <strong>Plano expirado</strong>
            <span>Activa um plano para voltar a receber pedidos.</span>
            <Link to="/app/plans" className="dash-cta">
              Escolher plano
            </Link>
          </>
        )}
      </div>

      <div className="dash-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'resumo'}
          className={tab === 'resumo' ? 'on' : ''}
          onClick={() => setTab('resumo')}
        >
          Resumo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'estatisticas'}
          className={tab === 'estatisticas' ? 'on' : ''}
          onClick={() => setTab('estatisticas')}
        >
          Estatísticas
        </button>
      </div>

      {tab === 'resumo' ? (
        data.pendingOffers.length === 0 ? (
          <p className="dash-empty">Nenhuma proposta pendente.</p>
        ) : (
          <ul className="offer-list dash">
            {data.pendingOffers.map((offer) => (
              <li key={offer.id}>
                <strong>{offer.request.description}</strong>
                <b>{offer.price} Kz</b>
                <p>{offer.message}</p>
                <small>Aguarda resposta do cliente</small>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="bar-chart" aria-label="Estatísticas">
          {stats.map((stat) => {
            const max = Math.max(data.visitas, 1);
            const height =
              stat.label === 'Avaliação'
                ? (Number(stat.value) / 5) * 100
                : (Number(stat.value) / max) * 100;
            return (
              <div key={stat.label} className="bar-col">
                <div
                  className="bar"
                  style={{ height: `${Math.max(4, height)}%` }}
                />
                <span>{stat.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
