import { useEffect, useState } from 'react';
import type { NotificationList } from '../../api/notifications.api';
import { listNotifications, markRead } from '../../api/notifications.api';
import './Notifications.css';

const KIND_LABEL: Record<string, string> = {
  message: 'Mensagem',
  proposal: 'Proposta',
  accepted: 'Proposta aceite',
  rating: 'Avaliação',
  plan: 'Plano',
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationList | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listNotifications()
      .then((res) => {
        if (cancelled) return;
        setNotifications(res);
        if (res.meta.unread === 0) return;
        return markRead().then(() => {
          if (cancelled) return;
          setNotifications({
            data: res.data.map((item) => ({
              ...item,
              readAt: item.readAt ?? new Date().toISOString(),
            })),
            meta: { unread: 0 },
          });
        });
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar notificações.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <p className="notif-empty" role="alert">
        {error}
      </p>
    );
  }
  if (!notifications) return <p className="notif-empty">A carregar…</p>;
  if (notifications.data.length === 0) {
    return <p className="notif-empty">Sem notificações.</p>;
  }

  return (
    <ul className="notif-list">
      {notifications.data.map((item) => (
        <li key={item.id} className={item.readAt ? 'read' : 'unread'}>
          <div className="notif-top">
            <span className="notif-kind">{KIND_LABEL[item.kind] ?? item.kind}</span>
            <time>
              {new Date(item.createdAt).toLocaleString('pt-PT', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
          </div>
          <p>{item.body}</p>
        </li>
      ))}
    </ul>
  );
}
