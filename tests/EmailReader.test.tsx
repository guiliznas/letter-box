import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EmailReader } from '../components/EmailReader';
import { INITIAL_EMAILS } from '../constants';
import { AiConfig } from '../types';
import React from 'react';

// Mock do serviço de IA para não fazer chamadas reais de API durante os testes
vi.mock('../services/aiService', () => ({
  summarizeNewsletter: vi.fn().mockResolvedValue('Resumo mockado com sucesso.'),
  MissingAiConfigError: class MissingAiConfigError extends Error {},
}));

describe('EmailReader Component', () => {
  const mockBack = vi.fn();
  const mockToggleRead = vi.fn();
  const mockOpenAiSettings = vi.fn();
  const email = INITIAL_EMAILS[0];
  const aiConfig: AiConfig = { provider: 'anthropic', apiKey: 'test-key', model: 'claude-sonnet-5' };

  const renderReader = (config: AiConfig | null = aiConfig) =>
    render(
      <EmailReader
        email={email}
        onBack={mockBack}
        onToggleRead={mockToggleRead}
        aiConfig={config}
        onOpenAiSettings={mockOpenAiSettings}
      />
    );

  it('deve renderizar o conteúdo do e-mail corretamente', () => {
    renderReader();

    expect(screen.getByRole('heading', { level: 1, name: email.subject })).toBeInTheDocument();
    expect(screen.getByText(email.senderName)).toBeInTheDocument();
  });

  it('deve abrir o modal de resumo ao clicar no botão "Resumir"', async () => {
    renderReader();

    fireEvent.click(screen.getByText('Resumir'));

    expect(screen.getByText('Resumo Inteligente')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Resumo mockado com sucesso.')).toBeInTheDocument();
    });
  });

  it('deve levar para as configurações quando não há chave de IA', () => {
    renderReader(null);

    fireEvent.click(screen.getByText('Resumir'));

    expect(mockOpenAiSettings).toHaveBeenCalled();
    expect(screen.queryByText('Resumo Inteligente')).not.toBeInTheDocument();
  });

  it('deve chamar onBack ao clicar no botão de voltar', () => {
    renderReader();

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(mockBack).toHaveBeenCalled();
  });
});
