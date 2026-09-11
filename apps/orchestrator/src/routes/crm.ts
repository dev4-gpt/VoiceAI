import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { crmStore } from '../services/crmStore';
import { toolDispatcher } from '../tools/dispatcher';
import { websiteScraperService } from '../services/websiteScraperService';
import { requireApiKey } from '../middleware/auth';

export const crmRouter = Router();

// Every CRM route reads or writes tenant business data — leads, telemetry, vault
// files — or dispatches arbitrary tools. All of it is gated. No-ops in local demo
// mode (ORCHESTRATOR_API_KEY unset), same as the credentials router.
crmRouter.use(requireApiKey);

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

const VALID_LEAD_STATUSES = ['new', 'inbound_qualified', 'call_scheduled', 'negotiating', 'enrolled', 'disqualified'];

crmRouter.patch('/leads/:id/status', (req: Request, res: Response) => {
  const { status } = req.body;
  if (!status || !VALID_LEAD_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_LEAD_STATUSES.join(', ')}` });
  }

  const updated = crmStore.updateLeadStatus(req.params.id, status);
  if (!updated) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  return res.json({ status: 'success', lead: updated });
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

crmRouter.post('/export-dossier', async (req: Request, res: Response) => {
  const { markdown, companyName, fileName } = req.body;
  if (!markdown) {
    return res.status(400).json({ error: 'Markdown content is required' });
  }

  try {
    const safeCompany = (companyName || 'General').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeFileName = (fileName || 'Strategy_Briefing.md').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const targetDir = path.resolve(process.cwd(), 'vault', 'Clients', safeCompany);
    fs.mkdirSync(targetDir, { recursive: true });
    const targetPath = path.join(targetDir, safeFileName);
    fs.writeFileSync(targetPath, markdown, 'utf-8');

    // Also mirror to global vault/Dossiers
    const globalDir = path.resolve(process.cwd(), 'vault', 'Dossiers');
    fs.mkdirSync(globalDir, { recursive: true });
    fs.writeFileSync(path.join(globalDir, `${safeCompany}_${safeFileName}`), markdown, 'utf-8');

    return res.json({
      success: true,
      vaultPath: `vault/Clients/${safeCompany}/${safeFileName}`,
      message: 'Dossier successfully saved to Obsidian vault'
    });
  } catch (err: any) {
    console.error('[Export Dossier Error]', err);
    return res.status(500).json({ error: 'Failed to write dossier to vault', message: err.message });
  }
});

