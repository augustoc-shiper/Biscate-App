import { apiClient } from './client';

export type Notification = {
  id: string;
  kind: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export type NotificationList = {
  data: Notification[];
  meta: { unread: number };
};

export async function listNotifications(): Promise<NotificationList> {
  const res = await apiClient.get('/notifications');
  return res.data as NotificationList;
}

export async function markRead(ids?: string[]): Promise<{ updated: number }> {
  const res = await apiClient.post(
    '/notifications/read',
    ids ? { ids } : {},
  );
  return (res.data as { data: { updated: number } }).data;
}
