import { ArrowLeft, Heart, MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getProfessional,
  listFavorites,
  toggleFavorite,
  type ProfessionalDetail,
} from '../../api/professionals.api';
import StarRating from '../../components/StarRating';
import './Profile.css';

type Tab = 'sobre' | 'trabalhos' | 'avaliacoes';

type Loaded = { id: string | null; error: string | null };

export default function Profile() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<{
    id: string;
    data: ProfessionalDetail;
  } | null>(null);
  const [loaded, setLoaded] = useState<Loaded>({ id: null, error: null });
  const [tab, setTab] = useState<Tab>('sobre');
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getProfessional(id)
      .then((data) => {
        if (!cancelled) {
          setDetail({ id, data });
          setLoaded({ id, error: null });
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded({ id, error: 'Profissional não encontrado.' });
      });

    listFavorites()
      .then((rows) => {
        if (!cancelled) setFavorite(rows.some((row) => row.id === id));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function onToggleFavorite(): Promise<void> {
    const previous = favorite;
    setFavorite(!previous);
    try {
      const res = await toggleFavorite(id);
      setFavorite(res.favorite);
    } catch {
      setFavorite(previous);
    }
  }

  const loading = loaded.id !== id;
  const error = loading ? null : loaded.error;
  const current = detail?.id === id ? detail.data : null;

  if (loading) return <p className="profile-loading">A carregar…</p>;
  if (error || !current) {
    return <p className="profile-loading">{error ?? 'Erro ao carregar.'}</p>;
  }

  const data = current;
  const initials = data.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="profile-page">
      <div className="profile-cover">
        <button
          type="button"
          className="profile-back"
          onClick={() => navigate(-1)}
          aria-label="Voltar"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <div className="profile-avatar" aria-hidden="true">
          {initials}
        </div>
      </div>

      <div className="profile-head">
        <h1>
          {data.name}
          {data.verified && (
            <span className="profile-verified">Verificado</span>
          )}
        </h1>
        <p className="profile-meta">
          {data.category ?? 'Serviços'} · {data.bairro ?? 'Luanda'}
        </p>
        <div className="profile-stats">
          <div>
            <StarRating value={data.ratingAvg} count={data.ratingCount} />
          </div>
          <div className="profile-price">
            {data.priceText ??
              (data.priceMin ? `desde ${data.priceMin} Kz` : 'Sob orçamento')}
          </div>
        </div>
        <div className="profile-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate(`/app/chat/nova?professionalId=${data.id}`)}
          >
            <MessageCircle size={18} aria-hidden="true" />
            Conversar
          </button>
          <button
            type="button"
            className={favorite ? 'btn-fav active' : 'btn-fav'}
            aria-pressed={favorite}
            aria-label={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            onClick={() => void onToggleFavorite()}
          >
            <Heart
              size={18}
              aria-hidden="true"
              fill={favorite ? 'currentColor' : 'none'}
            />
          </button>
        </div>
      </div>

      <div className="profile-tabs" role="tablist" aria-label="Secções do perfil">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'sobre'}
          className={tab === 'sobre' ? 'active' : ''}
          onClick={() => setTab('sobre')}
        >
          Sobre
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'trabalhos'}
          className={tab === 'trabalhos' ? 'active' : ''}
          onClick={() => setTab('trabalhos')}
        >
          Trabalhos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'avaliacoes'}
          className={tab === 'avaliacoes' ? 'active' : ''}
          onClick={() => setTab('avaliacoes')}
        >
          Avaliações
        </button>
      </div>

      <div className="profile-tabpanel">
        {tab === 'sobre' && (
          <div>
            <p>{data.bio ?? 'Sem biografia.'}</p>
            <ul className="profile-facts">
              {data.responseTime && <li>{data.responseTime}</li>}
              {data.availableToday && <li>Disponível hoje</li>}
              {data.distanceKm > 0 && <li>{data.distanceKm} km de si</li>}
            </ul>
          </div>
        )}

        {tab === 'trabalhos' && (
          <div className="profile-photos">
            {data.workPhotos.length === 0 && <p>Sem fotos de trabalhos.</p>}
            {data.workPhotos.map((photo) => (
              <img key={photo.id} src={photo.url} alt="Trabalho realizado" />
            ))}
          </div>
        )}

        {tab === 'avaliacoes' && (
          <div className="profile-reviews">
            {data.reviews.length === 0 && <p>Sem avaliações ainda.</p>}
            {data.reviews.map((review) => (
              <article key={review.id} className="profile-review">
                <div className="profile-review-head">
                  <strong>{review.reviewerName}</strong>
                  <StarRating value={review.stars} />
                </div>
                {review.comment && <p>{review.comment}</p>}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
