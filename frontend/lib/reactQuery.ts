import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  getReplies, postReply, Reply, 
  listConfessions, getStats, getLeaderboard, getTicker, postConfession,
  Confession, WallStats, TickerResponse, ConfessionsResponse
} from './api';

/**
 * Infinite query for fetching replies of a confession with pagination.
 */
export function useConfessionReplies(confessionId: string) {
  return useInfiniteQuery({
    queryKey: ['replies', confessionId],
    queryFn: async ({ pageParam = 1 }) => {
      const data = await getReplies(confessionId, pageParam as number, 20);
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 20 ? allPages.length + 1 : undefined;
    },
  });
}

/**
 * Mutation for posting a new reply and invalidating the replies query.
 */
export function usePostReply(confessionId: string, token?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { body: string; displayName: string }) =>
      postReply(confessionId, payload.body, payload.displayName, token ?? ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['replies', confessionId] });
    },
  });
}

/**
 * Query for fetching confessions with pagination.
 */
export function useConfessions(sort: "new" | "cringe", page: number) {
  return useQuery({
    queryKey: ['confessions', sort, page],
    queryFn: () => listConfessions(sort, page, 10),
  });
}

/**
 * Query for wall stats.
 */
export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => getStats(),
  });
}

/**
 * Query for leaderboard.
 */
export function useLeaderboard(limit = 3) {
  return useQuery({
    queryKey: ['leaderboard', limit],
    queryFn: () => getLeaderboard(limit),
  });
}

/**
 * Query for ticker with auto refetch every 30s.
 */
export function useTicker() {
  return useQuery({
    queryKey: ['ticker'],
    queryFn: () => getTicker(),
    refetchInterval: 30000,
  });
}

/**
 * Mutation for posting a new confession.
 */
export function usePostConfession(token?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => postConfession(payload, token),
    onSuccess: () => {
      // Invalidate multiple queries so the UI updates instantly
      queryClient.invalidateQueries({ queryKey: ['confessions'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['ticker'] });
    },
  });
}
