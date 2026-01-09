'use client';

export const dynamic = 'force-dynamic';

import { useState, useMemo, useEffect } from 'react';
import { Container, Heading, Stack, Box, Text } from '@/components/Primitives';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useStravaSync } from '@/hooks/useStravaSyncr';
import { calculateWeeklyStats, formatDistance } from '@/lib/analytics';
import type { StoredActivity } from '@/lib/storage';

export default function StatsPage() {
  const { activities, loading, error, syncedAt } = useStravaSync();
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate weekly data
  const { weeklyData, weekActivities } = useMemo(() => {
    if (activities.length === 0) {
      return { weeklyData: [], weekActivities: new Map() };
    }
    return calculateWeeklyStats(activities);
  }, [activities]);

  // Get activities for selected week
  const selectedWeekActivities = useMemo(() => {
    if (!selectedWeek || !weekActivities) return [];
    return weekActivities.get(selectedWeek) || [];
  }, [selectedWeek, weekActivities]);

  // Show loading state initially (same on server and client)
  if (loading || !isMounted) {
    return (
      <Container size="xl">
        <Heading level={1}>Weekly Stats</Heading>
        <Text>Loading activities...</Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl">
        <Heading level={1}>Weekly Stats</Heading>
        <Text css={{ color: '#d32f2f' }}>Error: {error}</Text>
      </Container>
    );
  }

  if (activities.length === 0) {
    return (
      <Container size="xl">
        <Stack spacing="lg">
          <Heading level={1}>Weekly Stats</Heading>
          <Text>No activities loaded yet. Go back to sync your data first.</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <Stack spacing="lg">
        <Heading level={1}>Weekly Stats</Heading>

        {syncedAt && (
          <Text variant="caption" css={{ color: '#666' }}>
            Last synced: {new Date(syncedAt).toLocaleString()}
          </Text>
        )}

        {weeklyData.length === 0 ? (
          <Text>No activity data available</Text>
        ) : (
          <Stack spacing="lg">
            <Box p="lg" css={{ userSelect: 'none' }}>
              <Text
                variant="caption"
                css={{ display: 'block', marginBottom: '1rem' }}
              >
                Weekly Distance (miles) - Click a bar to see activities
              </Text>
              <div tabIndex={-1} style={{ outline: 'none' }} css={{ '& *:focus': { outline: 'none' } }}>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={weeklyData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    label={{
                      value: 'Miles',
                      angle: -90,
                      position: 'insideLeft',
                    }}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => value !== undefined ? `${value.toFixed(1)} mi` : 'N/A'}
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    cursor={{ fill: 'rgba(252, 76, 2, 0.1)' }}
                  />
                  <Bar
                    dataKey="distance"
                    fill="#fc4c02"
                    radius={[8, 8, 0, 0]}
                    onClick={(e: any) => {
                      if (e && e.weekKey) {
                        setSelectedWeek(e.weekKey);
                      }
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </Box>

            {selectedWeek && (
              <Box
                p="lg"
                css={{ backgroundColor: 'rgba(252, 76, 2, 0.05)' }}
              >
                <Text css={{ fontWeight: 600, marginBottom: '1.5rem' }}>
                  Week of{' '}
                  {new Date(selectedWeek).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>

                {/* Weekly Calendar Grid */}
                <div
                  css={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '1rem',
                  }}
                >
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, dayIndex) => {
                    const weekStartDate = new Date(selectedWeek);
                    const dayDate = new Date(weekStartDate);
                    dayDate.setDate(dayDate.getDate() + dayIndex);

                    const dayKey = dayDate.toISOString().split('T')[0];
                    const dayActivities = selectedWeekActivities.filter(
                      (activity: StoredActivity) => {
                        const actDate = new Date(activity.start_date);
                        return actDate.toISOString().split('T')[0] === dayKey;
                      }
                    );

                    return (
                      <div
                        key={dayIndex}
                        css={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          padding: '1rem',
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #333',
                          borderRadius: '8px',
                          minHeight: '150px',
                        }}
                      >
                        <div css={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                          <Text
                            css={{
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              color: '#fc4c02',
                              display: 'block',
                              marginBottom: '0.25rem',
                            }}
                          >
                            {dayName}
                          </Text>
                          <Text
                            variant="caption"
                            css={{
                              color: '#aaa',
                              fontSize: '0.75rem',
                            }}
                          >
                            {dayDate.toLocaleDateString('en-US', {
                              month: 'numeric',
                              day: 'numeric',
                            })}
                          </Text>
                        </div>

                        {dayActivities.length > 0 ? (
                          <div
                            css={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5rem',
                            }}
                          >
                            {dayActivities
                              .sort(
                                (a: StoredActivity, b: StoredActivity) =>
                                  new Date(a.start_date).getTime() -
                                  new Date(b.start_date).getTime()
                              )
                              .map((activity: StoredActivity) => (
                                <a
                                  key={activity.id}
                                  href={activity.activity_url || `https://www.strava.com/activities/${activity.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  css={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    padding: '0.5rem 0.75rem',
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #444',
                                    borderRadius: '6px',
                                    gap: '0.25rem',
                                    textDecoration: 'none',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                      backgroundColor: '#333',
                                      borderColor: '#fc4c02',
                                    },
                                  }}
                                >
                                  <div css={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <div css={{ fontSize: '1rem' }}>
                                      {activity.type === 'Run' ? '🏃' : activity.type === 'Walk' ? '🚶' : activity.type === 'Bike' ? '🚴' : '⛹️'}
                                    </div>
                                    <Text
                                      css={{
                                        fontWeight: 600,
                                        color: '#fff',
                                        fontSize: '0.8rem',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        flex: 1,
                                      }}
                                    >
                                      {activity.name}
                                    </Text>
                                  </div>
                                  <Text
                                    variant="caption"
                                    css={{
                                      color: '#fc4c02',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      paddingLeft: '1.5rem',
                                    }}
                                  >
                                    {formatDistance(activity.distance)} mi
                                  </Text>
                                </a>
                              ))}
                          </div>
                        ) : (
                          <Text
                            variant="caption"
                            css={{
                              color: '#555',
                              fontSize: '0.75rem',
                              textAlign: 'center',
                              marginTop: '0.5rem',
                            }}
                          >
                            Rest day
                          </Text>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Box>
            )}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}