import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { ServiceRequest } from '../../api/requests.api';
import { acceptOffer, declineOffer, listRequests } from '../../api/requests.api';
import './Requests.css';

const STATUS_LABEL: Record<ServiceRequest['status'], string> = {
  open: 'Aberto',
  in_conversation: 'Em conversa',
  done: 'Concluído',
};

const WHEN_LABEL: Record<ServiceRequest['when'], string> = {
  today: 'Hoje',
  week: 'Esta semana',
  flexible: 'Flexível',
};

export default function Requests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listRequests()
      .then((rows) => {
        if (!cancelled) setRequests(rows);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  async function respond(
    offerId: string,
    action: 'accept' | 'decline',
  ): Promise<void> {
    try {
      if (action === 'accept') await acceptOffer(offerId);
      else await declineOffer(offerId);
      setVersion((value) => value + 1);
    } catch {
      // erro mantém a lista como está; tentar de novo é inofensivo
    }
  }

  return (
    <div className="requests-page">
      <div className="requests-header">
        <h1>Os meus pedidos</h1>
        <button
          type="button"
          className="btn-red"
          onClick={() => navigate('/app/requests/nova')}
        >
          Publicar pedido
        </button>
      </div>

      {loading ? (
        <p className="requests-empty">A carregar…</p>
      ) : requests.length === 0 ? (
        <p className="requests-empty">Nenhum pedido publicado ainda.</p>
      ) : (
        <ul className="request-cards">
          {requests.map((request) => (
            <li key={request.id} className="request-card">
              <div className="request-top">
                <span className={`pill pill-${request.status}`}>
                  {STATUS_LABEL[request.status]}
                </span>
                <span className="pill pill-when">
                  {WHEN_LABEL[request.when]}
                </span>
              </div>
              <p className="request-desc">{request.description}</p>
              {request.offers.length > 0 && (
                <ul className="offer-list">
                  {request.offers.map((offer) => (
                    <li key={offer.id}>
                      <strong>
                        {offer.professionalName}
                        {offer.verified && <i aria-label="Verificado"> ✓</i>}
                      </strong>
                      <b>{offer.price} Kz</b>
                      <p>{offer.message}</p>
                      {offer.status === 'sent' && (
                        <div className="offer-actions">
                          <button
                            type="button"
                            aria-label="Aceitar proposta"
                            onClick={() => void respond(offer.id, 'accept')}
                          >
                            Aceitar proposta
                          </button>
                          <button
                            type="button"
                            aria-label="Recusar proposta"
                            onClick={() => void respond(offer.id, 'decline')}
                          >
                            Recusar proposta
                          </button>
                        </div>
                      )}
                      {offer.status === 'accepted' && (
                        <small className="offer-state">Proposta aceite</small>
                      )}
                      {offer.status === 'declined' && (
                        <small className="offer-state muted">
                          Proposta recusada
                        </small>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
