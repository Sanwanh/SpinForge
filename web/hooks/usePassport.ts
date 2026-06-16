'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api-fetch';
import { useGameUser } from '@/hooks/useGameUser';

export interface PassportProfile {
  fields: Record<string, unknown> | null;
  profileId: string;
}

/**
 * Session-backed player profile (the DB analogue of the on-chain
 * PlayerProfile: wins/losses/elo/finishes/display_name). Reads `GET /api/profile`.
 * `profile` is null for a signed-in user who has not been onboarded yet, which
 * drives the onboarding banner. Parts/Beys come from `useInventory`; SPARK comes
 * from `useSpark`.
 */
export function usePassport() {
  const { user, isPending: sessionPending } = useGameUser();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [profileId, setProfileId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setProfileId('');
      return;
    }
    setIsLoading(true);
    try {
      const res = await api('/api/profile');
      if (!res.ok) throw new Error(`Profile fetch failed (${res.status})`);
      const data = (await res.json()) as PassportProfile;
      setProfile(data.fields ?? null);
      setProfileId(data.profileId ?? '');
    } catch {
      setProfile(null);
      setProfileId('');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (sessionPending) return;
    void refetch();
  }, [sessionPending, refetch]);

  return { profile, profileId, isLoading: isLoading || sessionPending, refetch };
}

export interface RotorView {
  fields: Record<string, unknown> | null;
  objectId: string;
  objectType: string;
  imageUrl?: string | null;
}

/**
 * Fetch a single rotor (Bey) by object id for the public detail page — works for
 * rotors you don't own (sharing). Reads `GET /api/passport/<id>`.
 */
export function useRotor(rotorId: string) {
  const [rotor, setRotor] = useState<RotorView | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!rotorId) {
      setRotor(null);
      return;
    }
    setIsLoading(true);
    try {
      const res = await api(`/api/passport/${encodeURIComponent(rotorId)}`);
      if (!res.ok) throw new Error(`Rotor fetch failed (${res.status})`);
      setRotor((await res.json()) as RotorView);
    } catch {
      setRotor(null);
    } finally {
      setIsLoading(false);
    }
  }, [rotorId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { rotor, isLoading, refetch };
}
