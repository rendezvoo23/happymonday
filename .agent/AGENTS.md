# Agent Rules for React 19 + Bun Project

You are an expert React 19 developer, using TypeScript and the Bun runtime.

## Technical Stack
- **Framework:** React 19 (ensure `use` hook, `ref` as prop, and automatic memoization patterns are used where applicable).
- **Runtime/PM:** Bun (use `bun add`, `bun x`, `bun run` for all terminal commands).
- **Language:** TypeScript (strict mode).

## Code Style & Guidelines
- **Components:** Use functional components with TypeScript interfaces.
- **Hooks:** Use hooks for state and lifecycle. Prefer custom hooks for logic reuse.
- **Styling:** Tailwind CSS (if applicable) or CSS Modules.
- **Structure:** Prefer a modular structure (components, hooks, utils).
- **Performance:** Use `useMemo` and `useCallback` judiciously, but prioritize React 19's automatic improvements.

## TanStack Best Practices

### TanStack Query (React Query)
- **Query Keys:** Use hierarchical arrays for query keys: `['users', userId, 'posts']` for easy invalidation.
- **Custom Hooks:** Wrap queries in custom hooks for reusability: `useUser(id)`, `usePosts()`.
- **Stale Time:** Set appropriate `staleTime` to reduce unnecessary refetches (e.g., 5 minutes for stable data).
- **Error Handling:** Always handle errors with `error` state and provide user feedback.
- **Mutations:** Use `useMutation` with `onSuccess`, `onError`, and automatic invalidation via `queryClient.invalidateQueries()`.
- **Optimistic Updates:** Implement optimistic updates for better UX in mutations.
- **Infinite Queries:** Use `useInfiniteQuery` for paginated data with `getNextPageParam`.
- **Prefetching:** Prefetch data on hover or route changes using `queryClient.prefetchQuery()`.
- **TypeScript:** Always type query results and variables for type safety.

### TanStack Table
- **Column Definitions:** Define columns separately with proper TypeScript types.
- **Memo Columns:** Memoize column definitions to prevent unnecessary re-renders.
- **Sorting & Filtering:** Use built-in sorting and filtering features rather than custom implementations.
- **Virtualization:** Use `@tanstack/react-virtual` for large datasets (>1000 rows).
- **Accessibility:** Ensure proper ARIA labels and keyboard navigation.

### TanStack Router
- **Type Safety:** Use file-based routing with full TypeScript inference.
- **Loaders:** Prefetch data in route loaders for instant navigation.
- **Search Params:** Use validated search params with Zod or similar.
- **Code Splitting:** Lazy load route components for better performance.

### General TanStack Principles
- **DevTools:** Always use TanStack DevTools in development for debugging.
- **Server State:** Treat server state differently from client state—use TanStack Query for server state.
- **Cache Management:** Understand and configure cache time, stale time, and garbage collection.
- **Background Refetching:** Leverage automatic background refetching for fresh data.

## Commands
- **Install:** `bun install`
- **Run Dev:** `bun dev`
- **Build:** `bun run build`

## Interaction
- Before writing code, briefly outline the approach.
- Always check for React 19 breaking changes if refactoring.
