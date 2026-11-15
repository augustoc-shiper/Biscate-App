import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { listConversations, type Conversation } from '../../api/chat.api';
import './ChatList.css';

export default function ChatList() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listConversations()
      .then((rows) => {
        if (!cancelled) setConversations(rows);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className="chat-list-empty">A carregar…</p>;
  if (conversations.length === 0) {
    return <p className="chat-list-empty">Nenhuma conversa ainda.</p>;
  }

  return (
    <ul className="chat-list">
      {conversations.map((conv) => (
        <li key={conv.id}>
          <Link to={`/app/chat/${conv.id}`} className="chat-list-item">
            <div className="chat-avatar">
              {conv.peer.avatarUrl ? (
                <img src={conv.peer.avatarUrl} alt={conv.peer.name} />
              ) : (
                <span>
                  {conv.peer.name
                    .split(' ')
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </span>
              )}
            </div>
            <div className="chat-list-body">
              <div className="chat-list-top">
                <strong>
                  {conv.peer.name}
                  {conv.peer.verified && <i aria-label="Verificado"> ✓</i>}
                </strong>
                {conv.lastMessage && (
                  <time>
                    {new Date(conv.lastMessage.createdAt).toLocaleTimeString(
                      'pt-PT',
                      { hour: '2-digit', minute: '2-digit' },
                    )}
                  </time>
                )}
              </div>
              <p>{conv.lastMessage?.body ?? 'Sem mensagens'}</p>
            </div>
            {conv.unreadCount > 0 && (
              <span className="chat-unread">{conv.unreadCount}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
