import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listBairros,
  listCategories,
  type Bairro,
  type Category,
} from '../../api/professionals.api';
import ProfessionalCard from '../../components/ProfessionalCard';
import { useAuth } from '../../context/AuthContext';
import { useProfessionals } from '../../hooks/useProfessionals';
import './Home.css';

export default function Home() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [bairros, setBairros] = useState<Bairro[]>([]);

  const topRated = useProfessionals({ sort: 'rating', limit: 6 });
  const list = useProfessionals({ sort: 'rating', limit: 10 });

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

  return (
    <div className="home-page">
      <p className="home-greeting">Olá, {user?.name ?? 'visitante'} 👋</p>

      <section aria-label="Categorias">
        <h2>Categorias</h2>
        <div className="home-cats">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/app/search?category=${encodeURIComponent(cat.name)}`}
              className="home-cat"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </section>

      <Link to="/app/plans" className="home-promo">
        <div>
          <strong>Publique o seu trabalho</strong>
          <span>Receba propostas de profissionais perto de si.</span>
        </div>
        <ArrowRight size={20} aria-hidden="true" />
      </Link>

      <section aria-label="Mais bem avaliados">
        <h2>Mais bem avaliados</h2>
        <div className="home-top">
          {topRated.data.map((pro) => (
            <div key={pro.id} className="home-top-item">
              <ProfessionalCard pro={pro} />
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Por bairro">
        <h2>Por bairro</h2>
        <div className="home-chips">
          {bairros.map((b) => (
            <Link
              key={b.id}
              to={`/app/search?bairro=${encodeURIComponent(b.name)}`}
              className="chip"
            >
              {b.name}
            </Link>
          ))}
        </div>
      </section>

      <section aria-label="Profissionais">
        <h2>Profissionais</h2>
        <div className="home-list">
          {list.data.map((pro) => (
            <ProfessionalCard key={pro.id} pro={pro} />
          ))}
        </div>
      </section>
    </div>
  );
}
