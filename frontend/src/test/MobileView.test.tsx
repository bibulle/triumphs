import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MobileView from '../components/MobileView';
import { DEFAULT_FILTER } from '../data';
import type { Group, Triumph } from '../data';

const items: Triumph[] = [
  { id: 't0', section: 'triumphs', cat: 'Worlds', sub: 'Vistas', groupKey: 'triumphs|Worlds|Vistas', en: 'The Monument', fr: 'Le Monument', descEn: 'Desc EN', descFr: 'Desc FR' },
  { id: 't1', section: 'triumphs', cat: 'Worlds', sub: 'Vistas', groupKey: 'triumphs|Worlds|Vistas', en: 'Conqueror', fr: 'Conquérant', descEn: '', descFr: '' },
];
const groups: Group[] = [
  { section: 'triumphs', cat: 'Worlds', catFr: 'Mondes', sub: 'Vistas', subFr: 'Panoramas', groupKey: 'triumphs|Worlds|Vistas', items },
];
const players = ['Bibulle', 'Vincent'];
const progress: Record<string, Set<string>> = {
  Bibulle: new Set(['t0', 't1']),
  Vincent: new Set(['t0']),
};
const progressFor = (p: string) => progress[p] ?? new Set<string>();

function renderMobile(overrides: Partial<Parameters<typeof MobileView>[0]> = {}) {
  return render(
    <MobileView
      groups={groups}
      triumphs={items}
      players={players}
      search=""
      filter={DEFAULT_FILTER}
      sortState="default"
      annotations={{}}
      progressFor={progressFor}
      {...overrides}
    />
  );
}

describe('MobileView', () => {
  it('renders player selector buttons', () => {
    renderMobile();
    expect(screen.getByRole('button', { name: /Bibulle/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Vincent/i })).toBeInTheDocument();
  });

  it('renders triumph cards', () => {
    renderMobile();
    expect(screen.getByText('Le Monument')).toBeInTheDocument();
    expect(screen.getByText('Conquérant')).toBeInTheDocument();
  });

  it('renders group header', () => {
    renderMobile();
    expect(screen.getByText('Mondes')).toBeInTheDocument();
  });

  it('renders compare button', () => {
    renderMobile();
    expect(screen.getByRole('button', { name: /Comparer/i })).toBeInTheDocument();
  });

  it('opens detail sheet on card tap', async () => {
    renderMobile();
    await userEvent.click(screen.getByText('Le Monument'));
    expect(screen.getByText('Desc FR')).toBeInTheDocument();
    expect(screen.getByText('The Monument')).toBeInTheDocument();
  });

  it('closes detail sheet on Escape key', async () => {
    renderMobile();
    await userEvent.click(screen.getByText('Le Monument'));
    expect(screen.getByText('Desc FR')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('Desc FR')).not.toBeInTheDocument();
  });

  it('switches active player', async () => {
    renderMobile();
    const vincentBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('Vincent'));
    expect(vincentBtn).toBeTruthy();
    await userEvent.click(vincentBtn!);
    // After clicking, Vincent should be active (visual change via CSS class)
    expect(vincentBtn!.className).toContain('Active');
  });

  it('toggles compare mode', async () => {
    renderMobile();
    const compareBtn = screen.getByRole('button', { name: /Comparer/i });
    await userEvent.click(compareBtn);
    expect(compareBtn).toHaveAttribute('aria-pressed', 'true');
    // In compare mode, should show player initials as chips
    expect(screen.getAllByText('B').length).toBeGreaterThan(0);
    expect(screen.getAllByText('V').length).toBeGreaterThan(0);
  });

  it('filters triumphs by search', () => {
    renderMobile({ search: 'Monument' });
    expect(screen.getByText('Le Monument')).toBeInTheDocument();
    expect(screen.queryByText('Conquérant')).not.toBeInTheDocument();
  });

  it('filters triumphs by done status', () => {
    renderMobile({ filter: { status: 'done', missing: new Set() } });
    expect(screen.getByText('Le Monument')).toBeInTheDocument();
    expect(screen.queryByText('Conquérant')).not.toBeInTheDocument();
  });

  it('returns null when no players', () => {
    const { container } = renderMobile({ players: [] });
    expect(container.innerHTML).toBe('');
  });
});
