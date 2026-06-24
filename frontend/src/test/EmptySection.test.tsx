import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmptySection from '../components/EmptySection';

describe('EmptySection', () => {
  it('renders the section label', () => {
    render(<EmptySection label="Kepler" />);
    expect(screen.getByRole('heading')).toHaveTextContent('Kepler');
  });

  it('renders the "prochainement" message', () => {
    render(<EmptySection label="Kepler" />);
    expect(screen.getByText(/prochainement/)).toBeInTheDocument();
  });
});
