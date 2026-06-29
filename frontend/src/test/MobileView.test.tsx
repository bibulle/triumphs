import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MobileView from '../components/MobileView';
import { GROUPS, DATA, DEFAULT_FILTER } from '../data';

const MOCK_PLAYERS = ['Bibullus', 'Vincent', 'Guiz'];
const progress: Record<string, Set<string>> = {
  Bibullus: new Set([...DATA.filter(d => d.done).map(d => d.id), DATA[0].id]),
  Vincent: new Set([DATA[0].id]),
  Guiz: new Set([DATA[0].id]),
};
const progressFor = (p: string) => progress[p] ?? new Set<string>();

function renderMobile(overrides: Partial<Parameters<typeof MobileView>[0]> = {}) {
  return render(
    <MobileView
      groups={GROUPS}
      triumphs={DATA}
      players={MOCK_PLAYERS}
      collapsed={new Set()}
      onToggleGroup={vi.fn()}
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
  it('renders the mobile view container', () => {
    renderMobile();
    expect(screen.getByTestId('mobile-view')).toBeInTheDocument();
  });

  it('renders player selector with all players', () => {
    renderMobile();
    const playerBar = screen.getByTestId('mobile-players');
    MOCK_PLAYERS.forEach(p => {
      expect(within(playerBar).getByText(p)).toBeInTheDocument();
    });
  });

  it('renders Compare button when multiple players exist', () => {
    renderMobile();
    expect(screen.getByText('Comparer')).toBeInTheDocument();
  });

  it('does not render Compare button for a single player', () => {
    renderMobile({ players: ['Solo'] });
    expect(screen.queryByText('Comparer')).not.toBeInTheDocument();
  });

  it('renders summary with active player name and count', () => {
    renderMobile();
    const summary = screen.getByTestId('mobile-summary');
    const bibDone = DATA.filter(d => progress.Bibullus.has(d.id)).length;
    expect(summary).toHaveTextContent(`Bibullus · ${bibDone}/${DATA.length}`);
  });

  it('renders group headers', () => {
    renderMobile();
    expect(screen.getAllByText(/Panoramas/).length).toBeGreaterThan(0);
  });

  it('renders triumph cards when group is expanded', () => {
    renderMobile({ collapsed: new Set() });
    const firstItem = GROUPS[0].items[0];
    expect(screen.getByText(firstItem.fr)).toBeInTheDocument();
  });

  it('hides triumph cards when group is collapsed', () => {
    renderMobile({ collapsed: new Set([GROUPS[0].groupKey]) });
    const firstItem = GROUPS[0].items[0];
    expect(screen.queryByText(firstItem.fr)).not.toBeInTheDocument();
  });

  it('calls onToggleGroup when group header is clicked', async () => {
    const onToggleGroup = vi.fn();
    renderMobile({ onToggleGroup });
    const chevrons = screen.getAllByText('▾');
    await userEvent.click(chevrons[0]);
    expect(onToggleGroup).toHaveBeenCalledWith(GROUPS[0].groupKey);
  });

  it('filters cards by search query', () => {
    renderMobile({ search: 'Monument', collapsed: new Set() });
    expect(screen.getByText('Le Monument')).toBeInTheDocument();
  });

  it('hides non-matching cards', () => {
    renderMobile({ search: 'zzz_no_match_zzz' });
    DATA.forEach(d => {
      expect(screen.queryByText(d.fr)).not.toBeInTheDocument();
    });
  });

  it('switching player updates the summary', async () => {
    renderMobile();
    const playerBar = screen.getByTestId('mobile-players');
    await userEvent.click(within(playerBar).getByText('Vincent'));
    const summary = screen.getByTestId('mobile-summary');
    const vincentDone = DATA.filter(d => progress.Vincent.has(d.id)).length;
    expect(summary).toHaveTextContent(`Vincent · ${vincentDone}/${DATA.length}`);
  });

  it('activating compare mode shows all-player chips on cards', async () => {
    renderMobile({ collapsed: new Set() });
    await userEvent.click(screen.getByText('Comparer'));
    const summary = screen.getByTestId('mobile-summary');
    expect(summary).toHaveTextContent(`${DATA.length} triomphes`);
  });

  it('tapping a card opens the detail sheet', async () => {
    renderMobile({ collapsed: new Set() });
    const firstItem = GROUPS[0].items[0];
    await userEvent.click(screen.getByText(firstItem.fr));
    expect(screen.getByTestId('detail-sheet')).toBeInTheDocument();
  });

  it('detail sheet shows all players', async () => {
    renderMobile({ collapsed: new Set() });
    const firstItem = GROUPS[0].items[0];
    await userEvent.click(screen.getByText(firstItem.fr));
    const sheet = screen.getByTestId('detail-sheet');
    MOCK_PLAYERS.forEach(p => {
      expect(within(sheet).getByText(p)).toBeInTheDocument();
    });
  });

  it('detail sheet closes on close button click', async () => {
    renderMobile({ collapsed: new Set() });
    const firstItem = GROUPS[0].items[0];
    await userEvent.click(screen.getByText(firstItem.fr));
    expect(screen.getByTestId('detail-sheet')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByTestId('detail-sheet')).not.toBeInTheDocument();
  });
});
