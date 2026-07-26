import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotaFiscalPanel from './nota-fiscal-panel';
import NotaFiscalService from '../../services/nota-fiscal.service';

jest.mock('../../services/nota-fiscal.service');

const mockedService = NotaFiscalService as jest.Mocked<typeof NotaFiscalService>;

describe('NotaFiscalPanel', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('disables the emit button when there is no venda yet', () => {
    render(<NotaFiscalPanel vendaUid={null} />);
    expect(screen.getByRole('button', { name: 'Emitir Nota Fiscal' })).toBeDisabled();
  });

  it('emits the note and shows the DANFE link once authorized', async () => {
    mockedService.emitir.mockResolvedValue({
      data: { vendaUid: 'venda-1', status: 'AUTORIZADA', urlDanfe: 'https://focusnfe/danfe/1' },
    } as any);

    render(<NotaFiscalPanel vendaUid="venda-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Emitir Nota Fiscal' }));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Ver DANFE' })).toHaveAttribute(
        'href',
        'https://focusnfe/danfe/1'
      );
    });
    expect(mockedService.emitir).toHaveBeenCalledWith('venda-1');
  });

  it('requires a justificativa of at least 15 characters to cancel', async () => {
    mockedService.emitir.mockResolvedValue({
      data: { vendaUid: 'venda-1', status: 'AUTORIZADA', urlDanfe: 'https://focusnfe/danfe/1' },
    } as any);

    render(<NotaFiscalPanel vendaUid="venda-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Emitir Nota Fiscal' }));
    await waitFor(() => screen.getByRole('link', { name: 'Ver DANFE' }));

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar Nota' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Cancelamento' }));

    expect(await screen.findByText(/pelo menos 15 caracteres/)).toBeInTheDocument();
    expect(mockedService.cancelar).not.toHaveBeenCalled();
  });

  it('ignores a stale emitir response for a venda that is no longer displayed', async () => {
    let resolveEmitir: (value: any) => void;
    const pendingEmitir = new Promise((resolve) => {
      resolveEmitir = resolve;
    });
    mockedService.emitir.mockReturnValue(pendingEmitir as any);

    const { rerender } = render(<NotaFiscalPanel vendaUid="venda-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Emitir Nota Fiscal' }));

    expect(mockedService.emitir).toHaveBeenCalledWith('venda-1');

    rerender(<NotaFiscalPanel vendaUid="venda-2" />);

    resolveEmitir!({
      data: { vendaUid: 'venda-1', status: 'AUTORIZADA', urlDanfe: 'https://focusnfe/danfe/1' },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Emitir Nota Fiscal' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('link', { name: 'Ver DANFE' })).not.toBeInTheDocument();
  });
});
