/**
 * localStorage helpers for persisting Strava activity data
 */

export interface StoredActivity {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  start_date: string;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  activity_url?: string;
}

export interface StorageKeys {
  ACTIVITIES: string;
  SYNC_TIMESTAMP: string;
  AUTH_TOKEN: string;
}

const KEYS: StorageKeys = {
  ACTIVITIES: 'strava_activities',
  SYNC_TIMESTAMP: 'strava_sync_timestamp',
  AUTH_TOKEN: 'strava_auth_token',
};

export function getActivities(): StoredActivity[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(KEYS.ACTIVITIES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to retrieve activities from localStorage:', error);
    return [];
  }
}

export function setActivities(activities: StoredActivity[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(KEYS.ACTIVITIES, JSON.stringify(activities));
  } catch (error) {
    console.error('Failed to save activities to localStorage:', error);
  }
}

export function getSyncTimestamp(): number | null {
  if (typeof window === 'undefined') return null;

  try {
    const timestamp = localStorage.getItem(KEYS.SYNC_TIMESTAMP);
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch (error) {
    console.error('Failed to retrieve sync timestamp:', error);
    return null;
  }
}

export function setSyncTimestamp(timestamp: number): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(KEYS.SYNC_TIMESTAMP, timestamp.toString());
  } catch (error) {
    console.error('Failed to save sync timestamp:', error);
  }
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return localStorage.getItem(KEYS.AUTH_TOKEN);
  } catch (error) {
    console.error('Failed to retrieve auth token:', error);
    return null;
  }
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(KEYS.AUTH_TOKEN, token);
  } catch (error) {
    console.error('Failed to save auth token:', error);
  }
}

export function clearAll(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(KEYS.ACTIVITIES);
    localStorage.removeItem(KEYS.SYNC_TIMESTAMP);
    localStorage.removeItem(KEYS.AUTH_TOKEN);
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}

export function getStorageSize(): string {
  if (typeof window === 'undefined') return '0 KB';

  try {
    const activities = localStorage.getItem(KEYS.ACTIVITIES) || '';
    const sizeInBytes = activities.length;
    const sizeInKB = (sizeInBytes / 1024).toFixed(2);
    return `${sizeInKB} KB`;
  } catch (error) {
    return '0 KB';
  }
}