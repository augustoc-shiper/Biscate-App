import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
  confirmPayment,
  createPayment,
  listPayments,
  listPlans,
} from '../../api/payments.api';
import Payment from './Payment';
import Plans from './Plans';

vi.mock('../../api/payments.api', () => ({
  listPlans: vi.fn(),
  createPayment: vi.fn(),
  listPayments: vi.fn(),
  confirmPayment: vi.fn(),
}));

const mockedListPlans = listPlans as Mock;
const mockedCreatePayment = createPayment as Mock;
const mockedListPayments = listPayments as Mock;
const mockedConfirmPayment = confirmPayment as Mock;

const PLANS = [
  { id: 1, name: 'Básico', days: 7, priceKz: 1500, highlight: false },
  { id: 2, name: 'Pro', days: 30, priceKz: 5000, highlight: true },
];

const PAYMENT = {
  id: 'pay-1',
  planId: 2,
  entity: '90210',
  reference: '123 456 789',
  status: 'pending',
  professionalId: 'pro-1',
  createdAt: '2026-11-14T10:00:00.000Z',
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

beforeEach(() => {
  vi.clearAllMocks();
  mockedListPlans.mockResolvedValue(PLANS);
  mockedListPayments.mockResolvedValue([PAYMENT]);
});

describe('Plans e Payment', () => {
  it('selecciona um plano, cria pagamento e mostra entidade e referência', async () => {
    mockedCreatePayment.mockResolvedValue(PAYMENT);

    const user = userEvent.setup();
    renderPlans();

    expect(await screen.findByText('Mais escolhido')).toBeInTheDocument();
    expect(screen.getByText('1500 Kz')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /pro/i }));
    await user.click(screen.getByRole('button', { name: /continuar/i }));

    expect(mockedCreatePayment).toHaveBeenCalledWith(2);
    expect(await screen.findByText('90210')).toBeInTheDocument();
    expect(screen.getByText('123 456 789')).toBeInTheDocument();
  });

  it('"Já paguei" chama o confirm e mostra plano activado', async () => {
    mockedConfirmPayment.mockResolvedValue({ ...PAYMENT, status: 'confirmed' });

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/app/plans/pagamento?paymentId=pay-1']}>
        <Routes>
          <Route path="/app/plans/pagamento" element={<Payment />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /já paguei/i }));

    expect(mockedConfirmPayment).toHaveBeenCalledWith('pay-1');
    expect(
      await screen.findByText(/plano activado/i),
    ).toBeInTheDocument();
  });
});
