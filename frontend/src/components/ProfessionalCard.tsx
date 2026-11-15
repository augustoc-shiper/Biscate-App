import { BadgeCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ProfessionalListItem } from '../api/professionals.api';
import './ProfessionalCard.css';
import StarRating from './StarRating';

export default function ProfessionalCard({
  pro,
}: {
  pro: ProfessionalListItem;
}) {
  const initials = pro.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Link to={`/app/professional/${pro.id}`} className="pro-card">
      <div className="pro-card-avatar" aria-hidden="true">
        {initials}
      </div>
      <div className="pro-card-body">
        <h3 className="pro-card-name">
          {pro.name}
          {pro.verified && (
            <span className="pro-card-verified">
              <BadgeCheck size={15} aria-hidden="true" />
              Verificado
            </span>
          )}
        </h3>
        <p className="pro-card-meta">
          {pro.category ?? 'Serviços'} · {pro.bairro ?? 'Luanda'}
        </p>
        <div className="pro-card-row">
          <StarRating value={pro.ratingAvg} count={pro.ratingCount} />
          <strong className="pro-card-price">
            {pro.priceText ?? (pro.priceMin ? `desde ${pro.priceMin} Kz` : 'Sob orçamento')}
          </strong>
        </div>
      </div>
    </Link>
  );
}
