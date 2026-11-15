import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { Bairro, Category } from '../../api/professionals.api';
import { listBairros, listCategories } from '../../api/professionals.api';
import {
  updateProfile,
  uploadPhoto,
  type UploadedPhoto,
} from '../../api/profile.api';
import './NewRequest.css';

function apiMessage(err: unknown): string {
  const data = (
    err as { response?: { data?: { error?: { message?: string } } } }
  )?.response?.data;
  return data?.error?.message ?? 'Algo correu mal. Tente novamente.';
}

export default function EditProfile() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [bairros, setBairros] = useState<Bairro[]>([]);
  const [bio, setBio] = useState('');
  const [priceText, setPriceText] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [bairroId, setBairroId] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState('');
  const [availableToday, setAvailableToday] = useState(false);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listCategories()
      .then((rows) => {
        if (!cancelled) setCategories(rows);
      })
      .catch(() => {});
    listBairros()
      .then((rows) => {
        if (!cancelled) setBairros(rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = {};
      if (bio.trim()) payload.bio = bio.trim();
      if (priceText.trim()) payload.priceText = priceText.trim();
      if (categoryId !== null) payload.categoryId = categoryId;
      if (bairroId !== null) payload.bairroId = bairroId;
      if (responseTime.trim()) payload.responseTime = responseTime.trim();
      payload.availableToday = availableToday;

      await updateProfile(payload);
      setMessage('Perfil actualizado.');
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onPhotoChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    try {
      const photo = await uploadPhoto(file);
      setPhotos((prev) => [...prev, photo]);
      setMessage('Foto adicionada.');
    } catch (err) {
      setError(apiMessage(err));
    }
  }

  return (
    <motion.form
      className="new-request edit-profile"
      onSubmit={(event) => void onSubmit(event)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h1>Editar perfil</h1>

      <label className="field">
        <span>Biografia</span>
        <textarea
          aria-label="Biografia"
          rows={3}
          maxLength={500}
          placeholder="Fala um pouco sobre ti e o teu trabalho…"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
        />
      </label>

      <label className="field">
        <span>Preço (ex.: "desde 5000 Kz")</span>
        <input
          aria-label="Preço"
          type="text"
          maxLength={120}
          value={priceText}
          onChange={(event) => setPriceText(event.target.value)}
        />
      </label>

      <label className="field">
        <span>Categoria</span>
        <select
          aria-label="Categoria"
          value={categoryId ?? ''}
          onChange={(event) =>
            setCategoryId(
              event.target.value === '' ? null : Number(event.target.value),
            )
          }
        >
          <option value="">Manter actual</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Bairro</span>
        <select
          aria-label="Bairro"
          value={bairroId ?? ''}
          onChange={(event) =>
            setBairroId(
              event.target.value === '' ? null : Number(event.target.value),
            )
          }
        >
          <option value="">Manter actual</option>
          {bairros.map((bairro) => (
            <option key={bairro.id} value={bairro.id}>
              {bairro.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Tempo de resposta (ex.: "Respondo em 1 hora")</span>
        <input
          aria-label="Tempo de resposta"
          type="text"
          maxLength={120}
          value={responseTime}
          onChange={(event) => setResponseTime(event.target.value)}
        />
      </label>

      <label className="edit-check">
        <input
          type="checkbox"
          checked={availableToday}
          onChange={(event) => setAvailableToday(event.target.checked)}
        />
        Disponível hoje
      </label>

      <div className="edit-photos">
        <span>Fotos de trabalhos (máx. 6)</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Adicionar foto"
          onChange={(event) => void onPhotoChange(event)}
        />
        {photos.length > 0 && (
          <div className="edit-photo-strip">
            {photos.map((photo) => (
              <img key={photo.id} src={photo.url} alt="Trabalho enviado" />
            ))}
          </div>
        )}
      </div>

      {message && (
        <p className="edit-success" role="status">
          {message}
        </p>
      )}
      {error && (
        <div role="alert" className="toast">
          {error}
        </div>
      )}

      <button type="submit" className="btn-red" disabled={saving}>
        {saving ? 'A guardar…' : 'Guardar alterações'}
      </button>
    </motion.form>
  );
}
