import { Router, Request, Response } from 'express';
import { crmStore } from '../services/crmStore';
import { toolDispatcher } from '../tools/dispatcher';

export const crmRouter = Router();

crmRouter.get('/leads', (_req: Request, res: Response) => {
  res.json({ leads: crmStore.getLeads() });
});

crmRouter.get('/members', (_req: Request, res: Response) => {
  res.json({ members: crmStore.getMembers() });
});

crmRouter.get('/telemetry', (_req: Request, res: Response) => {
  res.json({ telemetry: crmStore.getTelemetry() });
});

crmRouter.post('/tools/execute', async (req: Request, res: Response) => {
  const { name, arguments: args } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Tool name is required' });
  }

  try {
    const result = await toolDispatcher.dispatch(name, args || {});
    return res.json({ name, result });
  } catch (err: any) {
    return res.status(500).json({ error: 'Tool execution failed', message: err.message });
  }
});
