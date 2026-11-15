import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { listBairros, listCategories } from '../../api/professionals.api';
import { acceptOffer, declineOffer, createRequest, listRequests } from '../../api/requests.api';
import NewRequest from './NewRequest';
import Requests from './Requests';

vi.mock('../../api/requests.api', () => ({
  listRequests: vi.fn(),
  createRequest: vi.fn(),
  acceptOffer: vi.fn(),
  declineOffer: vi.fn(),
}));

vi.mock('../../api/professionals.api', () => ({
  listCategories: vi.fn(),
  listBairros: vi.fn(),
  listProfessionals: vi.fn(),
  getProfessional: vi.fn(),
  listFavorites: vi.fn(),
  toggleFavorite: vi.fn(),
}));

const mockedListRequests = listRequests as Mock;
const mockedCreateRequest = createRequest as Mock;
const mockedAcceptOffer = acceptOffer as Mock;
const mockedDeclineOffer = declineOffer as Mock;
const mockedListCategories = listCategories as Mock;
const mockedListBairros = listBairros as Mock;

function renderRequests() {
  return render(
    <MemoryRouter initialEntries={['/app/requests']}>
      <Routes>
        <Route path="/app/requests" element={<Requests />} />
        <Route path="/app/requests/nova" element={<NewRequest />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedListRequests.mockResolvedValue([
    {
      id: 'req-1',
      description: 'Fuga na canalização da cozinha',
      when: 'today',
      status: 'open',
      createdAt: '2026-11-14T09:00:00.000Z',
      offers: [
        {
          id: 'off-1',
          price: 12000,
          message: 'Consigo hoje à tarde',
          status: 'sent',
          professionalName: 'Joaquim Neto',
          professionalId: 'p1',
          verified: true,
          createdAt: '2026-11-14T09:30:00.000Z',
        },
      ],
    },
    {
      id: 'req-2',
      description: 'Trocar candeeiro da sala',
      when: 'flexible',
      status: 'done',
      createdAt: '2026-11-10T09:00:00.000Z',
      offers: [],
    },
  ]);
  mockedListCategories.mockResolvedValue([
    { id: 3, name: 'Canalização' },
    { id: 7, name: 'Electricidade' },
  ]);
  mockedListBairros.mockResolvedValue([
    { id: 1, name: 'Maianga' },
    { id: 2, name: 'Talatona' },
  ]);
});

describe('Requests', () => {
  it('mostra os pedidos com os estados do mock', async () => {
    renderRequests();

    expect(
      await screen.findByText('Fuga na canalização da cozinha'),
    ).toBeInTheDocument();
    expect(screen.getByText('Trocar candeeiro da sala')).toBeInTheDocument();
    expect(screen.getByText('Aberto')).toBeInTheDocument();
    expect(screen.getByText('Concluído')).toBeInTheDocument();
    expect(screen.getByText('Hoje')).toBeInTheDocument();
    expect(screen.getByText('Joaquim Neto')).toBeInTheDocument();
  });

  it('submeter NewRequest chama a api com o payload correcto', async () => {
    mockedCreateRequest.mockResolvedValue({ id: 'req-new' });

    const user = userEvent.setup();
    renderRequests();

    await user.click(
      await screen.findByRole('button', { name: /publicar pedido/i }),
    );

    await user.click(
      await screen.findByRole('button', { name: 'Canalização' }),
    );
    await user.type(
      screen.getByLabelText(/descrição/i),
      'Preciso de desentupir a pia da cozinha.',
    );
    await user.click(screen.getByRole('button', { name: 'Hoje' }));
    await user.click(screen.getByRole('button', { name: /publicar/i }));

    expect(await screen.findByText(/aberto/i)).toBeInTheDocument();
    expect(mockedCreateRequest).toHaveBeenCalledWith({
      categoryId: 3,
      description: 'Preciso de desentupir a pia da cozinha.',
      bairroId: 1,
      when: 'today',
    });
  });

  it('aceitar proposta chama a api e recarrega a lista', async () => {
    mockedAcceptOffer.mockResolvedValue({ id: 'off-1', status: 'accepted' });

    const user = userEvent.setup();
    renderRequests();

    await user.click(
      await screen.findByRole('button', { name: /aceitar proposta/i }),
    );

    await waitFor(() => {
      expect(mockedAcceptOffer).toHaveBeenCalledWith('off-1');
    });
    expect(mockedListRequests).toHaveBeenCalledTimes(2);
  });

  it('recusar proposta chama a api', async () => {
    mockedDeclineOffer.mockResolvedValue({ id: 'off-1', status: 'declined' });

    const user = userEvent.setup();
    renderRequests();

    await user.click(
      await screen.findByRole('button', { name: /recusar proposta/i }),
    );

    await waitFor(() => {
      expect(mockedDeclineOffer).toHaveBeenCalledWith('off-1');
    });
  });
});
