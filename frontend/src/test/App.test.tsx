import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import * as api from '../api';
import type { Triumph } from '../data';

vi.stubGlobal('__APP_VERSION__', '0.0.5')

const mockTriumphs: Triumph[] = [
  { id: 't0', section: 'triumphs', cat: 'Worlds', catFr: 'Mondes', sub: 'Vistas', subFr: 'Panoramas', groupKey: 'triumphs|Worlds|Vistas', en: 'The Monument', fr: 'Le Monument', descEn: '', descFr: '' },
  { id: 't1', section: 'triumphs', cat: 'Worlds', catFr: 'Mondes', sub: 'Vistas', subFr: 'Panoramas', groupKey: 'triumphs|Worlds|Vistas', en: 'Conqueror', fr: 'Conquérant', descEn: '', descFr: '' },
  { id: 't2', section: 'titles', cat: 'Combat', catFr: 'Combat', sub: 'PvP', subFr: 'JcJ', groupKey: 'titles|Combat|PvP', en: 'Flawless', fr: 'Impeccable', descEn: '', descFr: '' },
]
const mockPlayers = [
  { name: 'Bibullus', tag: 'Bibullus#2986' },
  { name: 'Vincent', tag: 'tarrade#1427' },
]
// t0 done for all (allDone demo), t1 done only for Bibullus
const mockProgress = { Bibullus: ['t0', 't1'], Vincent: ['t0'] }

beforeEach(() => {
  vi.spyOn(api, 'fetchTriumphs').mockResolvedValue(mockTriumphs)
  vi.spyOn(api, 'fetchPlayers').mockResolvedValue(mockPlayers)
  vi.spyOn(api, 'fetchProgress').mockResolvedValue(mockProgress)
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('App', () => {
  it('renders the loading state then the page', async () => {
    render(<App />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Triomphes'))
  })

  it('shows triumph count for the active section only', async () => {
    render(<App />)
    await waitFor(() => expect(screen.getByText('2 triomphes')).toBeInTheDocument())
  })

  it('switching section updates the h1 and triumph count', async () => {
    render(<App />)
    await waitFor(() => screen.getByText('Titres'))
    await userEvent.click(screen.getByRole('button', { name: /Titres/i }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Titres')
    expect(screen.getByText('1 triomphes')).toBeInTheDocument()
  })

  it('"Tout replier" collapses all groups', async () => {
    render(<App />)
    // Groups are collapsed by default — expand first, then collapse
    await waitFor(() => screen.getByRole('button', { name: 'Tout déplier' }))
    await userEvent.click(screen.getByRole('button', { name: 'Tout déplier' }))
    await waitFor(() => screen.getByText('Le Monument'))
    await userEvent.click(screen.getByRole('button', { name: 'Tout replier' }))
    expect(screen.queryByText('Le Monument')).not.toBeInTheDocument()
  })

  it('"Tout déplier" opens the first group', async () => {
    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: 'Tout déplier' }))
    await userEvent.click(screen.getByRole('button', { name: 'Tout déplier' }))
    await waitFor(() => expect(screen.getByText('Le Monument')).toBeInTheDocument())
  })

  it('"Masquer terminés" hides allDone triumph rows', async () => {
    render(<App />)
    // Expand first group to make triumphs visible
    await waitFor(() => screen.getByRole('button', { name: 'Tout déplier' }))
    await userEvent.click(screen.getByRole('button', { name: 'Tout déplier' }))
    await waitFor(() => screen.getByText('Le Monument'))
    await userEvent.click(screen.getByRole('button', { name: 'Masquer terminés' }))
    expect(screen.queryByText('Le Monument')).not.toBeInTheDocument()
  })

  it('shows error message when API fails', async () => {
    vi.spyOn(api, 'fetchTriumphs').mockRejectedValue(new Error('network error'))
    render(<App />)
    await waitFor(() => expect(screen.getByText(/Erreur/)).toBeInTheDocument())
  })
})
