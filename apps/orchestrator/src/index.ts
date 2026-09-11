import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
dotenv.config();

import { tokenRouter } from './routes/token';
import { crmRouter } from './routes/crm';
import { contentRouter } from './routes/content';
import { graphRouter } from './routes/graph';
import { credentialsRouter } from './routes/credentials';
import { billingRouter } from './routes/billing';
import { instaticRouter } from './routes/instatic';
import { VOICE_AGENT_TOOLS } from './tools/registry';
import { toolDispatcher } from './tools/dispatcher';
import { crmStore } from './services/crmStore';
import { contentFactoryEngine } from './services/contentFactoryEngine';
import { graphDatabaseService } from './services/graphDatabaseService';

if (typeof (process as any).loadEnvFile === 'function') {
  try {
    (process as any).loadEnvFile();
  } catch {}
}

const app = express();
const port = process.env.PORT || 4000;

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// The embeddable widget runs on customer sites, so it cannot share the dashboard's
// origin allowlist. Only the widget's own endpoint gets the wider policy; every
// other route stays locked to CORS_ALLOWED_ORIGINS.
const WIDGET_ROUTES = ['/api/voice/token'];
const widgetOrigins = (process.env.WIDGET_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors((req, callback) => {
    const isWidgetRoute = WIDGET_ROUTES.some((route) => req.path.startsWith(route));
    if (!isWidgetRoute) {
      return callback(null, { origin: allowedOrigins });
    }
    // Unset means "any site may embed", which is the demo posture and is warned
    // about at boot. Set WIDGET_ALLOWED_ORIGINS in production to pin customers.
    if (widgetOrigins.length === 0) {
      return callback(null, { origin: true });
    }
    return callback(null, { origin: widgetOrigins });
  })
);
app.use(express.json({ limit: '1mb' }));

// Minting a token costs real AssemblyAI minutes, and the widget endpoint is
// reachable by anyone who embeds the script. Cap it per client so a hostile or
// looping page cannot drain the account. In-memory is enough for a single
// instance; this moves to the datastore when the app scales horizontally.
const TOKEN_RATE_LIMIT = Number(process.env.VOICE_TOKEN_RATE_LIMIT || 20);
const TOKEN_RATE_WINDOW_MS = 60_000;
const tokenHits = new Map<string, { count: number; resetAt: number }>();

app.use('/api/voice/token', (req, res, next) => {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const entry = tokenHits.get(key);

  if (!entry || now > entry.resetAt) {
    tokenHits.set(key, { count: 1, resetAt: now + TOKEN_RATE_WINDOW_MS });
    return next();
  }
  if (entry.count >= TOKEN_RATE_LIMIT) {
    return res.status(429).json({
      error: 'Too many voice sessions from this address. Try again shortly.',
      code: 'RATE_LIMITED'
    });
  }
  entry.count += 1;
  next();
});

// Static assets & embeddable widget
const publicDir = fs.existsSync(path.join(__dirname, 'public'))
  ? path.join(__dirname, 'public')
  : path.join(__dirname, '../src/public');

app.use(express.static(publicDir));
app.get('/embed.js', (_req, res) => {
  res.sendFile(path.join(publicDir, 'embed.js'));
});
app.get('/widget-preview', (_req, res) => {
  res.sendFile(path.join(publicDir, 'widget-preview.html'));
});

// Mount HTTP routes
app.use('/api/voice', tokenRouter);
app.use('/api/crm', crmRouter);
app.use('/api/content', contentRouter);
app.use('/api/graph', graphRouter);
app.use('/api/credentials', credentialsRouter);
app.use('/api/billing', billingRouter);
app.use('/api/instatic', instaticRouter);

// Root landing info
app.get('/', (_req, res) => {
  res.json({
    service: 'GrowthVoice OS — Voice Orchestrator API',
    status: 'operational',
    backendPort: 4000,
    webConsoleUrl: 'http://localhost:3000',
    endpoints: {
      health: '/api/health',
      voiceConfig: '/api/voice/config',
      crmLeads: '/api/crm/leads',
      crmMembers: '/api/crm/members',
      contentJobs: '/api/content/jobs',
      graphStats: '/api/graph/stats',
      graphNodes: '/api/graph/nodes',
      graphEdges: '/api/graph/edges',
      credentials: '/api/credentials/:clientId',
      billingPlans: '/api/billing/plans',
      billingUsage: '/api/billing/usage/:clientId',
      instaticPages: '/api/instatic/pages',
      instaticPreview: '/api/instatic/preview/:pageId',
      embedWidget: '/embed.js',
      widgetPreview: '/widget-preview',
      telemetryWs: 'ws://localhost:4000/ws/telemetry'
    }
  });
});

// Health check and session info
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'voice-orchestrator',
    voiceProvider: 'assemblyai-voice-agent',
    registeredTools: VOICE_AGENT_TOOLS.map((t) => t.name)
  });
});

app.get('/api/voice/config', (_req, res) => {
  res.json({
    // The Voice Agent API exposes no model-selection field, so we do not claim
    // one. Naming a specific model here was cosmetic: it was never sent.
    voice: 'anna',
    tools: VOICE_AGENT_TOOLS,
    system_prompt:
      'You are the AI Growth Operator for an elite online creator. Your job is to warmly qualify inbound prospective students using BANT criteria, answer curriculum and pricing questions accurately, handle objections, and schedule strategy consultations on the calendar. For cancellation requests, understand their core frustration and offer policy-compliant retention packages. You can also trigger the autonomous Hermes Content Factory using run_content_factory.'
  });
});

// Demo Eval Suite Endpoints — these return static illustrative numbers, not a
// computed evaluation. `mode: 'static_demo'` flags this honestly for callers.
app.get('/api/evals/report', (_req, res) => {
  res.json({
    status: 'success',
    mode: 'static_demo',
    suiteName: 'Anthropic Production Eval Suite',
    totalTasks: 4,
    kTrials: 5,
    passAtK: 100,
    passPowerK: 88.4,
    latencyP50: 920,
    latencyP95: 1450,
    ttfaAvgMs: 410,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/evals/run', async (_req, res) => {
  res.json({
    status: 'completed',
    mode: 'static_demo',
    suiteName: 'Anthropic Production Eval Suite',
    totalTasks: 4,
    kTrials: 5,
    passAtK: 100,
    passPowerK: 88.4,
    latencyP50: 920,
    latencyP95: 1450,
    ttfaAvgMs: 410,
    timestamp: new Date().toISOString()
  });
});

const server = http.createServer(app);

// WebSocket Server for live frontend telemetry and tool execution bridge
const wss = new WebSocketServer({ server, path: '/ws/telemetry' });

// Broadcast Hermes Content Factory updates to all connected UI clients
contentFactoryEngine.setUpdateListener((job) => {
  const payload = JSON.stringify({
    type: 'content_factory_job_updated',
    job,
    timestamp: new Date().toISOString()
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
});

// Broadcast CRM lead updates (e.g. Kanban drag-and-drop status changes) to all connected UI clients
crmStore.setUpdateListener((lead) => {
  const payload = JSON.stringify({
    type: 'lead_updated',
    lead,
    timestamp: new Date().toISOString()
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
});

wss.on('connection', (ws: WebSocket) => {
  console.log('[Telemetry WS] Client connected to live telemetry stream');

  // Send initial state
  ws.send(
    JSON.stringify({
      type: 'initial_state',
      leads: crmStore.getLeads(),
      members: crmStore.getMembers(),
      jobs: contentFactoryEngine.getJobs(),
      tools: VOICE_AGENT_TOOLS
    })
  );

  ws.on('message', async (message: string) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === 'ping') {
        ws.send(
          JSON.stringify({
            type: 'pong',
            clientTimestamp: data.clientTimestamp || data.timestamp,
            serverTimestamp: Date.now()
          })
        );
        return;
      }

      if (data.type === 'tool_execution_request') {
        const { call_id, name, arguments: args } = data;
        let result: unknown;
        let failed = false;

        try {
          result = await toolDispatcher.dispatch(name, args);
        } catch (toolErr: any) {
          failed = true;
          result = { error: toolErr?.message || 'Tool execution failed' };
          console.error('[Tool Dispatch Error]', name, toolErr?.message);
        }

        // Return the result to the REQUESTING client only, so it can complete the
        // AssemblyAI tool call. This must not be broadcast: with two tabs open,
        // every tab would answer the same call_id. Without this the agent waits
        // out its timeout_seconds and the conversation stalls mid-sentence.
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'tool_result', call_id, name, result, failed }));
        }

        // Broadcast tool event to all connected UI clients
        const eventPayload = JSON.stringify({
          type: 'tool_executed',
          call_id,
          name,
          arguments: args,
          result,
          leads: crmStore.getLeads(),
          members: crmStore.getMembers(),
          timestamp: new Date().toISOString()
        });

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(eventPayload);
          }
        });
      }
    } catch (e: any) {
      console.error('[Telemetry WS Message Error]', e.message);
    }
  });
});

server.listen(port, () => {
  console.log(`=======================================================`);
  console.log(`🎙️  AI Growth Operator Voice OS — Orchestrator Running`);
  console.log(`🚀 Port: http://localhost:${port}`);
  console.log(`⚡ Voice: AssemblyAI Voice Agent API`);
  if (!process.env.ASSEMBLYAI_API_KEY) {
    console.warn('⚠️  ASSEMBLYAI_API_KEY is unset — /api/voice/token will return 503 and voice calls are disabled.');
  }
  if (widgetOrigins.length === 0) {
    console.warn('⚠️  WIDGET_ALLOWED_ORIGINS is unset — any site may embed the widget and mint voice tokens.');
  }
  console.log(`🛠️  Tools Registered: ${VOICE_AGENT_TOOLS.length}`);
  console.log(`=======================================================`);
});
