import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
  approvePayment,
  getProofBlob,
  listAdminPayments,
  rejectPayment,
  type AdminPayment,
} from '../../api/admin.api';
import AdminPayments from './AdminPayments';

vi.mock('../../api/admin.api', () => ({
  listAdminPayments: vi.fn(),
  approvePayment: vi.fn(),
  rejectPayment: vi.fn(),
  getProofBlob: vi.fn(),
}));

const mockedList = listAdminPayments as Mock;
const mockedApprove = approvePayment as Mock;
const mockedReject = rejectPayment as Mock;
const mockedProof = getProofBlob as Mock;

const PAYMENT: AdminPayment = {
  id: 'pay-1',
  professionalId: 'pro-1',
  professionalName: 'Ana Profissional',
  planId: 2,
  amountKz: 5000,
  currency: 'AOA',
  status: 'proof_sent',
  reference: '123 456 789',
  proofUrl: '/uploads/secret.jpg',
  proofSentAt: '2026-11-15T10:00:00.000Z',
  createdAt: '2026-11-14T10:00:00.000Z',
  approvedAt: null,
  rejectedAt: null,
  subscriptionId: 'sub-1',
  subscriptionStatus: 'pending_payment',
};

function renderAdmin() {
  return render(
    <MemoryRouter>
      <AdminPayments />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedList.mockResolvedValue([PAYMENT]);
  mockedApprove.mockResolvedValue({ payment: PAYMENT, subscription: null });
  mockedReject.mockResolvedValue({ payment: PAYMENT, subscription: null });
  mockedProof.mockResolvedValue(new Blob(['imagem'], { type: 'image/png' }));
});

describe('AdminPayments', () => {
  it('lista pagamentos pendentes e exige confirmação antes de aprovar', async () => {
    const user = userEvent.setup();
    renderAdmin();

    expect(await screen.findByText('Ana Profissional')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^aprovar$/i }));
    expect(mockedApprove).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /confirmar aprovação/i }));
    expect(mockedApprove).toHaveBeenCalledWith('pay-1');
    expect(await screen.findByText(/aprovado/i)).toBeInTheDocument();
  });

  it('rejeita com confirmação', async () => {
    const user = userEvent.setup();
    renderAdmin();

    await user.click(await screen.findByRole('button', { name: /^rejeitar$/i }));
    await user.click(screen.getByRole('button', { name: /confirmar rejeição/i }));
    expect(mockedReject).toHaveBeenCalledWith('pay-1');
  });

  it('descarrega o comprovativo por blob autenticado, sem usar proofUrl público', async () => {
    const user = userEvent.setup();
    renderAdmin();

    await user.click(
      await screen.findByRole('button', { name: /ver comprovativo/i }),
    );

    expect(mockedProof).toHaveBeenCalledWith('pay-1');
    expect(
      screen.getByRole('dialog', { name: /comprovativo/i }),
    ).toBeInTheDocument();
  });
});
