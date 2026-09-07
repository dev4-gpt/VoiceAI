import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Twitter,
  Linkedin,
  Youtube,
  Globe,
  Radio,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Cloud,
  Check,
  ExternalLink,
  Lock
} from 'lucide-react';

export interface MaskedPlatformCredential {
  platform: string;
  accountHandle?: string;
  profileName?: string;
  environment: 'cloud_production' | 'cloud_sandbox' | 'local';
  autoPublishEnabled: boolean;
  status: 'connected' | 'unconfigured' | 'verifying' | 'error';
  lastVerifiedAt?: string;
  latencyMs?: number;
  maskedFields: Record<string, string>;
  hasSecrets: boolean;
}

interface ClientCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  theme?: 'glass' | 'cyber';
}

export const ClientCredentialsModal: React.FC<ClientCredentialsModalProps> = ({
  isOpen,
  onClose,
  companyName,
  theme = 'glass'
}) => {
  const isGlass = theme === 'glass';
  const [activePlatform, setActivePlatform] = useState<string>('twitter');
  const [credentials, setCredentials] = useState<MaskedPlatformCredential[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form input state for active platform editing
  const [handleInput, setHandleInput] = useState('');
  const [secretsInput, setSecretsInput] = useState<Record<string, string>>({});
  const [showSecretMap, setShowSecretMap] = useState<Record<string, boolean>>({});
  const [autoPublish, setAutoPublish] = useState(true);

  // Fetch client credentials
  const fetchCredentials = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/credentials/${encodeURIComponent(companyName)}`);
      if (res.ok) {
        const data = await res.json();
        setCredentials(data.platforms || []);
      }
    } catch (err: any) {
      console.error('[Fetch Credentials Error]', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCredentials();
    }
  }, [isOpen, companyName]);

  const currentCred = credentials.find((c) => c.platform === activePlatform);

  // Sync active platform state to form
  useEffect(() => {
    if (currentCred) {
      setHandleInput(currentCred.accountHandle || '');
      setAutoPublish(currentCred.autoPublishEnabled ?? true);
      setSecretsInput({});
    } else {
      setHandleInput('');
      setSecretsInput({});
    }
  }, [activePlatform, credentials]);

  if (!isOpen) return null;

  const handleSecretChange = (key: string, value: string) => {
    setSecretsInput((prev) => ({ ...prev, [key]: value }));
  };

  const toggleShowSecret = (key: string) => {
    setShowSecretMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    try {
      setIsVerifying(true);
      setStatusMessage(null);

      const res = await fetch(`/api/credentials/${encodeURIComponent(companyName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: activePlatform,
          accountHandle: handleInput,
          secrets: secretsInput,
          autoPublishEnabled: autoPublish,
          environment: 'cloud_production'
        })
      });

      if (res.ok) {
        setStatusMessage({ type: 'success', text: `Saved cloud credentials for ${activePlatform.toUpperCase()}!` });
        await fetchCredentials();
      } else {
        const err = await res.json();
        setStatusMessage({ type: 'error', text: err.message || 'Failed to save credentials' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerify = async () => {
    try {
      setIsVerifying(true);
      setStatusMessage(null);

      const res = await fetch(`/api/credentials/${encodeURIComponent(companyName)}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: activePlatform })
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: `Handshake successful (${data.latencyMs}ms)! ${data.message}` });
        await fetchCredentials();
      } else {
        setStatusMessage({ type: 'error', text: data.message || 'Verification failed.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(`Are you sure you want to disconnect ${activePlatform.toUpperCase()} for ${companyName}?`)) return;

    try {
      setIsLoading(true);
      await fetch(`/api/credentials/${encodeURIComponent(companyName)}/${activePlatform}`, {
        method: 'DELETE'
      });
      setStatusMessage({ type: 'success', text: `Disconnected ${activePlatform.toUpperCase()}` });
      await fetchCredentials();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const platformMeta: Record<string, { label: string; icon: any; fields: string[] }> = {
    twitter: {
      label: 'Twitter / X',
      icon: Twitter,
      fields: ['apiKey', 'apiSecret', 'accessToken', 'bearerToken']
    },
    linkedin: {
      label: 'LinkedIn',
      icon: Linkedin,
      fields: ['clientId', 'clientSecret', 'accessToken']
    },
    substack: {
      label: 'Substack / Webhook',
      icon: Globe,
      fields: ['webhookUrl', 'bearerToken']
    },
    youtube: {
      label: 'YouTube Studio',
      icon: Youtube,
      fields: ['apiKey', 'channelId']
    }
  };

  const ActiveIcon = platformMeta[activePlatform]?.icon || Radio;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl border flex flex-col max-h-[90vh] ${
          isGlass
            ? 'bg-[#fdfcf9] border-[#e2ded5] text-slate-800'
            : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isGlass ? 'border-[#e8e4dc] bg-[#f7f3ea]/80' : 'border-slate-800 bg-slate-950/60'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold">Connected Platforms & Cloud Credentials</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  ISOLATED VAULT
                </span>
              </div>
              <p className={`text-xs ${isGlass ? 'text-slate-500' : 'text-slate-400'}`}>
                Managing cloud publishing keys for <strong className="text-slate-900 dark:text-white font-semibold">{companyName}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-all ${
              isGlass ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Sidebar Platforms + Main Configuration */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Sidebar */}
          <div
            className={`w-full md:w-60 p-4 border-r flex md:flex-col space-x-2 md:space-x-0 md:space-y-2 overflow-x-auto ${
              isGlass ? 'border-[#e8e4dc] bg-[#faf8f4]/60' : 'border-slate-800 bg-slate-950/40'
            }`}
          >
            {Object.keys(platformMeta).map((key) => {
              const meta = platformMeta[key];
              const Icon = meta.icon;
              const cred = credentials.find((c) => c.platform === key);
              const isConnected = cred?.status === 'connected' && cred.hasSecrets;
              const isSelected = activePlatform === key;

              return (
                <button
                  key={key}
                  onClick={() => {
                    setActivePlatform(key);
                    setStatusMessage(null);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all ${
                    isSelected
                      ? isGlass
                        ? 'bg-white shadow-sm border border-[#d8d3c7] font-bold text-slate-900'
                        : 'bg-slate-800 border border-slate-700 font-bold text-white'
                      : isGlass
                      ? 'hover:bg-[#f0ebe1] text-slate-600 border border-transparent'
                      : 'hover:bg-slate-900 text-slate-400 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className="w-4 h-4 text-sky-500" />
                    <span className="text-xs">{meta.label}</span>
                  </div>

                  <span
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Platform Config Form */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5">
            {/* Status Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <ActiveIcon className="w-5 h-5 text-sky-600" />
                <h4 className="text-sm font-bold">{platformMeta[activePlatform]?.label} Cloud Integration</h4>
              </div>

              <div className="flex items-center space-x-2">
                {currentCred?.status === 'connected' && currentCred.hasSecrets ? (
                  <span className="flex items-center space-x-1 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>CONNECTED ({currentCred.latencyMs || 40}ms)</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-800 dark:text-slate-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>NOT CONFIGURED</span>
                  </span>
                )}
              </div>
            </div>

            {/* Notification Banner */}
            {statusMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center space-x-2 border ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-red-50 text-red-900 border-red-300 dark:bg-red-950/40 dark:text-red-300'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* Fields */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Public Account Handle / Profile URN
                </label>
                <input
                  type="text"
                  value={handleInput}
                  onChange={(e) => setHandleInput(e.target.value)}
                  placeholder={`e.g. @${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}`}
                  className={`w-full text-xs font-mono px-3 py-2 rounded-xl border outline-none transition-all ${
                    isGlass
                      ? 'bg-white border-[#d8d3c7] focus:border-sky-500'
                      : 'bg-slate-950 border-slate-800 focus:border-sky-500'
                  }`}
                />
              </div>

              {platformMeta[activePlatform]?.fields.map((field) => {
                const maskedVal = currentCred?.maskedFields[field] || '';
                const isSecretShown = showSecretMap[field] || false;

                return (
                  <div key={field}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
                        {field.replace(/([A-Z])/g, ' $1').toUpperCase()}
                      </label>
                      {maskedVal && (
                        <span className="text-[10px] font-mono text-emerald-600 font-medium">
                          Active Secret: {maskedVal}
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      <input
                        type={isSecretShown ? 'text' : 'password'}
                        value={secretsInput[field] || ''}
                        onChange={(e) => handleSecretChange(field, e.target.value)}
                        placeholder={maskedVal ? 'Leave blank to keep existing secret, or enter new key' : 'Paste API key or secret token'}
                        className={`w-full text-xs font-mono px-3 py-2 pr-10 rounded-xl border outline-none transition-all ${
                          isGlass
                            ? 'bg-white border-[#d8d3c7] focus:border-sky-500'
                            : 'bg-slate-950 border-slate-800 focus:border-sky-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowSecret(field)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {isSecretShown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Auto-Publish Toggle */}
              <div
                className={`flex items-center justify-between p-3.5 rounded-xl border ${
                  isGlass ? 'bg-[#f7f3ea]/50 border-[#e8e4dc]' : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">Autonomous Thought Leadership Auto-Publish</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Automatically publish verified content packs to {platformMeta[activePlatform]?.label} after Anna consultations.
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={autoPublish}
                  onChange={(e) => setAutoPublish(e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between pt-4 border-t gap-2 border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                {currentCred?.hasSecrets && (
                  <button
                    onClick={handleDisconnect}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all border border-red-200 dark:border-red-900"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleVerify}
                  disabled={isVerifying || !currentCred?.hasSecrets}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    isGlass
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  } disabled:opacity-50`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                  <span>Test Connection</span>
                </button>

                <button
                  onClick={handleSave}
                  disabled={isVerifying}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Save to Client Vault</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
