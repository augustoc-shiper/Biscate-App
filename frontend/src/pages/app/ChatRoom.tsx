import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  createConversation,
  createReview,
  listMessages,
  sendMessage,
  type Message,
} from '../../api/chat.api';
import MessageBubble from '../../components/MessageBubble';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import './ChatRoom.css';

function apiMessage(err: unknown): string {
  const data = (
    err as { response?: { data?: { error?: { message?: string } } } }
  )?.response?.data;
  return data?.error?.message ?? 'Algo correu mal. Tente novamente.';
}

export default function ChatRoom() {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();

  const [conversationId, setConversationId] = useState(id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const [ratingStars, setRatingStars] = useState(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (id !== 'nova') return;
    const professionalId = searchParams.get('professionalId');
    if (!professionalId) return;
    createConversation(professionalId)
      .then(({ id: newId }) => {
        setConversationId(newId);
        navigate(`/app/chat/${newId}`, { replace: true });
      })
      .catch((err) => setToast(apiMessage(err)));
  }, [id, searchParams, navigate]);

  useEffect(() => {
    if (!conversationId || conversationId === 'nova') return;
    let cancelled = false;
    listMessages(conversationId)
      .then((res) => {
        if (!cancelled) {
          setMessages(res.data);
          setLoaded(conversationId);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setToast(apiMessage(err));
          setLoaded(conversationId);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  useEffect(() => {
    if (!socket || !conversationId || conversationId === 'nova') return;
    socket.emit('conversation:join', { conversationId });

    const onMessage = (message: Message) => {
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message],
      );
    };
    const onTyping = (payload: {
      conversationId: string;
      userId: string;
      isTyping: boolean;
    }) => {
      if (payload.conversationId !== conversationId) return;
      if (payload.userId !== user?.id) setPeerTyping(payload.isTyping);
    };

    socket.on('message:new', onMessage);
    socket.on('typing:state', onTyping);
    return () => {
      socket.off('message:new', onMessage);
      socket.off('typing:state', onTyping);
    };
  }, [socket, conversationId, user?.id]);

  const loading = loaded !== conversationId;

  async function send(
    body: string,
    kind?: 'text' | 'quote',
  ): Promise<void> {
    const trimmed = body.trim();
    if (!trimmed) return;
    setToast(null);
    try {
      const message = await sendMessage(conversationId, {
        body: trimmed,
        ...(kind && kind !== 'text' ? { kind, payload: { note: trimmed } } : {}),
      });
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message],
      );
      setText('');
    } catch (err) {
      setToast(apiMessage(err));
    }
  }

  function onTextChange(value: string): void {
    setText(value);
    if (!socket) return;
    socket.emit('typing', { conversationId, isTyping: true });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('typing', { conversationId, isTyping: false });
    }, 1200);
  }

  const alreadyRated = messages.some(
    (m) => m.kind === 'rating' && m.senderId === user?.id,
  );
  const canRate =
    user?.role === 'client' && loaded !== null && messages.length > 0 && !alreadyRated;

  async function submitRating(stars: number): Promise<void> {
    setToast(null);
    try {
      await createReview(conversationId, { stars });
      const res = await listMessages(conversationId);
      setMessages(res.data);
      setRatingStars(0);
    } catch (err) {
      setToast(apiMessage(err));
    }
  }

  return (
    <div className="chat-room">
      <div className="chat-messages" aria-live="polite">
        {loading ? (
          <p className="chat-empty">A carregar mensagens…</p>
        ) : messages.length === 0 ? (
          <p className="chat-empty">Nenhuma mensagem ainda. Diga olá!</p>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <MessageBubble
                  message={message}
                  mine={message.senderId === user?.id}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        {peerTyping && (
          <p className="chat-typing" data-testid="typing">
            a escrever…
          </p>
        )}
      </div>

      {toast && (
        <div role="alert" className="toast">
          {toast}
        </div>
      )}

      {canRate && (
        <div className="chat-rate">
          <span>Avaliar este serviço</span>
          {[1, 2, 3, 4, 5].map((stars) => (
            <button
              key={stars}
              type="button"
              aria-label={`${stars} estrelas`}
              className={stars <= ratingStars ? 'star on' : 'star'}
              onClick={() => {
                setRatingStars(stars);
                void submitRating(stars);
              }}
            >
              ★
            </button>
          ))}
        </div>
      )}

      <div className="chat-chips">
        <button type="button" onClick={() => void send('Quanto custa?')}>
          Quanto custa?
        </button>
        <button
          type="button"
          onClick={() => void send('Pedir orçamento', 'quote')}
        >
          Pedir orçamento
        </button>
      </div>

      <form
        className="chat-input"
        onSubmit={(event) => {
          event.preventDefault();
          void send(text);
        }}
      >
        <input
          aria-label="Mensagem"
          placeholder="Escreva uma mensagem…"
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
        />
        <button type="submit" aria-label="Enviar" disabled={!text.trim()}>
          Enviar
        </button>
      </form>
    </div>
  );
}
