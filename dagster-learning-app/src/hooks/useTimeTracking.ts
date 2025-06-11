import { useEffect, useRef } from 'react';
import { useProgressStore } from '@/store/progressStore';

export function useTimeTracking(moduleId: string) {
  const startTimeRef = useRef<number>(Date.now());
  const { updateTimeSpent } = useProgressStore();

  useEffect(() => {
    // Reset start time when component mounts
    startTimeRef.current = Date.now();

    // Update time spent when component unmounts or moduleId changes
    return () => {
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (timeSpent > 0) {
        updateTimeSpent(moduleId, timeSpent);
      }
    };
  }, [moduleId, updateTimeSpent]);

  // Also update time spent periodically (every minute)
  useEffect(() => {
    const interval = setInterval(() => {
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (timeSpent >= 60) {
        updateTimeSpent(moduleId, timeSpent);
        startTimeRef.current = Date.now();
      }
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [moduleId, updateTimeSpent]);
}