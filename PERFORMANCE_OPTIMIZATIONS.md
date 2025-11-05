# ⚡ Development Performance Optimizations

## 🚀 Quick Start - FASTEST Development Setup

### 1. Install Dependencies First
```bash
pnpm install
```

### 2. Start Ultra-Fast Dev Server
```bash
pnpm dev
```
This now uses **Turbopack** by default with 4GB memory allocation!

---

## 📊 Available Dev Commands

| Command | Speed | Use Case |
|---------|-------|----------|
| `pnpm dev` | ⚡⚡⚡ **FASTEST** | Default - Turbopack with optimizations |
| `pnpm dev:fast` | ⚡⚡⚡ **FASTEST** | Same as dev, explicit |
| `pnpm dev:webpack` | ⚡⚡ Fast | If Turbopack has issues, fallback to webpack |
| `pnpm dev:clean` | ⚡ Slower | Clean .next cache and restart |

---

## 🔧 What's Been Optimized

### Next.js Config Optimizations
✅ **Turbopack enabled** - 10x faster than webpack
✅ **optimizePackageImports** - Automatic tree-shaking for lucide-react, date-fns, framer-motion
✅ **On-demand entries** - Only compiles pages you visit (2 page buffer)
✅ **Filesystem caching** - Faster rebuilds with gzip compression
✅ **Source maps optimized** - Using `eval-cheap-module-source-map` for speed
✅ **Split chunks disabled** - Faster initial compilation in dev
✅ **TypeScript checks skipped** - Run `pnpm typecheck` separately
✅ **ESLint skipped in builds** - Run `pnpm lint` separately

### Memory & Performance
✅ **4GB heap size** - Prevents memory issues with large apps
✅ **Faster module resolution** - Symlinks disabled
✅ **Watch optimizations** - Ignores node_modules, .git, .next
✅ **Aggregated file watching** - 300ms debounce

---

## 💡 Pro Tips for Maximum Speed

### 1. **Use Turbopack (Already Default)**
Turbopack is enabled by default with `pnpm dev`. It's 10x faster than webpack for most operations.

### 2. **Keep .next Cache**
Don't delete `.next/` unless absolutely necessary. The filesystem cache makes rebuilds instant.

### 3. **Parallel Type Checking**
Run typecheck in a separate terminal while developing:
```bash
# Terminal 1
pnpm dev

# Terminal 2
pnpm typecheck --watch
```

### 4. **Restart Dev Server Periodically**
If you notice slowdown after many hot reloads, restart the dev server:
```bash
# Press Ctrl+C, then
pnpm dev
```

### 5. **Check Memory Usage**
If you see "JavaScript heap out of memory" errors:
- Current allocation: 4GB (default in scripts)
- Increase if needed by editing `package.json` scripts
- Change `--max-old-space-size=4096` to `8192` for 8GB

### 6. **Use Focused Imports**
Instead of:
```typescript
import { User, Mail, Phone } from 'lucide-react' // Slow
```

The config now auto-optimizes this! But if you want to be explicit:
```typescript
import User from 'lucide-react/dist/esm/icons/user' // Fast (manual)
```

### 7. **Selective Page Loading**
With `pagesBufferLength: 2`, only your current page + 1 previous page stay compiled.
Navigate to only the pages you're working on.

### 8. **Clean Build When Switching Branches**
```bash
pnpm dev:clean
```

---

## 🐛 Troubleshooting

### Dev server is still slow
1. **Check if Turbopack is running:**
   ```
   Look for "○ Compiling with Turbopack..." in console
   ```

2. **Clear all caches:**
   ```bash
   rm -rf .next node_modules/.cache
   pnpm install
   pnpm dev:clean
   ```

3. **Check for heavy API routes:**
   - API routes in `/app/api/` run on every request
   - Add caching if database queries are slow
   - Use `export const dynamic = 'force-dynamic'` sparingly

4. **Disable browser extensions:**
   - React DevTools can slow down hot reload
   - Disable during intensive development

5. **Check antivirus:**
   - Windows Defender can slow down file watching
   - Add `.next/` folder to exclusions

### Turbopack errors?
If Turbopack has compatibility issues:
```bash
pnpm dev:webpack
```

### Memory issues?
Increase memory allocation in `package.json`:
```json
"dev": "cross-env NODE_OPTIONS='--max-old-space-size=8192' next dev --turbo"
```

---

## 📈 Expected Performance

### First Start (Cold)
- **Turbopack**: ~3-8 seconds
- **Webpack**: ~10-20 seconds

### Hot Reload (After Changes)
- **Turbopack**: ~100-500ms
- **Webpack**: ~1-3 seconds

### Full Page Compilation
- **Turbopack**: ~200ms-1s
- **Webpack**: ~2-5 seconds

---

## 🎯 Optimization Checklist

- [x] Turbopack enabled by default
- [x] Memory allocation increased (4GB)
- [x] Package imports optimized (lucide-react, date-fns)
- [x] On-demand page compilation
- [x] Source map optimization
- [x] File watching optimized
- [x] TypeScript/ESLint moved to separate process
- [x] Filesystem caching with gzip
- [x] Split chunks disabled in dev
- [x] Module resolution optimized

---

## 🚀 Next Steps

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start developing:**
   ```bash
   pnpm dev
   ```

3. **Enjoy blazing fast HMR!** 🔥

---

**Need even more speed?** Consider:
- Using SSD for project storage (if on HDD)
- Closing heavy applications while developing
- Using Windows WSL2 on Windows (sometimes faster)
- Upgrading to 16GB+ RAM if you have less
