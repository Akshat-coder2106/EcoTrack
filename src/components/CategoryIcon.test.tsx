import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CategoryIcon } from './CategoryIcon';

describe('CategoryIcon', () => {
  it('renders transport icon', () => {
    render(<CategoryIcon category="transport" />);
    expect(screen.getByLabelText('Transport')).toBeDefined();
  });

  it('renders food icon', () => {
    render(<CategoryIcon category="food" />);
    expect(screen.getByLabelText('Food')).toBeDefined();
  });

  it('renders energy icon', () => {
    render(<CategoryIcon category="energy" />);
    expect(screen.getByLabelText('Energy')).toBeDefined();
  });

  it('renders goods icon', () => {
    render(<CategoryIcon category="goods" />);
    expect(screen.getByLabelText('Goods')).toBeDefined();
  });

  it('renders default icon for unknown categories', () => {
    render(<CategoryIcon category="unknown" />);
    expect(screen.getByLabelText('Other')).toBeDefined();
  });
});
