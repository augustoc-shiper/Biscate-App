import { apiClient } from './client';

export type ProfileUpdate = {
  bio?: string;
  priceText?: string;
  categoryId?: number;
  bairroId?: number;
  availableToday?: boolean;
  responseTime?: string;
};

export type UploadedPhoto = { id: string; url: string };

export async function updateProfile(input: ProfileUpdate): Promise<unknown> {
  const res = await apiClient.put('/profile', input);
  return (res.data as { data: unknown }).data;
}

export async function uploadPhoto(file: File): Promise<UploadedPhoto> {
  const form = new FormData();
  form.append('photo', file);
  const res = await apiClient.post('/profile/photos', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return (res.data as { data: UploadedPhoto }).data;
}
