import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ProfessionalListItem } from '../../api/professionals.api';
import { listFavorites } from '../../api/professionals.api';
import { listNotifications } from '../../api/notifications.api';
import { useAuth } from '../../context/AuthContext';
import './Me.css';

export default function Me() {
  const { user, logout } = useAuth();
  const [favorites, setFavorites] = useState<ProfessionalListItem[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listFavorites()
      .then((rows) => {
        if (!cancelled) setFavorites(rows);
      })
      .catch(() => {});
    listNotifications()
      .then((res) => {
        if (!cancelled) setUnread(res.meta.unread);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="me-page">
      <div className="me-card">
        <div className="me-avatar" aria-hidden>
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} />
          ) : (
            initials
          )}
        </div>
        <div>
          <h1>{user.name}</h1>
          <p>{user.email}</p>
          <span className="me-role">
            {user.role === 'professional'
              ? 'Profissional'
              : user.role === 'admin'
                ? 'Administrador'
                : 'Cliente'}
          </span>
        </div>
      </div>

      <nav className="me-menu">
        <Link to="/app/notificacoes" className="me-row">
          Notificações
          {unread > 0 && (
            <span className="me-badge" aria-label={`${unread} não lidas`}>
              {unread}
            </span>
          )}
        </Link>
        {user.role === 'professional' && (
          <Link to="/app/me/editar" className="me-row">
            Editar perfil
          </Link>
        )}
        {user.role === 'admin' && (
          <Link to="/admin" className="me-row">
            Administração de pagamentos
          </Link>
        )}
        <details className="me-row me-help">
          <summary>Ajuda</summary>
          <p>
            Precisa de ajuda? Contacte-nos em suporte@biscate.ao. Para
            pagamentos, confirme sempre a entidade e a referência geradas na
            app antes de pagar.
          </p>
        </details>
      </nav>

      <section className="me-favorites">
        <h2>Favoritos</h2>
        {favorites.length === 0 ? (
          <p className="me-empty">Nenhum favorito ainda.</p>
        ) : (
          <ul>
            {favorites.map((fav) => (
              <li key={fav.id}>
                <Link to={`/app/professional/${fav.id}`}>{fav.name}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        type="button"
        className="me-logout"
        onClick={() => {
          void logout();
        }}
      >
        Terminar sessão
      </button>
    </div>
  );
}
