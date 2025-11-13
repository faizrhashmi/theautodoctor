# QA Orchestrator

A comprehensive, self-contained QA testing suite for The Auto Doctor platform. This tool orchestrates automated testing including Playwright E2E tests, site crawling, fuzzing, accessibility checks, and reporting.

## Features

- **Automated E2E Testing**: Desktop and mobile Playwright tests covering public, customer, mechanic, and admin flows
- **Site Crawler**: Discovers and validates all links, detecting broken links with referrers
- **Smart Fuzzer**: Tests forms with invalid inputs, captures console errors and network failures
- **Accessibility Audits**: Automated axe-core scans on all pages
- **Console/Network Monitoring**: Captures all JavaScript errors and failed requests
- **Rich Reporting**: HTML and JSON reports with summaries, trends, and details
- **Slack Integration**: Optional webhook notifications with test summaries
- **Safe Integration Stubs**: LiveKit, Stripe, and Supabase helpers that fail gracefully

## Quick Start

### 1. Install Dependencies

```bash
cd qa
pnpm install
```

### 2. Configure Environment

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env.qa
```

Edit `.env.qa` with your test credentials:

```env
QA_START_DEV=1
QA_BASE_URL=http://localhost:3000
QA_CUSTOMER_EMAIL=customer@test.com
QA_CUSTOMER_PASSWORD=testpass123
QA_MECHANIC_EMAIL=mechanic@test.com
QA_MECHANIC_PASSWORD=testpass123
QA_ADMIN_EMAIL=admin@test.com
QA_ADMIN_PASSWORD=testpass123
```

Optional services (tests will skip gracefully if not provided):
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_test_...
LIVEKIT_API_KEY=API...
LIVEKIT_API_SECRET=secret...
QA_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### 3. Record Authentication Sessions

Before running full tests, record authenticated sessions for each user type:

```bash
# Record customer login
pnpm record:customer

# Record mechanic login
pnpm record:mechanic

# Record admin login
pnpm record:admin
```

These commands will open a browser, perform login, and save session state to `fixtures/` for reuse in tests.

### 4. Run QA Orchestrator

Start the dev server automatically and run all QA checks:

```bash
QA_START_DEV=1 pnpm qa
```

Or test against a running instance (staging/production):

```bash
QA_BASE_URL=https://staging.theautodoctor.com pnpm qa
```

Or test against local dev server (already running):

```bash
pnpm qa
```

## Available Scripts

- `pnpm qa` - Run complete QA orchestration (tests, crawler, fuzzer, reports)
- `pnpm test` - Run Playwright tests only
- `pnpm record:customer` - Record customer authentication session
- `pnpm record:mechanic` - Record mechanic authentication session
- `pnpm record:admin` - Record admin authentication session
- `pnpm report:open` - Open the latest Playwright HTML report

## Test Coverage

### Public Routes
- **Home Page** (`/`): Hero visibility, CTA presence, console errors
- **Pricing Page** (`/pricing`): Plan cards rendering, layout validation

### Customer Flow
- Login and authentication
- Vehicle management (add/edit)
- Service intake and waiver acceptance
- Plan selection (Standard 30/60 min)
- Mechanic type selection (Standard/Specialist/Favorite)
- Location search and mechanic listing
- Booking and Stripe payment
- LiveKit video session (join, connect, end)
- Post-session flow

### Mechanic Flow
- Login and dashboard access
- Accept pending session
- Join virtual session
- End session and status updates

### Admin Flow
- Dashboard access
- Session table visibility
- Filters and export functionality

## Reports Location

After running `pnpm qa`, find your reports at:

- **Summary Reports**: `/qa/reports/summary.html` and `/qa/reports/summary.json`
- **Playwright Report**: `/qa/playwright/playwright-report/index.html`
- **Broken Links**: `/qa/reports/broken-links.json`
- **Fuzzer Results**: `/qa/reports/fuzzer.json`
- **Test Results**: `/qa/reports/results.json`

Open the main Playwright report:
```bash
pnpm report:open
```

## Slack Notifications

To enable Slack summaries, set `QA_SLACK_WEBHOOK_URL` in `.env.qa`:

```env
QA_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

The orchestrator will post a concise summary including:
- Total tests run / passed / failed
- Number of broken links found
- Accessibility violations count
- Fuzzer findings
- Link to full reports

## CI/CD Integration

The workflow is configured at `/.github/workflows/qa.yml` and runs automatically on:
- Push to `main` or `staging` branches
- Pull requests to `main` or `staging`
- Manual workflow dispatch

Artifacts are uploaded for 30 days:
- QA reports (HTML/JSON)
- Playwright HTML report
- Test videos (on failure, 7 days)

## Architecture

```
qa/
├── orchestrator/          # Main orchestration logic
│   ├── index.ts          # Entry point, coordinates all QA activities
│   ├── env.ts            # Environment validation with Zod
│   ├── crawler.ts        # Link discovery and validation
│   ├── fuzzer.ts         # Form fuzzing and error detection
│   ├── reporter.ts       # Report generation and Slack posting
│   └── utils/
│       └── http.ts       # HTTP utilities
├── playwright/
│   ├── playwright.config.ts
│   ├── specs/            # Test specifications
│   ├── fixtures/         # Auth storage states
│   └── helpers/          # Reusable test utilities
├── scripts/
│   └── ensure-health.ts  # Dev server health check
└── reports/              # Generated reports

```

## Troubleshooting

### Dev server won't start
- Ensure root `package.json` has a `dev` script
- Check port 3000 is available
- Verify root dependencies are installed

### Authentication recording fails
- Verify credentials in `.env.qa`
- Check if your app uses OTP/magic links (may need manual intervention)
- Ensure login routes are correct: `/login`, `/mechanic/login`, `/admin/login`

### Tests timeout or fail
- Increase timeout in `playwright.config.ts` if needed
- Check network connectivity
- Verify app is fully running and healthy
- Review test videos/screenshots in `playwright/test-results/`

### Missing service errors (LiveKit, Stripe, Supabase)
- These are optional; tests will skip gracefully if env vars are not set
- Check console output for "SKIP" messages
- Set respective env vars if you want to test integrations

### Broken links false positives
- Check for dynamic routes or authenticated-only links
- Review `broken-links.json` for referrer context
- Adjust crawler logic if needed for your app's structure

## Customization

### Adding New Tests
Create new spec files in `qa/playwright/specs/` following naming convention:
- `public.*.spec.ts` - Public pages
- `auth.*.setup.spec.ts` - Authentication setup
- `customer.*.spec.ts` - Customer flows
- `mechanic.*.spec.ts` - Mechanic flows
- `admin.*.spec.ts` - Admin flows

### Adjusting Crawler Scope
Edit `qa/orchestrator/crawler.ts` to:
- Add URL exclusions
- Change max depth
- Add custom crawl rules

### Custom Fuzzing Rules
Edit `qa/orchestrator/fuzzer.ts` to:
- Add new form targets
- Define custom input patterns
- Add validation rules

## Best Practices

1. **Run locally before CI**: Always test locally with `pnpm qa` before pushing
2. **Keep credentials secure**: Never commit `.env.qa`, use CI secrets
3. **Review reports regularly**: Check HTML summary for trends
4. **Update fixtures**: Re-record auth sessions if login flow changes
5. **Monitor Slack**: Set up webhook for team visibility

## Support

For issues or questions:
1. Check test videos and screenshots in `playwright/test-results/`
2. Review full Playwright report with `pnpm report:open`
3. Check orchestrator logs for service availability
4. Ensure all env vars in `.env.qa` are correct

## License

Part of The Auto Doctor platform. Internal use only.
