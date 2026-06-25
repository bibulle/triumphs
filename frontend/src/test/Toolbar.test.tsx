import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toolbar from '../components/Toolbar';

const baseProps = {
  search: '',
  onSearch: vi.fn(),
  hideDone: false,
  onToggleDone: vi.fn(),
  onExpandAll: vi.fn(),
  onCollapseAll: vi.fn(),
  theme: 'dark' as const,
  onToggleTheme: vi.fn(),
};

describe('Toolbar', () => {
  it('renders the search input', () => {
    render(<Toolbar {...baseProps} />);
    expect(screen.getByPlaceholderText(/Rechercher/)).toBeInTheDocument();
  });

  it('calls onSearch when the user types', async () => {
    const onSearch = vi.fn();
    render(<Toolbar {...baseProps} onSearch={onSearch} />);
    await userEvent.type(screen.getByPlaceholderText(/Rechercher/), 'test');
    expect(onSearch).toHaveBeenCalled();
  });

  it('shows "Masquer terminés" when hideDone is false', () => {
    render(<Toolbar {...baseProps} hideDone={false} />);
    expect(screen.getByText('Masquer terminés')).toBeInTheDocument();
  });

  it('shows "Afficher terminés" when hideDone is true', () => {
    render(<Toolbar {...baseProps} hideDone={true} />);
    expect(screen.getByText('Afficher terminés')).toBeInTheDocument();
  });

  it('calls onToggleDone when the button is clicked', async () => {
    const onToggleDone = vi.fn();
    render(<Toolbar {...baseProps} onToggleDone={onToggleDone} />);
    await userEvent.click(screen.getByText('Masquer terminés'));
    expect(onToggleDone).toHaveBeenCalledOnce();
  });

  it('calls onExpandAll when "Tout déplier" is clicked', async () => {
    const onExpandAll = vi.fn();
    render(<Toolbar {...baseProps} onExpandAll={onExpandAll} />);
    await userEvent.click(screen.getByText('Tout déplier'));
    expect(onExpandAll).toHaveBeenCalledOnce();
  });

  it('calls onCollapseAll when "Tout replier" is clicked', async () => {
    const onCollapseAll = vi.fn();
    render(<Toolbar {...baseProps} onCollapseAll={onCollapseAll} />);
    await userEvent.click(screen.getByText('Tout replier'));
    expect(onCollapseAll).toHaveBeenCalledOnce();
  });

  it('shows dark theme icon in dark theme', () => {
    render(<Toolbar {...baseProps} theme="dark" />);
    expect(screen.getByText('☾')).toBeInTheDocument();
  });

  it('shows light theme icon in light theme', () => {
    render(<Toolbar {...baseProps} theme="light" />);
    expect(screen.getByText('☀')).toBeInTheDocument();
  });

  it('calls onToggleTheme when the theme button is clicked', async () => {
    const onToggleTheme = vi.fn();
    render(<Toolbar {...baseProps} onToggleTheme={onToggleTheme} />);
    await userEvent.click(screen.getByRole('button', { name: 'Changer de thème' }));
    expect(onToggleTheme).toHaveBeenCalledOnce();
  });
});
