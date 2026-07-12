import { render, screen } from '@testing-library/react';
import PageHeader from './PageHeader';

describe('PageHeader', () => {
  it('renders the page title', () => {
    render(<PageHeader title="Produtos" />);
    expect(screen.getByText('Produtos')).toBeInTheDocument();
  });

  it('renders an optional action slot', () => {
    render(<PageHeader title="Produtos" action={<button>Adicionar</button>} />);
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeInTheDocument();
  });

  it('renders without an action slot', () => {
    render(<PageHeader title="Produtos" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
