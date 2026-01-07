
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EmailList } from '../components/EmailList';
import { INITIAL_EMAILS } from '../constants';
import React from 'react';

describe('EmailList Component', () => {
  const mockOnSelect = vi.fn();
  const mockOnToggleFilter = vi.fn();
  // Added mock function for the onSummarizeDay prop
  const mockOnSummarizeDay = vi.fn();

  it('deve renderizar a lista de e-mails corretamente', () => {
    render(
      <EmailList 
        emails={INITIAL_EMAILS} 
        onSelectEmail={mockOnSelect} 
        filterUnread={false} 
        onToggleFilter={mockOnToggleFilter} 
        // Pass mock function to satisfy required prop
        onSummarizeDay={mockOnSummarizeDay}
      />
    );

    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText(INITIAL_EMAILS[0].subject)).toBeInTheDocument();
    expect(screen.getByText(INITIAL_EMAILS[1].senderName)).toBeInTheDocument();
  });

  it('deve chamar onSelectEmail ao clicar em um item', () => {
    render(
      <EmailList 
        emails={INITIAL_EMAILS} 
        onSelectEmail={mockOnSelect} 
        filterUnread={false} 
        onToggleFilter={mockOnToggleFilter} 
        // Pass mock function to satisfy required prop
        onSummarizeDay={mockOnSummarizeDay}
      />
    );

    fireEvent.click(screen.getByText(INITIAL_EMAILS[0].subject));
    expect(mockOnSelect).toHaveBeenCalledWith(INITIAL_EMAILS[0].id);
  });

  it('deve exibir mensagem de lista vazia quando não houver e-mails', () => {
    render(
      <EmailList 
        emails={[]} 
        onSelectEmail={mockOnSelect} 
        filterUnread={false} 
        onToggleFilter={mockOnToggleFilter} 
        // Pass mock function to satisfy required prop
        onSummarizeDay={mockOnSummarizeDay}
      />
    );

    expect(screen.getByText('No emails found')).toBeInTheDocument();
  });
});