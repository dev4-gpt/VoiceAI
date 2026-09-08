import { Router, Request, Response } from 'express';
import { instaticService } from '../services/instaticService';

export const instaticRouter = Router();

// GET /api/instatic/pages
instaticRouter.get('/pages', (req: Request, res: Response) => {
  try {
    const company = (req.query.company as string) || undefined;
    const pages = instaticService.getPages(company);
    res.json({
      status: 'success',
      count: pages.length,
      pages
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/instatic/pages/:pageId
instaticRouter.get('/pages/:pageId', (req: Request, res: Response) => {
  try {
    const page = instaticService.getPage(req.params.pageId);
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }
    res.json({ status: 'success', page });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/instatic/generate
instaticRouter.post('/generate', (req: Request, res: Response) => {
  try {
    const { companyName, title, topic, thesis, hook, coreProblem, tacticalFramework } = req.body;
    const pageTitle = title || topic;
    if (!companyName || !pageTitle) {
      return res.status(400).json({ error: 'Missing companyName or title/topic' });
    }

    const newPage = instaticService.generatePageFromContentPack(companyName, pageTitle, {
      thesis: thesis || 'Autonomous Growth & Voice Inbound Engine',
      hook,
      coreProblem,
      tacticalFramework
    });

    res.json({
      status: 'success',
      page: newPage
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/instatic/patch-node
instaticRouter.post('/patch-node', (req: Request, res: Response) => {
  try {
    const { pageId, nodeId, newProps } = req.body;
    if (!pageId || !nodeId || !newProps) {
      return res.status(400).json({ error: 'Missing pageId, nodeId, or newProps' });
    }

    const updated = instaticService.patchNode(pageId, nodeId, newProps);
    if (!updated) {
      return res.status(404).json({ error: 'Page or node not found' });
    }

    res.json({ status: 'success', page: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/instatic/ai-assist
instaticRouter.post('/ai-assist', async (req: Request, res: Response) => {
  try {
    const { pageId, nodeId, prompt } = req.body;
    if (!pageId || !nodeId || !prompt) {
      return res.status(400).json({ error: 'Missing pageId, nodeId, or prompt' });
    }

    const result = await instaticService.aiAssistNode(pageId, nodeId, prompt);
    res.json({
      status: 'success',
      explanation: result.explanation,
      page: result.updatedPage
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/instatic/preview/:pageId
instaticRouter.get('/preview/:pageId', (req: Request, res: Response) => {
  try {
    const page = instaticService.getPage(req.params.pageId);
    if (!page) {
      return res.status(404).send('Page not found');
    }

    const html = instaticService.compileToStaticHtml(page);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err: any) {
    res.status(500).send('Error compiling static preview: ' + err.message);
  }
});

// GET /api/instatic/status
instaticRouter.get('/status', (_req: Request, res: Response) => {
  res.json({
    status: 'operational',
    service: 'GrowthVoice OS — Instatic Visual CMS Bridge',
    editorPort: 3001,
    standaloneServer: 'http://localhost:3001',
    features: [
      'AST JSON Document Representation',
      'RFC-6902-style Surgical Node Patching',
      'Anna AI Co-Pilot Node Rewrites',
      'Zero-Runtime Semantic Static HTML Compiler',
      'Auto-Injected GrowthVoice OS Spoken Widget'
    ]
  });
});
