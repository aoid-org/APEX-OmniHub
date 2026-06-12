// Root-package stub; tests mock this via vi.mock('@/lib/useAuth')
export function useAuth(): { session: { user: { id: string } | null } | null; user: { id: string } | null; isLoading: boolean; isAuthenticated: boolean; loading: boolean; } {
  return { session: null, user: null, isLoading: false, isAuthenticated: false, loading: false };
}
