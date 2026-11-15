import { apiClient } from './client';

export type ProfessionalListItem = {
  id: string;
  name: string;
  verified: boolean;
  avatarUrl: string | null;
  category: string | null;
  bairro: string | null;
  ratingAvg: number;
  ratingCount: number;
  priceText: string | null;
  priceMin: number | null;
  availableToday: boolean;
  distanceKm: number;
};

export type ProfessionalParams = {
  q?: string;
  category?: string;
  bairro?: string;
  sort?: 'rating' | 'price' | 'distance';
  page?: number;
  limit?: number;
};

export type ListMeta = { total: number; page: number; limit: number };

export type Category = { id: number; name: string; icon: string };

export type Bairro = { id: number; name: string };

export type ProfessionalDetail = ProfessionalListItem & {
  bio: string | null;
  phone: string | null;
  responseTime: string | null;
  workPhotos: { id: string; url: string }[];
  reviews: {
    id: string;
    stars: number;
    comment: string | null;
    createdAt: string;
    reviewerName: string;
  }[];
};

export async function listProfessionals(
  params: ProfessionalParams = {},
): Promise<{ data: ProfessionalListItem[]; meta: ListMeta }> {
  const res = await apiClient.get('/professionals', { params });
  return res.data as {
    data: ProfessionalListItem[];
    meta: ListMeta;
  };
}

export async function getProfessional(
  id: string,
): Promise<ProfessionalDetail> {
  const res = await apiClient.get(`/professionals/${id}`);
  return (res.data as { data: ProfessionalDetail }).data;
}

export async function listCategories(): Promise<Category[]> {
  const res = await apiClient.get('/categories');
  return (res.data as { data: Category[] }).data;
}

export async function listBairros(): Promise<Bairro[]> {
  const res = await apiClient.get('/bairro');
  return (res.data as { data: Bairro[] }).data;
}

export async function listFavorites(): Promise<ProfessionalListItem[]> {
  const res = await apiClient.get('/favorites');
  return (res.data as { data: ProfessionalListItem[] }).data;
}

export async function toggleFavorite(
  professionalId: string,
): Promise<{ favorite: boolean }> {
  const res = await apiClient.post(`/favorites/${professionalId}`);
  return (res.data as { data: { favorite: boolean } }).data;
}
