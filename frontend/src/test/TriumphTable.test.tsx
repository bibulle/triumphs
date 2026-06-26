import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TriumphTable from '../components/TriumphTable';
import { GROUPS, DATA, DEFAULT_FILTER } from '../data';
import type { FilterState } from '../data';

const MOCK_PLAYERS = ['Bibullus', 'Vincent', 'Guiz']
const progress: Record<string, Set<string>> = {
  Bibullus: new Set([...DATA.filter(d => d.done).map(d => d.id), DATA[0].id]),
  Vincent: new Set([DATA[0].id]),
  Guiz: new Set([DATA[0].id]),
}
const progressFor = (p: string) => progress[p] ?? new Set<string>()

function renderTable(overrides: Partial<Parameters<typeof TriumphTable>[0]> = {}) {
  return render(
    <TriumphTable
      groups={GROUPS}
      triumphs={DATA}
      players={MOCK_PLAYERS}
      collapsed={new Set()}
      onToggleGroup={vi.fn()}
      search=""
      filter={DEFAULT_FILTER}
      sortState="default"
      annotations={{}}
      onAnnotation={vi.fn()}
      progressFor={progressFor}
      {...overrides}
    />
  );
}

describe('TriumphTable', () => {
  it('renders a column header for each player', () => {
    renderTable();
    MOCK_PLAYERS.forEach(p => expect(screen.getAllByText(p).length).toBeGreaterThan(0));
  });

  it('renders a group row for each group', () => {
    renderTable();
    const groupLabels = screen.getAllByText(/Panoramas/);
    expect(groupLabels.length).toBeGreaterThan(0);
  });

  it('renders the "Triomphe" column header', () => {
    renderTable();
    expect(screen.getByText('Triomphe')).toBeInTheDocument();
  });

  it('hides item rows when their group is collapsed', () => {
    const firstGroup = GROUPS[0];
    renderTable({ collapsed: new Set([firstGroup.groupKey]) });
    const firstItem = firstGroup.items[0];
    expect(screen.queryByText(firstItem.fr)).not.toBeInTheDocument();
  });

  it('shows item rows when their group is expanded', () => {
    renderTable({ collapsed: new Set() });
    const firstItem = GROUPS[0].items[0];
    expect(screen.getByText(firstItem.fr)).toBeInTheDocument();
  });

  it('calls onToggleGroup when a group row is clicked', async () => {
    const onToggleGroup = vi.fn();
    renderTable({ onToggleGroup });
    const chevrons = screen.getAllByText('▾');
    await userEvent.click(chevrons[0]);
    expect(onToggleGroup).toHaveBeenCalledWith(GROUPS[0].groupKey);
  });

  it('filters triumphs by search query (FR)', () => {
    const targetItem = GROUPS[0].items[2]; // "Le Monument"
    renderTable({ search: 'Monument' });
    expect(screen.getAllByText(targetItem.fr).length).toBeGreaterThan(0);
  });

  it('hides triumphs that do not match search query', () => {
    renderTable({ search: 'zzz_no_match_zzz' });
    DATA.forEach(d => {
      expect(screen.queryByText(d.fr)).not.toBeInTheDocument();
    });
  });

  it('hides non-allDone rows when filter.status is "done"', () => {
    const doneFilter: FilterState = { status: 'done', missing: new Set() };
    renderTable({ filter: doneFilter });
    // DATA[0] is allDone (all players have it), DATA[1] is not
    expect(screen.queryByText(DATA[1].fr)).not.toBeInTheDocument();
  });

  it('shows done/todo status badges for each player on each item', () => {
    renderTable();
    const badges = screen.getAllByRole('img');
    const visibleItems = GROUPS.flatMap(g => g.items).length;
    expect(badges.length).toBe(visibleItems * MOCK_PLAYERS.length);
  });

  it('shows a "COMPLET" badge on the first triumph (demo allDone)', () => {
    renderTable();
    expect(screen.getAllByText('COMPLET').length).toBeGreaterThan(0);
  });

  it('shows per-player done/total counts in the header', () => {
    renderTable();
    const bibDone = DATA.filter(d => progress.Bibullus.has(d.id)).length;
    expect(screen.getByText(`${bibDone}/${DATA.length}`)).toBeInTheDocument();
  });

  it('renders all group fraction counts for the Worlds|Vistas group', () => {
    renderTable();
    const worldsVistas = GROUPS[0];
    MOCK_PLAYERS.forEach(p => {
      const done = worldsVistas.items.filter(i => progress[p].has(i.id)).length;
      const total = worldsVistas.items.length;
      const fracs = screen.getAllByText(`${done}/${total}`);
      expect(fracs.length).toBeGreaterThan(0);
    });
  });
});

describe('TriumphTable — status badges', () => {
  it('labels done badges correctly', () => {
    renderTable();
    const doneBadges = screen
      .getAllByRole('img')
      .filter(el => el.getAttribute('aria-label')?.includes('fait'));
    expect(doneBadges.length).toBeGreaterThan(0);
  });

  it('labels todo badges correctly', () => {
    renderTable();
    const todoBadges = screen
      .getAllByRole('img')
      .filter(el => el.getAttribute('aria-label')?.includes('à faire'));
    expect(todoBadges.length).toBeGreaterThan(0);
  });
});

describe('TriumphTable — within group context', () => {
  it('shows the English sub-category name in group rows', () => {
    renderTable();
    const groupLabelContainers = screen.getAllByText(/Vistas/);
    expect(groupLabelContainers.length).toBeGreaterThan(0);
  });

  it('renders EN title for each visible triumph', () => {
    renderTable();
    const firstItem = GROUPS[0].items[0];
    expect(screen.getByText(firstItem.en)).toBeInTheDocument();
  });
});

describe('TriumphTable — group allDone and filter behavior', () => {
  it('hides the group row when all its items are done and filter is "done" (inverted: only done visible)', () => {
    const firstGroup = GROUPS[0];
    // With filter=done, only items where ALL players completed show. If we use a progress
    // where nobody completed anything, the group should disappear.
    const emptyProgress = { Bibullus: new Set<string>(), Vincent: new Set<string>(), Guiz: new Set<string>() };
    const doneFilter: FilterState = { status: 'done', missing: new Set() };
    const { container } = render(
      <TriumphTable
        groups={[firstGroup]}
        triumphs={firstGroup.items}
        players={MOCK_PLAYERS}
        collapsed={new Set()}
        onToggleGroup={vi.fn()}
        search=""
        filter={doneFilter}
        sortState="default"
        annotations={{}}
        onAnnotation={vi.fn()}
        progressFor={p => emptyProgress[p as keyof typeof emptyProgress] ?? new Set()}
      />
    );
    expect(container.querySelector('[class*="groupRow"]')).toBeNull();
  });

  it('shows the group row when some items pass the filter', () => {
    const firstGroup = GROUPS[0];
    // All players have item[0] done → with filter=done, that item is visible → group shows
    const allDoneFirstItem: Record<string, Set<string>> = {
      Bibullus: new Set([firstGroup.items[0].id]),
      Vincent: new Set([firstGroup.items[0].id]),
      Guiz: new Set([firstGroup.items[0].id]),
    };
    const doneFilter: FilterState = { status: 'done', missing: new Set() };
    const { container } = render(
      <TriumphTable
        groups={[firstGroup]}
        triumphs={firstGroup.items}
        players={MOCK_PLAYERS}
        collapsed={new Set()}
        onToggleGroup={vi.fn()}
        search=""
        filter={doneFilter}
        sortState="default"
        annotations={{}}
        onAnnotation={vi.fn()}
        progressFor={p => allDoneFirstItem[p] ?? new Set()}
      />
    );
    expect(container.querySelector('[class*="groupRow"]')).not.toBeNull();
  });

  it('adds allDone class to group row when all items are completed by all players', () => {
    const firstGroup = GROUPS[0];
    const allDoneProgress: Record<string, Set<string>> = {
      Bibullus: new Set(firstGroup.items.map(i => i.id)),
      Vincent: new Set(firstGroup.items.map(i => i.id)),
      Guiz: new Set(firstGroup.items.map(i => i.id)),
    };
    const { container } = render(
      <TriumphTable
        groups={[firstGroup]}
        triumphs={firstGroup.items}
        players={MOCK_PLAYERS}
        collapsed={new Set()}
        onToggleGroup={vi.fn()}
        search=""
        filter={DEFAULT_FILTER}
        sortState="default"
        annotations={{}}
        onAnnotation={vi.fn()}
        progressFor={p => allDoneProgress[p] ?? new Set()}
      />
    );
    const groupRow = container.querySelector('[class*="groupRow"]');
    expect(groupRow?.className).toMatch(/allDone/);
  });
});
