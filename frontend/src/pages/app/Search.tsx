import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  listCategories,
  type Category,
} from '../../api/professionals.api';
import ProfessionalCard from '../../components/ProfessionalCard';
import { useProfessionals } from '../../hooks/useProfessionals';
import './Search.css';

type Sort = 'rating' | 'price' | 'distance';

export default function Search() {
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string | null>(
    searchParams.get('category'),
  );
  const [sort, setSort] = useState<Sort>('rating');
  const [categories, setCategories] = useState<Category[]>([]);
  const bairro = searchParams.get('bairro') ?? undefined;

  useEffect(() => {
    let cancelled = false;
    listCategories()
      .then((rows) => {
        if (!cancelled) setCategories(rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const { data, loading } = useProfessionals({
    q: q || undefined,
    category: category ?? undefined,
    bairro,
    sort,
  });

  return (
    <div className="search-page">
      <h1>Pesquisar</h1>

      <input
        className="search-input"
        type="search"
        aria-label="Procurar profissional"
        placeholder="Procurar serviços ou nomes…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="search-chips" role="group" aria-label="Categorias">
        <button
          type="button"
          className={category === null ? 'chip active' : 'chip'}
          onClick={() => setCategory(null)}
        >
          Todas
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={category === cat.name ? 'chip active' : 'chip'}
            aria-pressed={category === cat.name}
            onClick={() => setCategory(category === cat.name ? null : cat.name)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <label className="search-sort">
        Ordenar por
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
        >
          <option value="rating">Nota</option>
          <option value="price">Preço</option>
          <option value="distance">Distância</option>
        </select>
      </label>

      <div className="search-list">
        {loading && data.length === 0 && (
          <p className="search-loading">A carregar…</p>
        )}
        {!loading && data.length === 0 && (
          <p className="search-empty">Nenhum profissional encontrado.</p>
        )}
        {data.map((pro, index) => (
          <motion.div
            key={pro.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.4) }}
          >
            <ProfessionalCard pro={pro} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
