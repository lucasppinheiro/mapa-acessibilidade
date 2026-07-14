import { axe } from 'jest-axe';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import Privacidade from './Privacidade';

it('explica minimização, geolocalização e busca externa sem alegar conformidade', async () => {
  const { container } = render(<Privacidade />);
  expect(screen.getByText(/não solicita tipo de deficiência/i)).toBeInTheDocument();
  expect(screen.getByText(/só pede sua localização após/i)).toBeInTheDocument();
  expect(screen.getByText(/não é uma declaração de conformidade/i)).toBeInTheDocument();
  expect(await axe(container)).toHaveNoViolations();
});
