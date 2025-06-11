import { useState, useEffect } from 'react';
import { contentLoader } from '@/utils/contentLoader';
import type { Curriculum, Module } from '@/types/content';

export function useCurriculum() {
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    contentLoader
      .loadCurriculum()
      .then(setCurriculum)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { curriculum, loading, error };
}

export function useModule(level: string, moduleId: string) {
  const [module, setModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!level || !moduleId) return;
    
    setLoading(true);
    contentLoader
      .loadModule(level, moduleId)
      .then(setModule)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [level, moduleId]);

  return { module, loading, error };
}