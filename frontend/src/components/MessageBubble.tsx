import type { Message } from '../api/chat.api';
import QuoteCard from './QuoteCard';
import StarRating from './StarRating';
import './MessageBubble.css';

export default function MessageBubble({
  message,
  mine,
}: {
  message: Message;
  mine: boolean;
}) {
  const time = new Date(message.createdAt).toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={mine ? 'bubble-row mine' : 'bubble-row'}
      data-testid={`msg-${message.id}`}
    >
      <div className={mine ? 'bubble mine' : 'bubble'}>
        {!mine && message.senderName && (
          <span className="bubble-sender">{message.senderName}</span>
        )}
        {message.kind === 'quote' ? (
          <QuoteCard body={message.body} payload={message.payload} />
        ) : message.kind === 'rating' ? (
          <div className="bubble-rating">
            <StarRating value={Number(message.payload?.stars ?? 0)} />
            {message.body && <p>{message.body}</p>}
          </div>
        ) : (
          <p>{message.body}</p>
        )}
        <time>{time}</time>
      </div>
    </div>
  );
}
