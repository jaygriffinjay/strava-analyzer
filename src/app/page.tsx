'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styled from '@emotion/styled';
import Link from 'next/link';
import { useStravaSync } from '@/hooks/useStravaSyncr';
import { getAuthToken, getActivities } from '@/lib/storage';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #fc4c02 0%, #ff6b35 100%);
  padding: 2rem;
`;

const Content = styled.div`
  text-align: center;
  max-width: 600px;
`;

const Title = styled.h1`
  color: white;
  font-size: 3rem;
  margin: 0 0 1rem 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
`;

const Subtitle = styled.p`
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.25rem;
  margin: 0 0 2rem 0;
`;

const Button = styled(Link)`
  display: inline-block;
  background: white;
  color: #fc4c02;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  text-decoration: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s, box-shadow 0.2s;
  margin: 0.5rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
  }
`;

const SecondaryButton = styled(Link)`
  display: inline-block;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  text-decoration: none;
  border: 2px solid rgba(255, 255, 255, 0.3);
  transition: all 0.2s;
  margin: 0.5rem;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
  }
`;

const StatusBox = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 2rem 0;
  color: white;
`;

const ErrorBox = styled.div`
  background: rgba(211, 47, 47, 0.9);
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  color: white;
`;

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { syncActivities } = useStravaSync();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);

  // Check if user already has data
  useEffect(() => {
    const activities = getActivities();
    setHasData(activities.length > 0);
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      setError(`Auth error: ${error}`);
      return;
    }

    if (token) {
      handleTokenReceived(token);
    }
  }, [searchParams]);

  const handleTokenReceived = async (token: string) => {
    setLoading(true);
    setError(null);

    try {
      await syncActivities(token);
      setHasData(true);
      // Redirect to stats after successful sync
      router.push('/stats');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setError(message);
      setLoading(false);
    }
  };

  const handleConnectStrava = () => {
    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
    if (!clientId) {
      setError('Strava client ID not configured');
      return;
    }

    const redirectUri = `${window.location.origin}/api/auth/strava/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      approval_prompt: 'force',
      scope: 'activity:read_all',
    });

    window.location.href = `https://www.strava.com/oauth/authorize?${params.toString()}`;
  };

  if (loading) {
    return (
      <Container>
        <Content>
          <Title>Syncing...</Title>
          <Subtitle>Fetching your Strava activities</Subtitle>
        </Content>
      </Container>
    );
  }

  return (
    <Container>
      <Content>
        <Title>Strava Analyzer</Title>
        <Subtitle>Better analytics for your running data</Subtitle>

        {error && <ErrorBox>{error}</ErrorBox>}

        {hasData ? (
          <StatusBox>
            <p>You have data synced! View your stats:</p>
            <SecondaryButton href="/stats">
              View Weekly Stats
            </SecondaryButton>
          </StatusBox>
        ) : (
          <StatusBox>
            <p>Connect your Strava account to get started</p>
          </StatusBox>
        )}

        <div style={{ margin: '2rem 0' }}>
          <Button href="#" onClick={e => {
            e.preventDefault();
            handleConnectStrava();
          }}>
            Connect with Strava
          </Button>
        </div>

        {hasData && (
          <div>
            <SecondaryButton href="/stats">
              📈 Weekly Stats
            </SecondaryButton>
          </div>
        )}
      </Content>
    </Container>
  );
}
