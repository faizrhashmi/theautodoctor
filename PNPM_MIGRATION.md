# pnpm Migration Guide for AskAutoDoctor

## Why We Migrated to pnpm

### Performance Improvements
- **3x faster** dependency installation
- **70% less disk space** usage (shared global store)
- **Faster CI/CD** builds
- **Strict mode** catches phantom dependencies

### Before Migration
- npm install: ~60-90 seconds
- node_modules: ~800MB
- package-lock.json: 367KB

### After Migration (Expected)
- pnpm install: ~20-30 seconds
- node_modules: ~300MB (hard links)
- pnpm-lock.yaml: ~200KB

---

## Migration Steps Completed

### ✅ 1. Pre-Migration Backup
```bash
git commit -m "Pre-pnpm migration checkpoint"
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup
```

### ✅ 2. Configuration Created
- `.npmrc` - pnpm configuration with Next.js optimizations
- Updated `package.json` scripts (npm → pnpm)
- Added `postinstall` script for automatic deduplication

### 🔄 3. Install pnpm & Migrate (Run These Commands)
```bash
# Install pnpm globally
npm install -g pnpm

# Clean old npm artifacts
rm -rf node_modules package-lock.json

# Import from package-lock.json (preserves versions)
pnpm import

# Install with pnpm
pnpm install

# Verify installation
pnpm list --depth 0
```

### 🔄 4. Test Your Setup
```bash
# Test dev server
pnpm dev

# Test build
pnpm build

# Run type checking
pnpm typecheck

# Run tests
pnpm test
```

---

## Command Reference: npm → pnpm

| npm command | pnpm equivalent |
|-------------|----------------|
| `npm install` | `pnpm install` |
| `npm install <pkg>` | `pnpm add <pkg>` |
| `npm install -D <pkg>` | `pnpm add -D <pkg>` |
| `npm uninstall <pkg>` | `pnpm remove <pkg>` |
| `npm run <script>` | `pnpm <script>` or `pnpm run <script>` |
| `npm update` | `pnpm update` |
| `npm outdated` | `pnpm outdated` |
| `npx <command>` | `pnpm dlx <command>` or `pnpm exec <command>` |

---

## New Commands Available

```bash
# Update all dependencies to latest (respects semver)
pnpm update

# Update specific package
pnpm update next

# Check for outdated packages
pnpm outdated

# Remove duplicate dependencies (auto-runs on install)
pnpm dedupe

# Prune unreferenced packages
pnpm prune

# Why is this package in my node_modules?
pnpm why <package-name>

# Rebuild all packages
pnpm rebuild
```

---

## VSCode Integration

Add to `.vscode/settings.json`:
```json
{
  "npm.packageManager": "pnpm",
  "typescript.tsdk": "node_modules/typescript/lib",
  "search.exclude": {
    "**/node_modules": true,
    "**/.pnpm-store": true
  }
}
```

---

## CI/CD Updates Needed

### GitHub Actions
```yaml
- name: Setup pnpm
  uses: pnpm/action-setup@v2
  with:
    version: 8

- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'pnpm'

- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

### Vercel
Vercel automatically detects pnpm via `pnpm-lock.yaml` - no config needed!

---

## Common Issues & Solutions

### Issue: "Cannot find module X"
**Solution:** Some packages need hoisting
```bash
# Add to .npmrc
public-hoist-pattern[]=<package-name>
```

### Issue: Peer dependency warnings
**Solution:** Already configured in `.npmrc`
```ini
strict-peer-dependencies=false
auto-install-peers=true
```

### Issue: ESLint/Prettier not found
**Solution:** Already hoisted in `.npmrc`
```ini
public-hoist-pattern[]=*eslint*
public-hoist-pattern[]=*prettier*
```

### Issue: Slow install on Windows
**Solution:** Enable symlinks (run as Admin)
```powershell
git config --global core.symlinks true
```

---

## Performance Tips

### 1. Use Frozen Lockfile in CI
```bash
pnpm install --frozen-lockfile  # Don't update lockfile
```

### 2. Clean Cache Periodically
```bash
pnpm store prune  # Remove unreferenced packages
```

### 3. Enable Turbo Mode for Next.js
```bash
pnpm dev:turbo  # Already configured in package.json
```

### 4. Use Workspace for Monorepo (Future)
Create `pnpm-workspace.yaml`:
```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

---

## Rollback Plan (If Needed)

```bash
# 1. Restore npm files
rm -rf node_modules pnpm-lock.yaml
cp package-lock.json.backup package-lock.json
cp package.json.backup package.json

# 2. Reinstall with npm
npm install

# 3. Revert scripts in package.json
# (manually change pnpm → npm in scripts)
```

---

## Verification Checklist

- [ ] pnpm installed globally (`pnpm --version`)
- [ ] Dependencies installed (`pnpm-lock.yaml` exists)
- [ ] Dev server works (`pnpm dev`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Tests pass (`pnpm test`)
- [ ] Vercel deployment works (auto-detects pnpm)
- [ ] Team members informed about pnpm usage

---

## Team Communication

**Update team:**
> "We've migrated to pnpm for faster development. Please run:
> 1. `npm install -g pnpm`
> 2. `rm -rf node_modules`
> 3. `pnpm install`
>
> See PNPM_MIGRATION.md for full details."

---

## References

- [pnpm Documentation](https://pnpm.io/)
- [pnpm vs npm Speed Comparison](https://pnpm.io/benchmarks)
- [Next.js with pnpm](https://nextjs.org/docs/advanced-features/using-pnpm)
- [Vercel pnpm Support](https://vercel.com/docs/deployments/configure-a-build#package-managers)
