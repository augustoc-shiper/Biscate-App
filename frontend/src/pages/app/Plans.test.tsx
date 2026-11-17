import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
  createPayment,
  listPayments,
  listPlans,
  sendProof,
} from '../../api/payments.api';
import { getMySubscription } from '../../api/subscriptions.api';
import type { SubscriptionRecord } from '../../api/subscriptions.api';
import Payment from './Payment';
import Plans from './Plans';

vi.mock('../../api/payments.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/payments.api')>();
  return {
    ...actual,
    listPlans: vi.fn(),
    createPayment: vi.fn(),
    listPayments: vi.fn(),
    sendProof: vi.fn(),
  };
});

vi.mock('../../api/subscriptions.api', () => ({
  getMySubscription: vi.fn(),
}));

const mockedListPlans = listPlans as Mock;
const mockedCreatePayment = createPayment as Mock;
const mockedListPayments = listPayments as Mock;
const mockedSendProof = sendProof as Mock;
const mockedGetMySubscription = getMySubscription as Mock;

const PLANS = [
  { id: 1, name: 'Básico', days: 7, priceKz: 1500, highlight: false },
  { id: 2, name: 'Pro', days: 30, priceKz: 5000, highlight: true },
];

const PAYMENT = {
  id: 'pay-1',
  planId: 2,
  entity: '90210',
  reference: '123 456 789',
  amountKz: 5000,
  status: 'pending' as const,
  professionalId: 'pro-1',
  createdAt: '2026-11-14T10:00:00.000Z',
};

const SUB_BASE: SubscriptionRecord = {
  id: 'sub-1',
  status: 'pending_payment',
  planId: 2,
  planName: 'Pro',
  planDays: 30,
  planPriceKz: 5000,
  paymentId: 'pay-1',
  paymentReference: '123 456 789',
  paymentEntity: '90210',
  paymentStatus: 'pending',
  approvedAt: null,
  activationDeadline: null,
  activatedAt: null,
  expiresAt: null,
  needsReview: false,
  reviewReason: null,
  createdAt: '2026-11-14T10:00:00.000Z',
  updatedAt: '2026-11-14T10:00:00.000Z',
};

function renderPlans() {
  return render(
    <MemoryRouter initialEntries={['/app/plans']}>
      <Routes>
        <Route path="/app/plans" element={<Plans />} />
        <Route path="/app/plans/pagamento" element={<Payment />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderPayment() {
  return render(
    <MemoryRouter initialEntries={['/app/plans/pagamento?paymentId=pay-1']}>
      <Routes>
        <Route path="/app/plans/pagamento" element={<Payment />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedListPlans.mockResolvedValue(PLANS);
  mockedListPayments.mockResolvedValue([PAYMENT]);
  mockedGetMySubscription.mockResolvedValue({ current: null, history: [] });
  mockedSendProof.mockResolvedValue({ ...PAYMENT, status: 'proof_sent' });
});

describe('Plans', () => {
  it('selecciona um plano, pede confirmação e cria o pagamento', async () => {
    mockedCreatePayment.mockResolvedValue(PAYMENT);
    // Primeira chamada (Plans): sem bloqueios; segunda (Payment): pagamento criado.
    mockedListPayments.mockResolvedValueOnce([]).mockResolvedValue([PAYMENT]);
    const user = userEvent.setup();
    renderPlans();

    expect(await screen.findByText('Mais escolhido')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /seleccionar plano pro/i }));
    await user.click(screen.getByRole('button', { name: /^continuar$/i }));
    await user.click(
      screen.getByRole('button', { name: /confirmar e criar pagamento/i }),
    );

    expect(mockedCreatePayment).toHaveBeenCalledWith(2);
    expect(await screen.findByText('90210')).toBeInTheDocument();
    expect(screen.getByText('123 456 789')).toBeInTheDocument();
  });

  it('bloqueia nova compra com pagamento pendente', async () => {
    mockedGetMySubscription.mockResolvedValue({
      current: { ...SUB_BASE, status: 'pending_payment' },
      history: [SUB_BASE],
    });
    renderPlans();

    expect(
      await screen.findByText(/não é possível comprar agora/i),
    ).toBeInTheDocument();
    const planButtons = screen.getAllByRole('button', {
      name: /seleccionar plano/i,
    });
    expect(planButtons).toHaveLength(2);
    expect(planButtons.every((button) => button.hasAttribute('disabled'))).toBe(
      true,
    );
  });

  it('pending_activation explica o prazo de 3 dias sem descontar os dias contratados', async () => {
    mockedGetMySubscription.mockResolvedValue({
      current: {
        ...SUB_BASE,
        status: 'pending_activation',
        approvedAt: '2026-11-14T10:00:00.000Z',
        activationDeadline: '2026-11-17T10:00:00.000Z',
      },
      history: [],
    });
    renderPlans();

    expect(await screen.findByText(/até 3 dias/i)).toBeInTheDocument();
    expect(screen.getByText(/não desconta os dias contratados/i)).toBeInTheDocument();
    expect(screen.getByText(/prazo de activação/i)).toBeInTheDocument();
  });

  it('active mostra expiração e tempo restante', async () => {
    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    mockedGetMySubscription.mockResolvedValue({
      current: {
        ...SUB_BASE,
        status: 'active',
        activatedAt: '2026-11-01T10:00:00.000Z',
        expiresAt: future,
      },
      history: [],
    });
    renderPlans();

    expect(await screen.findByText(/dias restantes/i)).toBeInTheDocument();
    expect(screen.getByText(/expira em/i)).toBeInTheDocument();
  });

  it('pending_review bloqueia a compra e mostra o motivo', async () => {
    mockedGetMySubscription.mockResolvedValue({
      current: {
        ...SUB_BASE,
        status: 'pending_review',
        needsReview: true,
        reviewReason: 'Aguarda verificação documental',
      },
      history: [],
    });
    renderPlans();

    expect(await screen.findByText('Em análise')).toBeInTheDocument();
    expect(screen.getByText('Aguarda verificação documental')).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /seleccionar plano/i }).every(
        (button) => button.hasAttribute('disabled'),
      ),
    ).toBe(true);
  });
});

describe('Payment', () => {
  it('envia o comprovativo sem confirmação pelo profissional', async () => {
    const user = userEvent.setup();
    renderPayment();

    const input = await screen.findByLabelText(/ficheiro/i);
    const file = new File(['imagem'], 'comprovativo.png', { type: 'image/png' });
    await user.upload(input, file);
    await user.click(screen.getByRole('button', { name: /enviar comprovativo/i }));

    expect(mockedSendProof).toHaveBeenCalledWith('pay-1', file);
    expect(
      (await screen.findAllByText(/comprovativo enviado/i)).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/já paguei/i)).not.toBeInTheDocument();
  });

  it('rejeita formato inválido antes de chamar a API', async () => {
    renderPayment();

    const input = await screen.findByLabelText(/ficheiro/i);
    // fireEvent ignora o atributo accept para exercitar a validação em JS.
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'nota.txt', { type: 'text/plain' })] },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/apenas imagens/i);
    expect(screen.getByRole('button', { name: /enviar comprovativo/i })).toBeDisabled();
    expect(mockedSendProof).not.toHaveBeenCalled();
  });
});
