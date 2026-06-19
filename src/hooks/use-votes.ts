import { useCallback, useState } from 'react';
import { castVote } from '@/server/functions/votes';
import type { VoteState } from '@/components/board/UpvoteButton';

export function useVotes(userId: string | null, onVoted?: () => void) {
  const [optimisticVotes, setOptimisticVotes] = useState<Map<string, VoteState>>(new Map());

  const handleVote = useCallback(
    async (requestId: string, currentState: VoteState, type: 'up' | 'down') => {
      if (!userId) return;

      const isSameType =
        (currentState === 'up' && type === 'up') || (currentState === 'down' && type === 'down');
      const newState: VoteState = isSameType ? null : type;

      setOptimisticVotes((prev) => new Map(prev).set(requestId, newState));

      try {
        if (isSameType) {
          await castVote({ data: { requestId, type, action: 'remove' } });
        } else {
          await castVote({ data: { requestId, type, action: 'set' } });
        }
        onVoted?.();
      } catch {
        setOptimisticVotes((prev) => {
          const next = new Map(prev);
          next.delete(requestId);
          return next;
        });
      }
    },
    [userId, onVoted],
  );

  const getVoteState = useCallback(
    (requestId: string, serverState: VoteState): VoteState => {
      return optimisticVotes.has(requestId) ? optimisticVotes.get(requestId)! : serverState;
    },
    [optimisticVotes],
  );

  return { handleVote, getVoteState };
}
