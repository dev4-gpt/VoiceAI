import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { tokenRouter } from './routes/token.ts';
import { crmRouter } from './routes/crm.ts';
import { contentRouter } from './routes/content.ts';
import { VOICE_AGENT_TOOLS } from './tools/registry.ts';
import { toolDispatcher } from './tools/dispatcher.ts';
import { crmStore } from './services/crmStore.ts';
import { contentFactoryEngine } from './services/contentFactoryEngine.ts';

if (typeof (process as any).loadEnvFile === 'function') {
  try {
    (process as any).loadEnvFile();
  } catch {}
}

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Mount HTTP routes
app.use('/api/voice', tokenRouter);
app.use('/api/crm', crmRouter);
app.use('/api/content', contentRouter);

// Health check and session info
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'voice-orchestrator',
    assemblyAiModel: 'universal-3-5-pro',
    registeredTools: VOICE_AGENT_TOOLS.map((t) => t.name)
  });
});

app.get('/api/voice/config', (_req, res) => {
  res.json({
    speech_model: 'universal-3-5-pro',
    voice: 'anna',
    tools: VOICE_AGENT_TOOLS,
    system_prompt:
      'You are the AI Growth Operator for an elite online creator. Your job is to warmly qualify inbound prospective students using BANT criteria, answer curriculum and pricing questions accurately, handle objections, and schedule strategy consultations on the calendar. For cancellation requests, understand their core frustration and offer policy-compliant retention packages. You can also trigger the autonomous Hermes Content Factory using run_content_factory.'
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

      if (data.type === 'tool_execution_request') {
        const { call_id, name, arguments: args } = data;
        const result = await toolDispatcher.dispatch(name, args);

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
  console.log(`⚡ AssemblyAI Model: universal-3-5-pro (Voice Agent API)`);
  console.log(`🛠️  Tools Registered: ${VOICE_AGENT_TOOLS.length}`);
  console.log(`=======================================================`);
});
