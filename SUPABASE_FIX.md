# Supabase API Fix

## Problem
After the migration to TanStack Router, Supabase API calls stopped working. The UI loaded but no data was being fetched from the database.

## Root Cause
During the migration, the authentication initialization logic was removed from `App.tsx` but was not properly restored in the new router architecture. Without authentication, the Supabase client didn't have a valid session, causing all API calls to fail silently.

## Solution

### 1. Restored Authentication in Root Route
Moved the entire authentication flow from the old `App.tsx` to `src/routes/__root.tsx`:

```tsx
// src/routes/__root.tsx
function RootComponent() {
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const { loadProfile, loadSettings, loadCurrencies } = useUserStore();
  
  useEffect(() => {
    const initAuth = async () => {
      // Telegram WebApp initialization
      // Dev mode setup with mock Telegram WebApp
      // Call authenticateWithTelegram()
      // Set user session in Supabase
      // Load user data globally
    };
    
    initAuth();
  }, []);
  
  // Show loading spinner while authenticating
  // Show error if auth fails
  // Render app once authenticated
}
```

### 2. Updated Statistics Page to Use TanStack Query
The statistics page was updated to use the new TanStack Query hooks instead of Zustand store methods:

**Before:**
```tsx
const { transactions, loadTransactions } = useTransactionStore();
const { loadCategories } = useCategoryStore();

useEffect(() => {
  loadTransactions(selectedDate);
  loadCategories();
}, [selectedDate]);
```

**After:**
```tsx
// Fetch data with TanStack Query
const { data: transactionsData = [] } = useMonthTransactions(selectedDate);
const { data: expenseCategories = [] } = useExpenseCategories();

// Convert query data to expected format
const transactions = useMemo(() => {
  return transactionsData.map((t: any) => ({
    ...t,
    categories: t.category_id ? {
      id: t.category_id,
      name: expenseCategories.find((c: any) => c.id === t.category_id)?.label || 'Unknown',
      color: expenseCategories.find((c: any) => c.id === t.category_id)?.color || '#000',
      icon: expenseCategories.find((c: any) => c.id === t.category_id)?.icon,
    } : null,
  }));
}, [transactionsData, expenseCategories]);
```

Benefits of TanStack Query:
- ✅ Automatic caching
- ✅ Background refetching
- ✅ Loading states
- ✅ Error handling
- ✅ Optimistic updates
- ✅ Automatic query invalidation after mutations

### 3. Authentication Flow
The complete authentication flow now works as follows:

1. **Root Component Mounts** → Start authentication
2. **Check Telegram WebApp** → Verify app is running in Telegram (or dev mode)
3. **Mock Telegram in Dev Mode** → Set up mock WebApp object for development
4. **Call Auth Function** → Invoke Supabase Edge Function `auth-telegram`
5. **Set Supabase Session** → Store access and refresh tokens
6. **Load User Data** → Load profile, settings, and currencies
7. **Set Local Storage** → Store user info for offline access
8. **Render App** → Show authenticated routes

### 4. What's Still Using Zustand Stores

Some components still use Zustand stores, which is intentional:

**Home Page** - Uses `useTransactionStore` for complex month-based caching with swipe gestures. This is fine because:
- It has sophisticated caching logic for 3 months (prev, current, next)
- Handles swipe animations between months
- The store methods call Supabase directly with proper authentication

**Category Store** - Used for category lookups and transformations:
- `loadCategories()` - Loads categories from Supabase
- `getCategoryById()` - Quick lookup helper
- Transform methods for UI format

These stores work fine because they directly call the Supabase client, which now has a valid session.

## Testing

After the fix, you should see:
1. ✅ Loading spinner during authentication
2. ✅ User profile loaded
3. ✅ Transactions displayed on home page
4. ✅ Statistics page showing data
5. ✅ Charts rendering with actual data
6. ✅ Categories loading properly

## Dev Mode

In development mode (when not running in Telegram):
1. Mock Telegram WebApp object is created
2. Press `Cmd/Ctrl+S` to trigger settings button
3. Auth uses `env.devInitData` for authentication

## What Changed

### Files Modified
- ✅ `src/routes/__root.tsx` - Added authentication logic
- ✅ `src/pages/statistics-page.tsx` - Using TanStack Query hooks
- ✅ `src/pages/home-page.tsx` - Still uses store (intentional for caching)
- ✅ `src/pages/history-page.tsx` - Uses TanStack Query for mutations

### Files Created (from previous migration)
- `src/hooks/use-transactions-query.ts` - TanStack Query hooks
- `src/hooks/use-categories-query.ts` - Category query hooks
- `src/hooks/use-settings-query.ts` - Settings query hook

## Next Steps (Optional Improvements)

1. **Migrate Home Page to TanStack Query** - Replace month caching with `useQueries` for parallel fetching
2. **Add Loading States** - Show skeletons during data fetching
3. **Error Boundaries** - Add error handling for failed queries
4. **Optimistic Updates** - Implement for better UX when adding transactions
5. **Prefetching** - Prefetch adjacent months on hover/focus

## Summary

✅ **Fixed**: Authentication now properly initializes in root route  
✅ **Fixed**: Supabase client has valid session for API calls  
✅ **Improved**: Statistics page uses modern TanStack Query  
✅ **Working**: All stores that call Supabase directly now work  
✅ **Result**: Data loads properly throughout the application  

The app should now work exactly as before, with the added benefits of React 19, TanStack Router, and TanStack Query!
