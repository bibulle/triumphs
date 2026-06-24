import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SectionTabs from '../components/SectionTabs';
import type { Section } from '../data';

const SECTIONS: Section[] = [
  { id: 'monument', label: 'Monument of Triumph', hasData: true },
  { id: 'lifetime', label: 'Lifetime', hasData: false },
];

describe('SectionTabs', () => {
  it('renders all section labels', () => {
    render(<SectionTabs sections={SECTIONS} activeId="monument" onSelect={() => {}} />);
    expect(screen.getByText('Monument of Triumph')).toBeInTheDocument();
    expect(screen.getByText('Lifetime')).toBeInTheDocument();
  });

  it('shows "à venir" badge only on sections without data', () => {
    render(<SectionTabs sections={SECTIONS} activeId="monument" onSelect={() => {}} />);
    const badges = screen.getAllByText('à venir');
    expect(badges).toHaveLength(1);
  });

  it('calls onSelect with the correct id when a tab is clicked', async () => {
    const onSelect = vi.fn();
    render(<SectionTabs sections={SECTIONS} activeId="monument" onSelect={onSelect} />);
    await userEvent.click(screen.getByText('Lifetime'));
    expect(onSelect).toHaveBeenCalledWith('lifetime');
  });

  it('marks the active tab with the active class', () => {
    render(<SectionTabs sections={SECTIONS} activeId="monument" onSelect={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0].className).toMatch(/active/);
    expect(buttons[1].className).not.toMatch(/active/);
  });
});
