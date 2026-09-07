import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { crmStore } from '../services/crmStore';
import { toolDispatcher } from '../tools/dispatcher';
import { websiteScraperService } from '../services/websiteScraperService';

export const crmRouter = Router();

crmRouter.get('/local-profile', (_req: Request, res: Response) => {
  const profilePath = path.resolve(process.cwd(), 'data', 'local_profile.json');
  if (fs.existsSync(profilePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
      return res.json({ exists: true, profile: data });
    } catch {
      return res.json({ exists: false });
    }
  }
  return res.json({ exists: false });
});

crmRouter.post('/local-profile', (req: Request, res: Response) => {
  const profilePath = path.resolve(process.cwd(), 'data', 'local_profile.json');
  try {
    fs.mkdirSync(path.dirname(profilePath), { recursive: true });
    fs.writeFileSync(profilePath, JSON.stringify(req.body, null, 2), 'utf-8');
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

crmRouter.get('/leads', (_req: Request, res: Response) => {
  res.json({ leads: crmStore.getLeads() });
});

crmRouter.get('/members', (_req: Request, res: Response) => {
  res.json({ members: crmStore.getMembers() });
});

crmRouter.get('/telemetry', (_req: Request, res: Response) => {
  res.json({ telemetry: crmStore.getTelemetry() });
});

crmRouter.post('/scrape', async (req: Request, res: Response) => {
  const { url, companyName } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const intel = await websiteScraperService.scrapeAndExtractIntel(url, companyName || 'Company');
    return res.json({ status: 'success', intel });
  } catch (err: any) {
    return res.status(500).json({ error: 'Scraping failed', message: err.message });
  }
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
