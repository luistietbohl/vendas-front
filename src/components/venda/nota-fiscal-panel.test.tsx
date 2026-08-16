import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotaFiscalPanel from './nota-fiscal-panel';
import NotaFiscalService from '../../services/nota-fiscal.service';

jest.mock('../../services/nota-fiscal.service');

const mockedService = NotaFiscalService as jest.Mocked<typeof NotaFiscalService>;

describe('NotaFiscalPanel', () => {
  let openSpy: jest.SpyInstance;

  beforeEach(() => {
    mockedService.buscar.mockResolvedValue({
      data: { vendaUid: 'venda-1', status: 'NAO_EMITIDA' },
    } as any);
    // jsdom has no real window.open; stub it so tests that don't care about
    // printing (most of them) don't log "Not implemented" noise.
    openSpy = jest.spyOn(window, 'open').mockReturnValue(null);
  });

  afterEach(() => {
    openSpy.mockRestore();
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
    expect(mockedService.emitir).toHaveBeenCalledWith('venda-1', undefined);
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
    await waitFor(() => expect(mockedService.buscar).toHaveBeenCalledWith('venda-1'));
    fireEvent.click(screen.getByRole('button', { name: 'Emitir Nota Fiscal' }));

    expect(mockedService.emitir).toHaveBeenCalledWith('venda-1', undefined);

    rerender(<NotaFiscalPanel vendaUid="venda-2" />);

    resolveEmitir!({
      data: { vendaUid: 'venda-1', status: 'AUTORIZADA', urlDanfe: 'https://focusnfe/danfe/1' },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Emitir Nota Fiscal' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('link', { name: 'Ver DANFE' })).not.toBeInTheDocument();
  });

  it('loads existing authorized status automatically on mount, without clicking emitir', async () => {
    mockedService.buscar.mockResolvedValue({
      data: { vendaUid: 'venda-1', status: 'AUTORIZADA', urlDanfe: 'https://focusnfe/danfe/existing' },
    } as any);

    render(<NotaFiscalPanel vendaUid="venda-1" />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Ver DANFE' })).toHaveAttribute(
        'href',
        'https://focusnfe/danfe/existing'
      );
    });
    expect(mockedService.emitir).not.toHaveBeenCalled();
  });

  it('opens and prints the DANFE automatically after emitir authorizes the note', async () => {
    mockedService.emitir.mockResolvedValue({
      data: { vendaUid: 'venda-1', status: 'AUTORIZADA', urlDanfe: 'https://focusnfe/danfe/1' },
    } as any);

    const fakeWindow = { addEventListener: jest.fn(), print: jest.fn() };
    openSpy.mockReturnValue(fakeWindow as any);

    render(<NotaFiscalPanel vendaUid="venda-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Emitir Nota Fiscal' }));

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith('https://focusnfe/danfe/1', '_blank');
    });

    const loadHandler = fakeWindow.addEventListener.mock.calls.find(([event]) => event === 'load')?.[1];
    expect(loadHandler).toBeDefined();
    loadHandler();
    expect(fakeWindow.print).toHaveBeenCalled();
  });

  it('does not auto-print when an authorized status is only loaded passively on mount', async () => {
    mockedService.buscar.mockResolvedValue({
      data: { vendaUid: 'venda-1', status: 'AUTORIZADA', urlDanfe: 'https://focusnfe/danfe/existing' },
    } as any);

    render(<NotaFiscalPanel vendaUid="venda-1" />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Ver DANFE' })).toBeInTheDocument();
    });
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('shows the SEFAZ rejection message and still allows retrying', async () => {
    mockedService.emitir.mockResolvedValue({
      data: {
        vendaUid: 'venda-1',
        status: 'REJEITADA',
        mensagemSefaz: 'Rejeicao: NFC-e com Data-Hora de emissao atrasada',
      },
    } as any);

    render(<NotaFiscalPanel vendaUid="venda-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Emitir Nota Fiscal' }));

    expect(
      await screen.findByText('Rejeicao: NFC-e com Data-Hora de emissao atrasada')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Emitir Nota Fiscal' })).toBeInTheDocument();
  });

  it('ignores a stale buscar response for a venda that is no longer displayed', async () => {
    let resolveBuscar: (value: any) => void;
    const pendingBuscar = new Promise((resolve) => {
      resolveBuscar = resolve;
    });
    mockedService.buscar.mockReturnValueOnce(pendingBuscar as any);
    mockedService.buscar.mockResolvedValueOnce({
      data: { vendaUid: 'venda-2', status: 'NAO_EMITIDA' },
    } as any);

    const { rerender } = render(<NotaFiscalPanel vendaUid="venda-1" />);
    expect(mockedService.buscar).toHaveBeenCalledWith('venda-1');

    rerender(<NotaFiscalPanel vendaUid="venda-2" />);

    resolveBuscar!({
      data: { vendaUid: 'venda-1', status: 'AUTORIZADA', urlDanfe: 'https://focusnfe/danfe/1' },
    });

    await waitFor(() => {
      expect(mockedService.buscar).toHaveBeenCalledWith('venda-2');
    });
    expect(screen.queryByRole('link', { name: 'Ver DANFE' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Emitir Nota Fiscal' })).toBeInTheDocument();
  });

  it('shows an invalid CPF message and disables the emitir button', () => {
    render(<NotaFiscalPanel vendaUid="venda-1" />);

    fireEvent.change(screen.getByLabelText('CPF do cliente (opcional)'), {
      target: { value: '111.111.111-11' },
    });

    expect(screen.getByText('CPF inválido')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Emitir Nota Fiscal' })).toBeDisabled();
  });

  it('does not show an invalid CPF message while the CPF is still incomplete, but keeps the button disabled', () => {
    render(<NotaFiscalPanel vendaUid="venda-1" />);

    fireEvent.change(screen.getByLabelText('CPF do cliente (opcional)'), {
      target: { value: '111.444' },
    });

    expect(screen.queryByText('CPF inválido')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Emitir Nota Fiscal' })).toBeDisabled();
  });

  it('sends only the CPF digits to the service when a valid CPF is entered', async () => {
    mockedService.emitir.mockResolvedValue({
      data: { vendaUid: 'venda-1', status: 'AUTORIZADA', urlDanfe: 'https://focusnfe/danfe/1' },
    } as any);

    render(<NotaFiscalPanel vendaUid="venda-1" />);

    fireEvent.change(screen.getByLabelText('CPF do cliente (opcional)'), {
      target: { value: '111.444.777-35' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Emitir Nota Fiscal' }));

    await waitFor(() => {
      expect(mockedService.emitir).toHaveBeenCalledWith('venda-1', '11144477735');
    });
  });

  it('clears the CPF field when the venda changes', () => {
    const { rerender } = render(<NotaFiscalPanel vendaUid="venda-1" />);

    fireEvent.change(screen.getByLabelText('CPF do cliente (opcional)'), {
      target: { value: '111.444.777-35' },
    });
    expect(screen.getByLabelText('CPF do cliente (opcional)')).toHaveValue('111.444.777-35');

    rerender(<NotaFiscalPanel vendaUid="venda-2" />);

    expect(screen.getByLabelText('CPF do cliente (opcional)')).toHaveValue('');
  });
});
