import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Welcome } from '../components/Welcome';
import React from 'react';

describe('Welcome Component', () => {
  it('deve renderizar a marca e o botão de login', () => {
    render(<Welcome onLogin={() => {}} isLoading={false} />);
    
    expect(screen.getByText('LetterBox')).toBeInTheDocument();
    expect(screen.getByText('Começar com Google')).toBeInTheDocument();
  });

  it('deve disparar onLogin ao clicar no botão', () => {
    const mockLogin = vi.fn();
    render(<Welcome onLogin={mockLogin} isLoading={false} />);
    
    fireEvent.click(screen.getByText('Começar com Google'));
    expect(mockLogin).toHaveBeenCalled();
  });

  it('deve exibir spinner quando estiver carregando', () => {
    render(<Welcome onLogin={() => {}} isLoading={true} />);
    
    // O botão fica desabilitado e mostra o Loader2 (que é um svg com classe animate-spin)
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button.querySelector('.animate-spin')).toBeInTheDocument();
  });
});