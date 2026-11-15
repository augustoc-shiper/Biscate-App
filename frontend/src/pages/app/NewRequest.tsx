import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Category, Bairro } from '../../api/professionals.api';
import { listBairros, listCategories } from '../../api/professionals.api';
import { createRequest } from '../../api/requests.api';
import './Requests.css';
import './NewRequest.css';

const WHEN_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Esta semana' },
  { value: 'flexible', label: 'Flexível' },
] as const;

function apiMessage(err: unknown): string {
  const data = (
    err as { response?: { data?: { error?: { message?: string } } } }
  )?.response?.data;
  return data?.error?.message ?? 'Algo correu mal. Tente novamente.';
}

export default function NewRequest() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [bairros, setBairros] = useState<Bairro[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [bairroId, setBairroId] = useState<number | null>(null);
  const [when, setWhen] = useState<'today' | 'week' | 'flexible'>('today');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listCategories()
      .then((rows) => {
        if (!cancelled) {
          setCategories(rows);
          setCategoryId((current) => current ?? rows[0]?.id ?? null);
        }
      })
      .catch(() => {});
    listBairros()
      .then((rows) => {
        if (!cancelled) {
          setBairros(rows);
          setBairroId((current) => current ?? rows[0]?.id ?? null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (categoryId === null || bairroId === null) return;
    setSaving(true);
    setError(null);
    try {
      await createRequest({ categoryId, description, bairroId, when });
      navigate('/app/requests', { replace: true });
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.form
      className="new-request"
      onSubmit={(event) => void onSubmit(event)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h1>Novo pedido</h1>

      <fieldset className="chip-field">
        <legend>Categoria</legend>
        <div className="chip-row">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={categoryId === category.id ? 'chip on' : 'chip'}
              aria-pressed={categoryId === category.id}
              onClick={() => setCategoryId(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span>Descrição</span>
        <textarea
          aria-label="Descrição"
          rows={4}
          placeholder="Descreva o trabalho com mais detalhe…"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>

      <label className="field">
        <span>Bairro</span>
        <select
          aria-label="Bairro"
          value={bairroId ?? ''}
          onChange={(event) => setBairroId(Number(event.target.value))}
        >
          {bairros.map((bairro) => (
            <option key={bairro.id} value={bairro.id}>
              {bairro.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="chip-field">
        <legend>Quando</legend>
        <div className="chip-row">
          {WHEN_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={when === option.value ? 'chip on' : 'chip'}
              aria-pressed={when === option.value}
              onClick={() => setWhen(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      {error && (
        <div role="alert" className="toast">
          {error}
        </div>
      )}

      <button type="submit" className="btn-red" disabled={saving}>
        {saving ? 'A publicar…' : 'Publicar pedido'}
      </button>
    </motion.form>
  );
}
