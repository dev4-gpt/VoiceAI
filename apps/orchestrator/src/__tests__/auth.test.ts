import { Request, Response } from 'express';
import { requireApiKey } from '../middleware/auth';

function mockReqRes(authHeader?: string) {
  const req = { header: (name: string) => (name.toLowerCase() === 'authorization' ? authHeader : undefined) } as unknown as Request;
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status } as unknown as Response;
  const next = jest.fn();
  return { req, res, next, status, json };
}

describe('requireApiKey', () => {
  const original = process.env.ORCHESTRATOR_API_KEY;
  afterEach(() => {
    process.env.ORCHESTRATOR_API_KEY = original;
  });

  it('passes through when no key is configured (local demo mode)', () => {
    delete process.env.ORCHESTRATOR_API_KEY;
    const { req, res, next, status } = mockReqRes();
    requireApiKey(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(status).not.toHaveBeenCalled();
  });

  it('rejects with 401 when a key is configured and missing/wrong', () => {
    process.env.ORCHESTRATOR_API_KEY = 'secret123';
    const { req, res, next, status, json } = mockReqRes('Bearer wrong');
    requireApiKey(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('passes through when the correct bearer key is provided', () => {
    process.env.ORCHESTRATOR_API_KEY = 'secret123';
    const { req, res, next, status } = mockReqRes('Bearer secret123');
    requireApiKey(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(status).not.toHaveBeenCalled();
  });
});
