import { apiClient } from './client';

export type Peer = {
  id: string;
  name: string;
  avatarUrl: string | null;
  verified: boolean;
};

export type Conversation = {
  id: string;
  peer: Peer;
  lastMessage: { body: string | null; kind: string; createdAt: string } | null;
  unreadCount: number;
  lastMessageAt: string | null;
};

export type MessageKind = 'text' | 'image' | 'quote' | 'rating';

export type Message = {
  id: string;
  conversationId?: string;
  body: string | null;
  kind: MessageKind;
  payload: Record<string, unknown> | null;
  senderId: string;
  senderName?: string;
  createdAt: string;
};

export async function listConversations(): Promise<Conversation[]> {
  const res = await apiClient.get('/conversations');
  return (res.data as { data: Conversation[] }).data;
}

export async function listMessages(
  conversationId: string,
): Promise<{ data: Message[]; meta: { total: number } }> {
  const res = await apiClient.get(`/conversations/${conversationId}/messages`);
  return res.data as { data: Message[]; meta: { total: number } };
}

export async function sendMessage(
  conversationId: string,
  input: { body: string; kind?: MessageKind; payload?: Record<string, unknown> },
): Promise<Message> {
  const res = await apiClient.post(
    `/conversations/${conversationId}/messages`,
    input,
  );
  return (res.data as { data: Message }).data;
}

export async function createConversation(
  professionalId: string,
): Promise<{ id: string }> {
  const res = await apiClient.post('/conversations', { professionalId });
  return (res.data as { data: { id: string } }).data;
}

export async function createReview(
  conversationId: string,
  input: { stars: number; comment?: string },
): Promise<unknown> {
  const res = await apiClient.post('/reviews', {
    conversationId,
    ...input,
  });
  return (res.data as { data: unknown }).data;
}
