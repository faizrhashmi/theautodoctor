# Admin Scripts

Utility scripts for managing test accounts and development tasks.

## Prerequisites

Make sure you have the following environment variables set in your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Create Test Accounts

### Create Test Mechanic

```bash
npx tsx scripts/create-test-mechanic.ts
```

This creates a mechanic account with:
- **Email:** `test-mechanic@example.com`
- **Password:** `testpass123`
- **Login URL:** `http://localhost:3000/mechanic/login`
- **Status:** Onboarding completed, available for sessions

### Create Test Customer

```bash
npx tsx scripts/create-test-customer.ts
```

This creates a customer account with:
- **Email:** `test-customer@example.com`
- **Password:** `testpass123`
- **Login URL:** `http://localhost:3000/login`

## Testing the Active Session Manager Fix

To test the critical fix for "Your Accepted: 1" showing in the Active Session Manager:

1. **Create test accounts:**
   ```bash
   npx tsx scripts/create-test-mechanic.ts
   npx tsx scripts/create-test-customer.ts
   ```

2. **Start the dev server:**
   ```bash
   npm run dev
   ```

3. **As Customer:**
   - Login at `http://localhost:3000/login`
   - Create a new session request
   - Wait in the video room

4. **As Mechanic:**
   - Login at `http://localhost:3000/mechanic/login`
   - Accept the customer's request
   - You should now see the accepted request in "MY ACTIVE WORK" section
   - The Active Session Manager overlay should be visible

5. **Verify the fix:**
   - Previously: "Your Accepted: 1" showed in debug info but no overlay
   - Now: Accepted request appears in Active Session Manager with customer details

## Notes

- Scripts use Supabase Admin API to create users directly
- Email confirmation is automatically completed
- If a user already exists, the script will update their profile
- These are test accounts only - do NOT use in production
