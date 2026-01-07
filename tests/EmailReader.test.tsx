import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EmailReader } from '../components/EmailReader';
import { INITIAL_EMAILS } from '../constants';
import React from 'react';

// Mock do serviço Gemini para não fazer chamadas reais de API durante os testes
vi.mock('../services/geminiService', () => ({
  summarizeNewsletter: vi.fn().mockResolvedValue('Resumo mockado com sucesso.')
}));

describe('EmailReader Component', () => {
  const mockBack = vi.fn();
  const mockToggleRead = vi.fn();
  const email = INITIAL_EMAILS[0];

  it('deve renderizar o conteúdo do e-mail corretamente', () => {
    render(<EmailReader email={email} onBack={mockBack} onToggleRead={mockToggleRead} />);
    
    expect(screen.getByText(email.subject)).toBeInTheDocument();
    expect(screen.getByText(email.senderName)).toBeInTheDocument();
  });

  it('deve abrir o modal de resumo ao clicar no botão "Resumir"', async () => {
    render(<EmailReader email={email} onBack={mockBack} onToggleRead={mockToggleRead} />);
    
    const summarizeBtn = screen.getByText('Resumir');
    fireEvent.click(summarizeBtn);

    expect(screen.getByText('Resumo Inteligente')).toBeInTheDocument();
    expect(screen.getByText('Lendo entrelinhas...')).toBeInTheDocument();

    // Espera o resumo mockado aparecer
    await waitFor(() => {
      expect(screen.getByText('Resumo mockado com sucesso.')).toBeInTheDocument();
    });
  });

  it('deve chamar onBack ao clicar no botão de voltar', () => {
    render(<EmailReader email={email} onBack={mockBack} onToggleRead={mockToggleRead} />);
    
    const backBtn = screen.getByRole('button', { name: '' }); // O primeiro botão é o ArrowLeft
    fireEvent.click(backBtn);
    
    expect(mockBack).toHaveBeenCalled();
  });
});