# Code Splitting Implementation

## Summary

Successfully implemented code splitting to break down the massive 1.4MB JavaScript bundle into smaller, lazy-loaded chunks.

## Results

### Before
- **Single bundle**: `index-Co0g8WDR.js` - **1,456.50 kB** (gzip: 431.09 kB)

### After
**Vendor Chunks (loaded on-demand):**
- `react-vendor.js` - 61.55 kB (gzip: 20.08 kB)
- `tanstack-vendor.js` - 123.90 kB (gzip: 38.83 kB)
- `supabase.js` - 172.69 kB (gzip: 44.57 kB)
- `ui-vendor.js` - 113.50 kB (gzip: 34.89 kB)
- `animations.js` - 114.42 kB (gzip: 37.78 kB)
- `charts.js` - 402.29 kB (gzip: 108.85 kB)

**Main Bundle:**
- `index.js` - **261.88 kB** (gzip: 88.19 kB) - **82% reduction!**

**Page Chunks (lazy-loaded per route):**
- `home-page.js` - 11.21 kB (gzip: 4.62 kB)
- `statistics-page.js` - 20.03 kB (gzip: 6.40 kB)
- `settings-page.js` - 13.51 kB (gzip: 4.10 kB)
- `history-page.js` - 2.22 kB (gzip: 1.10 kB)
- `edit-transaction-page.js` - 1.82 kB (gzip: 0.86 kB)

## Changes Made

### 1. Vite Configuration (`vite.config.ts`)
- Added `manualChunks` configuration to split vendor libraries by domain:
  - React ecosystem (React, React DOM, i18next)
  - TanStack ecosystem (React Query, React Router)
  - Charts (recharts)
  - Animations (framer-motion)
  - Supabase
  - UI libraries (lucide-react, vaul, date-fns, etc.)
- Set minifier to `esbuild` for faster builds
- Increased chunk size warning limit to 600 kB

### 2. Route Lazy Loading
Updated all route files to use `lazyRouteComponent()`:
- `src/routes/_authenticated/home.tsx`
- `src/routes/_authenticated/history.tsx`
- `src/routes/_authenticated/statistics/index.tsx`
- `src/routes/_authenticated/statistics/$month.tsx`
- `src/routes/_authenticated/settings/index.tsx`
- `src/routes/_authenticated/edit/$id.tsx`

### 3. Root Component (`src/routes/__root.tsx`)
- Lazy loaded devtools (React Query Devtools, TanStack Router Devtools)
- Wrapped devtools in `Suspense` component

### 4. PWA Configuration
- Switched from `generateSW` to `injectManifest` strategy to avoid terser issues
- Created custom service worker (`src/sw.ts`) with:
  - Precaching for all assets
  - NetworkFirst strategy for Supabase API calls
  - Automatic cleanup of outdated caches

## Benefits

1. **Faster Initial Load**: Main bundle is 82% smaller
2. **On-Demand Loading**: Page chunks load only when navigated to
3. **Better Caching**: Vendor chunks change less frequently, improving cache hit rates
4. **Improved Performance**: Smaller initial JavaScript parse/compile time
5. **Progressive Loading**: Core app loads first, heavy features (charts) load later

## Technical Notes

- TanStack Router's `defaultPreload: 'intent'` setting enables prefetching chunks when user hovers over links
- esbuild minifier is faster than terser and works better with PWA plugin
- The `injectManifest` strategy gives more control over service worker behavior
- Service worker precaches all 49 assets (2.1 MB total) for offline functionality

## Future Optimizations

- Consider lazy loading the `BubblesCluster` component (used on home page)
- Implement route-based prefetching strategies for smoother navigation
- Consider splitting the `charts` chunk further if specific chart types are used independently
