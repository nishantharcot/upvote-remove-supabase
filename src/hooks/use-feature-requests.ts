import { useState, useEffect, useCallback } from 'react';
import { listFeatureRequests, type FeatureRequestDto } from '@/server/functions/feature-requests';
import type { VoteState } from '@/components/board/UpvoteButton';

export type FeatureRequest = FeatureRequestDto;

interface UseFeatureRequestsOptions {
  statusFilter?: string | null;
  categoryFilter?: string | null;
  searchQuery?: string;
  sortBy?: 'votes' | 'date';
  userId?: string | null;
  enabled?: boolean;
}

export function useFeatureRequests(options: UseFeatureRequestsOptions = {}) {
  const { statusFilter, categoryFilter, searchQuery, sortBy = 'votes', enabled = true } = options;
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await listFeatureRequests({
        data: { statusFilter, categoryFilter, searchQuery, sortBy },
      });
      setRequests(data);
    } catch {
      setRequests([]);
    }
    setIsLoading(false);
  }, [statusFilter, categoryFilter, searchQuery, sortBy, enabled]);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 10_000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  return { requests, isLoading, refetch: fetchRequests };
}
