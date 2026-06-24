import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Hero from '../components/Hero';
import { DATA, PLAYERS, buildInitialProgress } from '../data';

describe('Hero', () => {
  const progress = buildInitialProgress();
  const progressFor = (p: typeof PLAYERS[number]) => progress[p];

  it('renders the section label in the h1', () => {
    render(<Hero sectionLabel="Monument of Triumph" hasData={true} triumphs={DATA} players={PLAYERS} progressFor={progressFor} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Monument of Triumph');
  });

  it('shows the total triumph count when hasData is true', () => {
    render(<Hero sectionLabel="Monument of Triumph" hasData={true} triumphs={DATA} players={PLAYERS} progressFor={progressFor} />);
    expect(screen.getByText(`${DATA.length} triomphes`)).toBeInTheDocument();
  });

  it('shows "— triomphes" when hasData is false', () => {
    render(<Hero sectionLabel="Lifetime" hasData={false} triumphs={DATA} players={PLAYERS} progressFor={progressFor} />);
    expect(screen.getByText('— triomphes')).toBeInTheDocument();
  });

  it('renders a leaderboard row for each player when hasData is true', () => {
    render(<Hero sectionLabel="Monument of Triumph" hasData={true} triumphs={DATA} players={PLAYERS} progressFor={progressFor} />);
    PLAYERS.forEach(p => {
      expect(screen.getByText(p)).toBeInTheDocument();
    });
  });

  it('does not render leaderboard rows when hasData is false', () => {
    render(<Hero sectionLabel="Lifetime" hasData={false} triumphs={DATA} players={PLAYERS} progressFor={progressFor} />);
    PLAYERS.forEach(p => {
      expect(screen.queryByText(p)).not.toBeInTheDocument();
    });
  });

  it('sorts leaderboard by done count descending', () => {
    render(<Hero sectionLabel="Monument of Triumph" hasData={true} triumphs={DATA} players={PLAYERS} progressFor={progressFor} />);
    const names = screen.getAllByText(/Bibullus|Vincent|Guiz/).map(el => el.textContent);
    // Bibullus has the most done triumphs, must appear first
    expect(names[0]).toBe('Bibullus');
  });
});
