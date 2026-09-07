import { Router, Request, Response } from 'express';
import { contentFactoryEngine } from '../services/contentFactoryEngine';

export const contentRouter = Router();

contentRouter.get('/jobs', (_req: Request, res: Response) => {
  res.json({ jobs: contentFactoryEngine.getJobs() });
});

contentRouter.get('/jobs/:id', (req: Request, res: Response) => {
  const job = contentFactoryEngine.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({ job });
});

contentRouter.post('/trigger', async (req: Request, res: Response) => {
  const { topic, speaker } = req.body;
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required to trigger Content Factory' });
  }

  const job = await contentFactoryEngine.startJob(topic, speaker || 'creator');
  res.json({
    status: 'queued',
    message: `Hermes Content Factory queued for topic: "${topic}". Drafts will appear in Content Studio.`,
    jobId: job.id
  });
});

contentRouter.post('/audit', async (req: Request, res: Response) => {
  const { companyOrCreator, website, triggerEvent, socialLinks, socialBioText, speaker } = req.body;
  if (!companyOrCreator) {
    return res.status(400).json({ error: 'Company or Creator name is required to run conversion audit' });
  }

  const job = await contentFactoryEngine.startAuditJob({
    companyOrCreator,
    website,
    triggerEvent: triggerEvent || 'Scaling high-ticket inbound funnel',
    socialLinks,
    socialBioText,
    requestedBySpeaker: speaker || 'sdr_outbound'
  });

  res.json({
    status: 'queued',
    message: `SOP Outbound Lead Magnet & Conversion Audit queued for "${companyOrCreator}". Analysis will stream into Content Studio.`,
    jobId: job.id
  });
});

contentRouter.post('/jobs/:id/approve', (req: Request, res: Response) => {
  const job = contentFactoryEngine.approveJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({ status: 'approved', job });
});

contentRouter.post('/jobs/:id/reject', (req: Request, res: Response) => {
  const job = contentFactoryEngine.rejectJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({ status: 'rejected', job });
});
