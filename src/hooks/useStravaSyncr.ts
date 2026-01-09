'use client';

import { useState, useCallback } from 'react';
import { StravaClient } from '@/lib/strava';
import type { StoredActivity } from '@/lib/storage';
import {
  getActivities,
  setActivities,
  getAuthToken,
  setAuthToken,
  getSyncTimestamp,
  setSyncTimestamp,
} from '@/lib/storage';

export interface SyncState {
  loading: boolean;
  error: string | null;
  activities: StoredActivity[];
  syncedAt: number | null;
  athleteName: string | null;
}

const INITIAL_STATE: SyncState = {
  loading: false,
  error: null,
  activities: [],
  syncedAt: null,
  athleteName: null,
};

export function useStravaSync() {
  const [state, setState] = useState<SyncState>(() => ({
    ...INITIAL_STATE,
    activities: getActivities(),
    syncedAt: getSyncTimestamp(),
  }));

  const syncActivities = useCallback(async (token: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const client = new StravaClient(token);

      // Get athlete info
      const athlete = await client.getAthleteInfo();
      const athleteName = `${athlete.firstname} ${athlete.lastname}`;

      // Fetch all activities
      const activities = await client.fetchAllActivities();

      if (activities.length === 0) {
        throw new Error('No activities found');
      }

      // Transform to StoredActivity format
      const storedActivities: StoredActivity[] = activities.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        distance: a.distance,
        moving_time: a.moving_time,
        total_elevation_gain: a.total_elevation_gain,
        start_date: a.start_date,
        average_speed: a.average_speed,
        max_speed: a.max_speed,
        average_heartrate: a.average_heartrate,
        max_heartrate: a.max_heartrate,
        activity_url: `https://www.strava.com/activities/${a.id}`,
      }));

      // Save to localStorage
      setActivities(storedActivities);
      setAuthToken(token);
      setSyncTimestamp(Date.now());

      setState(prev => ({
        ...prev,
        loading: false,
        activities: storedActivities,
        syncedAt: Date.now(),
        athleteName,
      }));

      return storedActivities;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync failed';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw err;
    }
  }, []);

  const clearData = useCallback(() => {
    setState(INITIAL_STATE);
    // Note: Don't actually clear localStorage here - let user confirm first
  }, []);

  return {
    ...state,
    syncActivities,
    clearData,
  };
}
