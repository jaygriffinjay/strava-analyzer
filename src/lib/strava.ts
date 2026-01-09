/**
 * Strava API client for fetching activity data
 */

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  start_date: string;
  start_date_local: string;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
}

interface StravaOAuthResponse {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  athlete: {
    id: number;
    firstname: string;
    lastname: string;
  };
}

export class StravaClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Fetch all activities from Strava API
   * Note: Strava API rate limits - 15 requests/min, 600/day
   */
  async fetchAllActivities(
    pageSize: number = 200,
    maxPages: number = 10
  ): Promise<StravaActivity[]> {
    const activities: StravaActivity[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= maxPages) {
      try {
        const response = await fetch(
          `${STRAVA_API_BASE}/athlete/activities?per_page=${pageSize}&page=${page}`,
          {
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Unauthorized - invalid or expired token');
          }
          if (response.status === 429) {
            throw new Error('Rate limited by Strava API - please try again in a few minutes');
          }
          throw new Error(`Failed to fetch activities: ${response.statusText}`);
        }

        const data: StravaActivity[] = await response.json();

        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          activities.push(...data);
          page++;
        }
      } catch (error) {
        // If this is the first page and we hit an error, re-throw it
        if (page === 1) {
          throw error;
        }
        // Otherwise, log and stop fetching more pages
        console.error(`Error fetching page ${page}:`, error);
        hasMore = false;
      }
    }

    return activities;
  }

  /**
   * Fetch a single activity's detailed data
   */
  async fetchActivity(activityId: number): Promise<StravaActivity> {
    const response = await fetch(`${STRAVA_API_BASE}/activities/${activityId}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch activity ${activityId}`);
    }

    return response.json();
  }

  /**
   * Fetch activity streams (GPS, heart rate, etc)
   */
  async fetchActivityStreams(
    activityId: number,
    keys: string[] = ['latlng', 'altitude', 'heartrate']
  ): Promise<Record<string, any>> {
    const keysParam = keys.join(',');
    const response = await fetch(
      `${STRAVA_API_BASE}/activities/${activityId}/streams?keys=${keysParam}&key_by_type=true`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch streams for activity ${activityId}`);
    }

    return response.json();
  }

  /**
   * Get authenticated athlete info
   */
  async getAthleteInfo() {
    const response = await fetch(`${STRAVA_API_BASE}/athlete`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch athlete info');
    }

    return response.json();
  }
}

/**
 * Get OAuth authorization URL for Strava login
 */
export function getStravaAuthUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'force',
    scope: 'activity:read_all',
  });

  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange OAuth code for access token
 * Note: This should ideally be done server-side, but for MVP we'll handle on client
 */
export async function exchangeCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string
): Promise<StravaOAuthResponse> {
  // In production, this should be done server-side via API route
  // to avoid exposing client secret
  const response = await fetch('https://www.strava.com/api/v3/oauth/token', {
    method: 'POST',
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for token');
  }

  return response.json();
}