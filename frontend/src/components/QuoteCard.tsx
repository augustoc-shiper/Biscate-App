export default function QuoteCard({
  body,
  payload,
}: {
  body: string | null;
  payload: Record<string, unknown> | null;
}) {
  const price = payload?.price;
  const note = typeof payload?.note === 'string' ? payload.note : null;

  return (
    <div className="quote-card">
      <strong>Pedido de orçamento</strong>
      {body && <p>{body}</p>}
      {typeof price === 'number' && <b>{price} Kz</b>}
      {note && <small>{note}</small>}
    </div>
  );
}
