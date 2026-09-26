import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CheckoutBanner, readCheckoutParams } from './CheckoutBanner';

const authorizedFetch = vi.fn();
vi.mock('../auth/authorizedFetch', () => ({
  authorizedFetch: (...a: unknown[]) => authorizedFetch(...a)
}));

const usage = (u: Record<string, unknown>) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ usage: u }) });

beforeEach(() => {
  authorizedFetch.mockReset();
});

describe('readCheckoutParams', () => {
  it('reads success and cancelled, ignores anything else', () => {
    expect(readCheckoutParams('?checkout=success&plan=Starter')).toEqual({ outcome: 'success', plan: 'starter' });
    expect(readCheckoutParams('?checkout=cancelled')).toEqual({ outcome: 'cancelled', plan: '' });
    expect(readCheckoutParams('?checkout=weird')).toBeNull();
    expect(readCheckoutParams('')).toBeNull();
  });
});

describe('CheckoutBanner', () => {
  it('renders nothing when the URL carries no checkout result', () => {
    const { container } = render(<CheckoutBanner search="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('says nothing was charged after a cancelled checkout', () => {
    render(<CheckoutBanner search="?checkout=cancelled" />);
    expect(screen.getByRole('status')).toHaveTextContent('You have not been charged');
    expect(authorizedFetch).not.toHaveBeenCalled();
  });

  it('shows "active" only once the server reports the plan active', async () => {
    authorizedFetch.mockImplementation(() => usage({ planId: 'starter', subscriptionStatus: 'active', minutesLimit: 500 }));
    render(<CheckoutBanner search="?checkout=success&plan=starter" />);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Your Starter plan is active: 500 voice minutes a month'));
  });

  it('does not claim activation while the server still shows no active plan', async () => {
    authorizedFetch.mockImplementation(() => usage({ planId: 'starter', subscriptionStatus: 'canceled', minutesLimit: 0 }));
    render(<CheckoutBanner search="?checkout=success&plan=starter" />);
    expect(screen.getByRole('status')).toHaveTextContent('Confirming your plan');
    expect(screen.getByRole('status')).not.toHaveTextContent('is active');
  });

  it('tells a signed-out buyer to sign in rather than guessing', async () => {
    const err = Object.assign(new Error('Sign in required.'), { name: 'SignedOutError' });
    authorizedFetch.mockRejectedValue(err);
    render(<CheckoutBanner search="?checkout=success&plan=pro" />);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Sign in with the account'));
  });
});
