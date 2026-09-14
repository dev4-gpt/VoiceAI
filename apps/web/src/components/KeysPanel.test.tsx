import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KeysPanel } from './KeysPanel';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('KeysPanel', () => {
  it('prompts to sign in when signed out', () => {
    render(<KeysPanel isOpen onClose={vi.fn()} signedIn={false} isGlass={false} fetcher={vi.fn()} />);
    expect(screen.getByText('Sign in to add your own keys.')).toBeInTheDocument();
  });

  it('lists masked keys from the API', async () => {
    const fetcher = vi.fn(async (_path: string, _init?: RequestInit) =>
      json({ credentials: [{ platform: 'deepseek', accountHandle: null, last4: '••••9876', updatedAt: '2026-09-13T12:00:00.000Z', lastTest: null }] })
    );
    render(<KeysPanel isOpen onClose={vi.fn()} signedIn isGlass={false} fetcher={fetcher} />);
    await waitFor(() => expect(screen.getByText('••••9876')).toBeInTheDocument());
    expect(fetcher).toHaveBeenCalledWith('/api/me/credentials', undefined);
  });

  it('saves the platform-specific field shape', async () => {
    const fetcher = vi.fn(async (_path: string, init?: RequestInit) =>
      init?.method === 'PUT'
        ? json({ platform: 'linkedin', accountHandle: null, last4: '••••abcd', updatedAt: '2026-09-13T12:00:00.000Z', lastTest: null })
        : json({ credentials: [] })
    );
    render(<KeysPanel isOpen onClose={vi.fn()} signedIn isGlass={false} fetcher={fetcher} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'LinkedIn' }));
    fireEvent.change(screen.getByLabelText('Access token'), { target: { value: 'li-token-abcd' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save key' }));
    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(
        '/api/me/credentials/linkedin',
        expect.objectContaining({ method: 'PUT', body: JSON.stringify({ accessToken: 'li-token-abcd' }) })
      )
    );
  });
});
