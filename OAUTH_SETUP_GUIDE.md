# OAuth Social Login Setup Guide

## Prerequisites
- Supabase project access
- Access to Google Cloud Console, Facebook Developers, and Apple Developer Portal

---

## 1. Google OAuth Setup

### A. Create Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Authorized redirect URIs:
   ```
   https://<your-supabase-project>.supabase.co/auth/v1/callback
   http://localhost:54321/auth/v1/callback (for local development)
   ```
7. Save your **Client ID** and **Client Secret**

### B. Configure in Supabase
1. Go to **Authentication** → **Providers** → **Google**
2. Enable Google provider
3. Paste **Client ID** and **Client Secret**
4. (Optional) Add additional scopes: `email profile`

---

## 2. Facebook OAuth Setup

### A. Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app (Type: **Consumer**)
3. Add **Facebook Login** product
4. In **Facebook Login Settings**:
   - Valid OAuth Redirect URIs:
   ```
   https://<your-supabase-project>.supabase.co/auth/v1/callback
   http://localhost:54321/auth/v1/callback
   ```
5. Copy your **App ID** and **App Secret** from Settings → Basic

### B. Configure in Supabase
1. Go to **Authentication** → **Providers** → **Facebook**
2. Enable Facebook provider
3. Paste **App ID** as Client ID
4. Paste **App Secret** as Client Secret

---

## 3. Apple (iCloud) OAuth Setup

### A. Create Apple Sign In Service
1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. **Certificates, Identifiers & Profiles** → **Identifiers** → **+**
3. Select **Services IDs** → Continue
4. Description: "YourApp Sign In"
5. Identifier: `com.yourcompany.yourapp.signin`
6. Enable **Sign In with Apple**
7. Configure:
   - Primary App ID: Your main app ID
   - Domains and Subdomains: `<your-supabase-project>.supabase.co`
   - Return URLs:
   ```
   https://<your-supabase-project>.supabase.co/auth/v1/callback
   ```

### B. Create Key for Apple Sign In
1. **Keys** → **+**
2. Key Name: "Sign In with Apple Key"
3. Enable **Sign In with Apple**
4. Configure with your Services ID
5. Download the `.p8` key file (you can only download once!)
6. Note your **Team ID** and **Key ID**

### C. Configure in Supabase
1. Go to **Authentication** → **Providers** → **Apple**
2. Enable Apple provider
3. **Client ID**: Your Services ID (e.g., `com.yourcompany.yourapp.signin`)
4. **Secret Key**: Paste contents of your `.p8` file
5. **Key ID**: From Apple Developer Portal
6. **Team ID**: From Apple Developer Portal

---

## 4. Environment Variables

Add to your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OAuth Redirect URLs
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_REDIRECT_URL=http://localhost:3000/auth/callback
```

For production, update in Vercel/hosting:
```bash
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_REDIRECT_URL=https://yourdomain.com/auth/callback
```

---

## 5. Testing

### Google:
- Should show Google account picker
- Verifies email automatically
- Returns name and email

### Facebook:
- Shows Facebook login dialog
- Requests email permission
- Returns name and email

### Apple:
- Shows "Sign in with Apple" modal
- User can hide email (Apple creates relay email)
- Returns name (first time only) and email

---

## 6. Production Checklist

- [ ] Add production redirect URLs to all OAuth providers
- [ ] Update `.env.production` with correct URLs
- [ ] Test each provider in production
- [ ] Add error handling for declined permissions
- [ ] Handle email verification if required
- [ ] Test on mobile devices (especially Apple)
- [ ] Add analytics tracking for social signups

---

## Troubleshooting

### "Redirect URI mismatch"
- Check that redirect URI in provider matches exactly (including https://)
- Verify Supabase project URL is correct

### "Invalid client secret"
- Regenerate secrets in provider dashboard
- Update in Supabase

### Apple: "invalid_client"
- Verify Services ID matches Client ID
- Check that .p8 key is valid
- Ensure Team ID and Key ID are correct

### Users not being created
- Check Supabase Auth logs
- Verify RLS policies allow profile creation
- Check that profiles table trigger is working
