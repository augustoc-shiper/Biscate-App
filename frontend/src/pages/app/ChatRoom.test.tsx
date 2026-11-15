import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { listMessages, sendMessage } from '../../api/chat.api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import ChatRoom from './ChatRoom';

vi.mock('../../api/chat.api', () => ({
  listConversations: vi.fn(),
  listMessages: vi.fn(),
  sendMessage: vi.fn(),
  createConversation: vi.fn(),
  createReview: vi.fn(),
}));

vi.mock('../../hooks/useSocket', () => ({ useSocket: vi.fn(() => null) }));
vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }));

const mockedListMessages = listMessages as Mock;
const mockedSendMessage = sendMessage as Mock;
const mockedUseAuth = useAuth as Mock;

const CONVERSATION_ID = 'conv-1';

function renderChatRoom() {
  return render(
    <MemoryRouter initialEntries={[`/app/chat/${CONVERSATION_ID}`]}>
      <Routes>
        <Route path="/app/chat/:id" element={<ChatRoom />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseAuth.mockReturnValue({
    user: { id: 'me', name: 'Eu', role: 'client' },
    token: 'jwt',
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  });
  (useSocket as Mock).mockReturnValue(null);
  mockedListMessages.mockResolvedValue({
    data: [
      {
        id: 'm1',
        body: 'Olá, como posso ajudar?',
        kind: 'text',
        payload: null,
        senderId: 'peer',
        senderName: 'Joaquim Neto',
        createdAt: '2026-11-14T10:00:00.000Z',
      },
      {
        id: 'm2',
        body: 'Preciso de um orçamento',
        kind: 'text',
        payload: null,
        senderId: 'me',
        senderName: 'Eu',
        createdAt: '2026-11-14T10:01:00.000Z',
      },
    ],
    meta: { total: 2 },
  });
});

describe('ChatRoom', () => {
  it('renderiza as mensagens do mock', async () => {
    renderChatRoom();

    expect(await screen.findByText('Olá, como posso ajudar?')).toBeInTheDocument();
    expect(
      screen.getByText('Preciso de um orçamento'),
    ).toBeInTheDocument();
    expect(mockedListMessages).toHaveBeenCalledWith(CONVERSATION_ID);
  });

  it('enviar adiciona bubble do utilizador e chama a api', async () => {
    mockedListMessages.mockResolvedValue({ data: [], meta: { total: 0 } });
    mockedSendMessage.mockResolvedValue({
      id: 'm9',
      body: 'Bom dia!',
      kind: 'text',
      payload: null,
      senderId: 'me',
      senderName: 'Eu',
      createdAt: '2026-11-14T11:00:00.000Z',
    });

    const user = userEvent.setup();
    renderChatRoom();
    expect(await screen.findByText(/nenhuma mensagem/i)).toBeInTheDocument();

    await user.type(
      screen.getByLabelText(/mensagem/i),
      'Bom dia!',
    );
    await user.click(screen.getByRole('button', { name: /enviar/i }));

    expect(await screen.findByText('Bom dia!')).toBeInTheDocument();
    expect(mockedSendMessage).toHaveBeenCalledWith(CONVERSATION_ID, {
      body: 'Bom dia!',
    });
  });

  it('erro de envio mostra toast de erro', async () => {
    mockedListMessages.mockResolvedValue({ data: [], meta: { total: 0 } });
    mockedSendMessage.mockRejectedValue({
      response: { data: { error: { message: 'Não foi possível enviar' } } },
    });

    const user = userEvent.setup();
    renderChatRoom();
    expect(await screen.findByText(/nenhuma mensagem/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/mensagem/i), 'tentativa');
    await user.click(screen.getByRole('button', { name: /enviar/i }));

    expect(
      await screen.findByText('Não foi possível enviar'),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
