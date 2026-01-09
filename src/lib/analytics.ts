/**
 * Analytics calculations for Strava activity data
 */

import type { StoredActivity } from './storage';

export const formatDistance = (meters: number): string => {
  const miles = meters * 0.000621371;
  return miles.toFixed(1);
};

export const formatElevation = (meters: number): string => {
  const feet = meters * 3.28084;
  return Math.round(feet).toString();
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${secs}s`;
};

export const formatPace = (speedMs: number): string => {
  if (speedMs === 0) return '0:00';
  const metersPerMinute = speedMs * 60;
  const minutesPerMile = 1609.34 / metersPerMinute;
  const minutes = Math.floor(minutesPerMile);
  const seconds = Math.round((minutesPerMile - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Get ISO date string for start of week (Sunday)
 */
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const weekStart = new Date(d.setDate(diff));
  // Reset time to start of day in local timezone
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
};

/**
 * Format week label (e.g., "Jan 5")
 */
const getWeekLabel = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Calculate weekly stats grouped by week
 */
export function calculateWeeklyStats(activities: StoredActivity[]) {
  const weeks = new Map<string, number>();
  const weekActivities = new Map<string, StoredActivity[]>();

  activities.forEach(activity => {
    const date = new Date(activity.start_date);
    const weekStart = getWeekStart(date);
    const weekKey = weekStart.toISOString().split('T')[0];

    weeks.set(weekKey, (weeks.get(weekKey) || 0) + activity.distance);

    if (!weekActivities.has(weekKey)) {
      weekActivities.set(weekKey, []);
    }
    weekActivities.get(weekKey)!.push(activity);
  });

  const sorted = Array.from(weeks.entries())
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, distance]) => ({
      week: getWeekLabel(new Date(key)),
      weekKey: key,
      distance: parseFloat(formatDistance(distance)),
    }));

  return { weeklyData: sorted, weekActivities };
}

/**
 * Calculate aggregate stats
 */
export function calculateAggregateStats(activities: StoredActivity[]) {
  if (activities.length === 0) {
    return {
      totalActivities: 0,
      totalDistance: '0.0',
      totalTime: '0m 0s',
      avgPace: '0:00',
      totalElevation: '0',
    };
  }

  const totalDistance = activities.reduce((sum, a) => sum + a.distance, 0);
  const totalTime = activities.reduce((sum, a) => sum + a.moving_time, 0);
  const avgSpeed =
    activities.reduce((sum, a) => sum + a.average_speed, 0) / activities.length;
  const totalElevation = activities.reduce((sum, a) => sum + a.total_elevation_gain, 0);

  return {
    totalActivities: activities.length,
    totalDistance: formatDistance(totalDistance),
    totalTime: formatDuration(totalTime),
    avgPace: formatPace(avgSpeed),
    totalElevation: formatElevation(totalElevation),
  };
}

/**
 * Calculate monthly stats
 */
export function calculateMonthlyStats(activities: StoredActivity[]) {
  const months = new Map<string, number>();
  const monthActivities = new Map<string, StoredActivity[]>();

  activities.forEach(activity => {
    const date = new Date(activity.start_date);
    const monthKey = date.toISOString().split('T')[0].substring(0, 7); // YYYY-MM
    const monthLabel = date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });

    months.set(monthKey, (months.get(monthKey) || 0) + activity.distance);

    if (!monthActivities.has(monthKey)) {
      monthActivities.set(monthKey, []);
    }
    monthActivities.get(monthKey)!.push(activity);
  });

  const sorted = Array.from(months.entries())
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key]) => {
      const [year, month] = key.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      const label = date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });
      return {
        month: label,
        monthKey: key,
        distance: parseFloat(formatDistance(months.get(key) || 0)),
      };
    });

  return { monthlyData: sorted, monthActivities };
}

/**
 * Calculate running streaks
 */
export function calculateStreaks(activities: StoredActivity[]) {
  if (activities.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalActivities: 0,
    };
  }

  // Sort activities by date (most recent first)
  const sorted = [...activities].sort(
    (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let lastDate: Date | null = null;

  // Calculate current streak
  for (let i = 0; i < sorted.length; i++) {
    const date = new Date(sorted[i].start_date);
    date.setHours(0, 0, 0, 0);

    if (lastDate === null) {
      // Check if most recent activity was today or yesterday
      const daysDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 1) {
        currentStreak = 1;
        tempStreak = 1;
      }
    } else {
      const daysDiff = Math.floor(
        (lastDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff === 1) {
        currentStreak++;
        tempStreak++;
      } else if (daysDiff > 1) {
        break;
      }
    }

    lastDate = date;
  }

  // Calculate longest streak
  lastDate = null;
  tempStreak = 0;

  for (const activity of sorted) {
    const date = new Date(activity.start_date);
    date.setHours(0, 0, 0, 0);

    if (lastDate === null) {
      tempStreak = 1;
    } else {
      const daysDiff = Math.floor(
        (lastDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }

    lastDate = date;
  }

  longestStreak = Math.max(longestStreak, tempStreak);

  return {
    currentStreak,
    longestStreak,
    totalActivities: activities.length,
  };
}

/**
 * Calculate pace trends over time
 */
export function calculatePaceTrends(activities: StoredActivity[]) {
  if (activities.length === 0) return [];

  const sorted = [...activities].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  return sorted.map(activity => ({
    date: formatDate(activity.start_date),
    dateObj: new Date(activity.start_date),
    pace: parseFloat(formatPace(activity.average_speed).replace(':', '.')),
    displayPace: formatPace(activity.average_speed),
  }));
}