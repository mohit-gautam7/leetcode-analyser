import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Key, Brain, Cpu, Shield, Eye, EyeOff, Save, Trash2, CheckCircle, Zap } from 'lucide-react';
import { Button, Card, Input, Select, Switch, SectionHeader } from '@/components/ui';
import { storage } from '@/storage';
import { AI_MODELS, selectAutoModel } from '@/services/nvidia-nim';
import { OPENROUTER_MODELS } from '@/services/openrouter';
import { maskApiKey } from '@/utils/crypto';
import { staggerContainer, staggerItem } from '@/animations/variants';
import type { Settings as SettingsType, NvidiaModel, OpenRouterModel, SolutionLanguage, AIProvider } from '@/types';

interface SettingsTabProps {
  settings: SettingsType;
  onSettingsChange: (s: SettingsType) => void;
}

export function SettingsTab({ settings, onSettingsChange }: SettingsTabProps) {
  const [local, setLocal] = useState<SettingsType>(settings);
  const [showNvidiaKey, setShowNvidiaKey] = useState(false);
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setLocal(settings); }, [settings]);

  function update<K extends keyof SettingsType>(key: K, value: SettingsType[K]) {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    await storage.saveSettings(local);
    onSettingsChange(local);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function clearData() {
    if (confirm('Clear all cached data? Settings will be preserved.')) {
      const s = await storage.getSettings();
      await storage.clearAll();
      await storage.saveSettings(s);
    }
  }

  const nvidiaModelEntries = Object.entries(AI_MODELS).filter(([k]) => k !== 'auto') as [NvidiaModel, NonNullable<typeof AI_MODELS[NvidiaModel]>][];

  return (
    <div className="space-y-5">
      <SectionHeader title="Settings" icon={<Settings className="w-4 h-4" />} />

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">

        {/* Provider Selection */}
        <motion.div variants={staggerItem}>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-violet-400" />
              <p className="text-sm font-medium text-white">AI Provider</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['nvidia', 'openrouter'] as AIProvider[]).map((p) => (
                <button
                  key={p}
                  onClick={() => update('aiProvider', p)}
                  className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                    local.aiProvider === p
                      ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                      : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {p === 'nvidia' ? '⚡ NVIDIA NIM' : '🔀 OpenRouter'}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {local.aiProvider === 'nvidia'
                ? 'Direct access to NVIDIA-hosted models — free tier available'
                : 'Access 200+ models through a single OpenRouter API key'}
            </p>
          </Card>
        </motion.div>

        {/* NVIDIA NIM Section */}
        {local.aiProvider === 'nvidia' && (
          <>
            <motion.div variants={staggerItem}>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Key className="w-4 h-4 text-violet-400" />
                  <p className="text-sm font-medium text-white">NVIDIA NIM API Key</p>
                </div>
                <div className="relative">
                  <Input
                    type={showNvidiaKey ? 'text' : 'password'}
                    placeholder="nvapi-xxxxxxxxxxxx"
                    value={local.apiKey}
                    onChange={(e) => update('apiKey', e.target.value)}
                    className="pr-10"
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    onClick={() => setShowNvidiaKey(!showNvidiaKey)}
                  >
                    {showNvidiaKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  Get your free key at{' '}
                  <span className="text-violet-400">build.nvidia.com</span>
                </p>
              </Card>
            </motion.div>

            <motion.div variants={staggerItem}>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4 text-violet-400" />
                  <p className="text-sm font-medium text-white">NVIDIA Model</p>
                </div>
                <Select
                  value={local.model}
                  onChange={(e) => update('model', e.target.value as NvidiaModel | 'auto')}
                >
                  <option value="auto">🤖 Auto (picks best model per task)</option>
                  {nvidiaModelEntries.map(([id, info]) => (
                    <option key={id} value={id}>
                      {info.name} — {info.speed} · {info.strengths[0]}
                    </option>
                  ))}
                </Select>
                {local.model === 'auto' && (
                  <p className="text-xs text-slate-500 mt-1.5">Auto uses Llama 3.3 70B for everything — proven reliable, consistent across all task types</p>
                )}
              </Card>
            </motion.div>
          </>
        )}

        {/* OpenRouter Section */}
        {local.aiProvider === 'openrouter' && (
          <>
            <motion.div variants={staggerItem}>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Key className="w-4 h-4 text-emerald-400" />
                  <p className="text-sm font-medium text-white">OpenRouter API Key</p>
                </div>
                <div className="relative">
                  <Input
                    type={showOpenRouterKey ? 'text' : 'password'}
                    placeholder="sk-or-v1-xxxxxxxxxxxx"
                    value={local.openRouterApiKey}
                    onChange={(e) => update('openRouterApiKey', e.target.value)}
                    className="pr-10"
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                  >
                    {showOpenRouterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  Get your key at{' '}
                  <span className="text-emerald-400">openrouter.ai/keys</span>{' '}
                  — many models have free tier
                </p>
              </Card>
            </motion.div>

            <motion.div variants={staggerItem}>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4 text-emerald-400" />
                  <p className="text-sm font-medium text-white">OpenRouter Model</p>
                </div>
                <Select
                  value={local.openRouterModel}
                  onChange={(e) => update('openRouterModel', e.target.value as OpenRouterModel | 'auto')}
                >
                  <option value="auto">🤖 Auto (best free model per task)</option>
                  {OPENROUTER_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.free ? '🆓 ' : ''}{m.name} — {m.speed} · {m.description.split('—')[1]?.trim()}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-slate-500 mt-1.5">
                  {local.openRouterModel === 'auto'
                    ? 'Auto uses Llama 3.3 70B (Free) for everything — proven reliable, consistent across all task types.'
                    : OPENROUTER_MODELS.find((m) => m.id === local.openRouterModel)?.description}
                </p>
              </Card>
            </motion.div>
          </>
        )}

        {/* Behavior */}
        <motion.div variants={staggerItem}>
          <Card className="p-4 space-y-3">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Behavior</p>
            <Switch
              checked={local.contestMode}
              onCheckedChange={(v) => update('contestMode', v)}
              label="Contest Mode (hides solutions & editorial)"
            />
            <Switch
              checked={local.autoAnalyze}
              onCheckedChange={(v) => update('autoAnalyze', v)}
              label="Auto-analyze when problem loads"
            />
            <Switch
              checked={local.streamingEnabled}
              onCheckedChange={(v) => update('streamingEnabled', v)}
              label="Streaming responses"
            />
            <Switch
              checked={local.offlineCacheEnabled}
              onCheckedChange={(v) => update('offlineCacheEnabled', v)}
              label="Offline cache (24h TTL)"
            />
            <Switch
              checked={local.showComplexityBadge}
              onCheckedChange={(v) => update('showComplexityBadge', v)}
              label="Show live complexity badge"
            />
          </Card>
        </motion.div>

        {/* Default Language */}
        <motion.div variants={staggerItem}>
          <Card className="p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Default Language</p>
            <Select
              value={local.defaultLanguage}
              onChange={(e) => update('defaultLanguage', e.target.value as SolutionLanguage)}
            >
              {(['python', 'cpp', 'java', 'javascript', 'go', 'rust', 'typescript', 'c'] as SolutionLanguage[]).map((l) => (
                <option key={l} value={l}>{l.toUpperCase()}</option>
              ))}
            </Select>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div variants={staggerItem} className="flex gap-2">
          <Button
            variant="primary"
            className="flex-1"
            onClick={save}
            loading={saving}
          >
            {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save Settings'}
          </Button>
          <Button variant="danger" size="md" onClick={clearData}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </motion.div>

        {/* Version */}
        <motion.div variants={staggerItem}>
          <p className="text-center text-xs text-slate-600">
            CodeSense AI v1.0.0 · NVIDIA NIM + OpenRouter
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
