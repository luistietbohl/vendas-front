import { render, screen, fireEvent, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AppShell from './AppShell';

function renderShell(props: Partial<React.ComponentProps<typeof AppShell>> = {}) {
  return render(
    <BrowserRouter>
      <AppShell
        showAdminBoard={false}
        showCaixaBoard={false}
        currentUser="admin"
        onLogout={() => {}}
        {...props}
      >
        <div>conteudo</div>
      </AppShell>
    </BrowserRouter>
  );
}

describe('AppShell', () => {
  it('always shows Venda and Produtos for a logged-in user', () => {
    renderShell();
    expect(screen.getAllByText('Venda').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Produtos').length).toBeGreaterThan(0);
  });

  it('hides Caixa and Funcionários for a plain logged-in user', () => {
    renderShell({ showAdminBoard: false, showCaixaBoard: false });
    expect(screen.queryByText('Caixa')).not.toBeInTheDocument();
    expect(screen.queryByText('Funcionários')).not.toBeInTheDocument();
  });

  it('shows Caixa for the caixa board and Funcionários only for the admin board', () => {
    renderShell({ showAdminBoard: true, showCaixaBoard: false });
    expect(screen.getAllByText('Caixa').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Funcionários').length).toBeGreaterThan(0);
  });

  it('renders no nav items when there is no current user', () => {
    renderShell({ currentUser: null });
    expect(screen.queryByText('Produtos')).not.toBeInTheDocument();
  });

  it('opens the mobile drawer from the hamburger button', () => {
    renderShell();
    const mobileNav = screen.getByLabelText('abrir menu');
    fireEvent.click(mobileNav);
    const dialog = screen.getByRole('presentation');
    expect(within(dialog).getByText('conteudo', { exact: false })).toBeTruthy();
  });

  it('renders the page content passed as children', () => {
    renderShell();
    expect(screen.getByText('conteudo')).toBeInTheDocument();
  });
});
