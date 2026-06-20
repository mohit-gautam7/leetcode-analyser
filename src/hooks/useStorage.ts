import { useState, useEffect, useCallback } from 'react';
import { storage } from '@/storage';
import type { Settings } from '@/types';

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storage.getSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const save = useCallback(async (newSettings: Settings) => {
    await storage.saveSettings(newSettings);
    setSettings(newSettings);
  }, []);

  return { settings, loading, save };
}
