import { axe } from 'jest-axe';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import StarRating from './StarRating';

describe('StarRating', () => {
  it('usa rádios nativos e permite escolha pelo teclado', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<StarRating nota={null} onChange={onChange} nome="teste" obrigatorio />);
    await user.click(screen.getByRole('radio', { name: '4 estrelas' }));
    expect(onChange).toHaveBeenCalledWith(4);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('não inventa nota quando não há avaliações', () => {
    render(<StarRating nota={null} somenteLeitura />);
    expect(screen.getByText('Ainda não avaliado')).toBeInTheDocument();
  });
});
