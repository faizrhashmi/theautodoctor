# G2: Integration Tests

## Setup

This directory contains Playwright tests for the session management system.

### Prerequisites

```bash
npm install -D @playwright/test
npx playwright install
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npx playwright test tests/session-races.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run in debug mode
npx playwright test --debug
```

## Test Coverage

### 1. Race Conditions
- **Two mechanics accept same request** - Verifies atomic accept endpoint prevents double assignment
- **Concurrent API requests** - Tests database-level race condition handling

### 2. FSM Validation
- **Illegal state transitions** - Verifies 409 errors for invalid state changes
- **Legal state transitions** - Ensures valid transitions succeed

### 3. Session Lifecycle
- **Accept hydrates sessionId** - Confirms Start button becomes enabled after accept
- **Cleanup releases mechanic** - Tests timeout-based cleanup and reassignment

## Test Data Setup

For local testing, you'll need:

1. **Test Database** - Separate Supabase project or local PostgreSQL instance
2. **Test Users** - At least 2 mechanic accounts
3. **Test Requests** - Sample session requests in 'pending' status

### Environment Variables

Create `.env.test`:

```env
BASE_URL=http://localhost:3000
TEST_MECHANIC_1_EMAIL=mechanic1@test.com
TEST_MECHANIC_1_PASSWORD=testpass123
TEST_MECHANIC_2_EMAIL=mechanic2@test.com
TEST_MECHANIC_2_PASSWORD=testpass123
SUPABASE_URL=your-test-supabase-url
SUPABASE_ANON_KEY=your-test-anon-key
```

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/test.yml`:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Acceptance Criteria

✅ Two mechanics accept same request → only one succeeds (409 for loser)
✅ Accept hydrates sessionId → Start button enabled immediately
✅ Cleanup releases mechanic & session; second accept allowed
✅ FSM rejects illegal transitions (returns 409)
✅ CI fails on regressions; green after fixes

## Known Issues

- Tests marked with `test.skip()` require additional setup
- Cleanup tests need manual trigger or time-based setup
- Some tests require database seeding

## Future Improvements

- [ ] Add database seeding utilities
- [ ] Add cleanup trigger via API for testing
- [ ] Add visual regression tests
- [ ] Add load testing for concurrent requests
- [ ] Add E2E tests for payment flows
