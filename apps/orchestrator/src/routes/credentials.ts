import { Router, Request, Response } from 'express';
import { clientCredentialsService } from '../services/clientCredentialsService';
import { requireApiKey } from '../middleware/auth';

export const credentialsRouter = Router();

const SUPPORTED_PLATFORMS = ['twitter', 'linkedin', 'substack', 'youtube', 'meta', 'cloud_storage'];

function isValidPlatform(platform: unknown): platform is string {
  return typeof platform === 'string' && SUPPORTED_PLATFORMS.includes(platform.toLowerCase().trim());
}

function isValidSecretsShape(secrets: unknown): secrets is Record<string, string> {
  if (typeof secrets !== 'object' || secrets === null || Array.isArray(secrets)) return false;
  return Object.values(secrets).every((v) => typeof v === 'string');
}

credentialsRouter.use(requireApiKey);

// A cold instance must decrypt stored credentials first, or it would show the
// demo seed as this client's configuration and let a save overwrite real keys.
credentialsRouter.use(async (_req, _res, next) => {
  await clientCredentialsService.ready;
  next();
});

// 1. Get masked credentials for a client
credentialsRouter.get('/:clientId', (req: Request, res: Response) => {
  const { clientId } = req.params;
  if (!clientId) {
    return res.status(400).json({ error: 'Client identifier is required' });
  }

  const data = clientCredentialsService.getMaskedCredentials(clientId);
  res.json(data);
});

// 2. Save or update platform credentials for a client
credentialsRouter.post('/:clientId', async (req: Request, res: Response) => {
  const { clientId } = req.params;
  const { platform, secrets, accountHandle, profileName, environment, autoPublishEnabled } = req.body;

  if (!clientId || !platform) {
    return res.status(400).json({ error: 'Client identifier and platform name are required' });
  }
  if (!isValidPlatform(platform)) {
    return res.status(400).json({ error: `Unsupported platform. Must be one of: ${SUPPORTED_PLATFORMS.join(', ')}` });
  }
  if (secrets !== undefined && !isValidSecretsShape(secrets)) {
    return res.status(400).json({ error: 'secrets must be a flat object of string values' });
  }

  try {
    const updated = await clientCredentialsService.setPlatformCredentials({
      identifier: clientId,
      platform,
      secrets: secrets || {},
      accountHandle,
      profileName,
      environment,
      autoPublishEnabled
    });
    // Encrypted write must land before we tell the client it was saved.
    await clientCredentialsService.flush();
    res.json({ status: 'success', platform: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save credentials', message: err.message });
  }
});

// 3. Test & verify connection to a platform
credentialsRouter.post('/:clientId/verify', async (req: Request, res: Response) => {
  const { clientId } = req.params;
  const { platform } = req.body;

  if (!clientId || !platform) {
    return res.status(400).json({ error: 'Client identifier and platform are required for verification' });
  }

  try {
    const result = await clientCredentialsService.verifyPlatform(clientId, platform);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Verification failed', message: err.message });
  }
});

// 4. Disconnect / delete a platform credential
credentialsRouter.delete('/:clientId/:platform', async (req: Request, res: Response) => {
  const { clientId, platform } = req.params;
  const deleted = clientCredentialsService.deletePlatform(clientId, platform);
  if (!deleted) {
    return res.status(404).json({ error: 'Platform or client not found' });
  }
  // A disconnect that only happened in memory would revive the keys on restart.
  await clientCredentialsService.flush();
  res.json({ status: 'success', message: `Disconnected ${platform.toUpperCase()}` });
});
