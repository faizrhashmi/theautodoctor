# OAuth Setup Guide - Google & Facebook Authentication

## Overview

This guide will help you configure Google and Facebook OAuth authentication for your application. You already have the Google credentials in your `.env.local` file.

## Current Status

✅ Google credentials added to `.env.local`
✅ Social auth buttons integrated in login page
✅ Social auth buttons integrated in signup page
✅ Auth callback handler configured
⚠️ Supabase OAuth configuration needed

---

## Step 1: Configure Google OAuth in Supabase

### 1.1 Go to Supabase Dashboard

1. Open your browser and go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: `qtkouemogsymqrzkysar`
3. Go to **Authentication** → **Providers**

### 1.2 Enable Google Provider

1. Find **Google** in the list of providers
2. Toggle it **ON**
3. Enter the following credentials (already in your .env.local):

   ```
   Client ID: 112810099485-nh0l562kfb4t2j0ho3i0frt33did43ec.apps.googleusercontent.com
   Client Secret: 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
   ```

4. Set the **Redirect URL** (Copy this exactly):
   ```
   https://qtkouemogsymqrzkysar.supabase.co/auth/v1/callback
   ```

5. Click **Save**

### 1.3 Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Under **Authorized redirect URIs**, add:
   ```
   https://qtkouemogsymqrzkysar.supabase.co/auth/v1/callback
   ```
6. For local development, also add:
   ```
   http://localhost:3000/auth/callback
   ```
7. Click **Save**

---

## Step 2: Configure Facebook OAuth (Optional)

### 2.1 Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **My Apps** → **Create App**
3. Select **Consumer** as app type
4. Fill in the app details and create the app

### 2.2 Get Facebook Credentials

1. In your app dashboard, go to **Settings** → **Basic**
2. Copy the **App ID** and **App Secret**
3. Add them to your `.env.local` file:
   ```bash
   FACEBOOK_CLIENT_ID=your_app_id_here
   FACEBOOK_CLIENT_SECRET=your_app_secret_here
   ```

### 2.3 Configure Facebook OAuth in Supabase

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Find **Facebook** and toggle it **ON**
3. Enter your Facebook App ID and App Secret
4. Click **Save**

### 2.4 Configure Facebook App Settings

1. In Facebook Developer Console, go to **Facebook Login** → **Settings**
2. Under **Valid OAuth Redirect URIs**, add:
   ```
   https://qtkouemogsymqrzkysar.supabase.co/auth/v1/callback
   ```
3. For local development, also add:
   ```
   http://localhost:3000/auth/callback
   ```
4. Click **Save Changes**

---

## Step 3: Test the Integration

### 3.1 Start Your Development Server

```bash
npm run dev
```

### 3.2 Test Google Login

1. Navigate to `http://localhost:3000/login`
2. You should see Google, Facebook, and Apple auth buttons
3. Click the **Google** button
4. You should be redirected to Google's login page
5. After authentication, you should be redirected back to your app at `/customer/dashboard`

### 3.3 Test Facebook Login (if configured)

1. Navigate to `http://localhost:3000/login`
2. Click the **Facebook** button
3. Authenticate with Facebook
4. You should be redirected back to your app

---

## Troubleshooting

### Google OAuth Issues

**Error: redirect_uri_mismatch**
- Make sure the redirect URI in Google Cloud Console matches exactly:
  `https://qtkouemogsymqrzkysar.supabase.co/auth/v1/callback`

**Error: Access blocked**
- Your app might need to be verified by Google if you're using sensitive scopes
- For development, add test users in Google Cloud Console

### Facebook OAuth Issues

**Error: URL Blocked**
- Make sure the redirect URI is added to Facebook app settings
- Check that your app is not in development mode for production use

### General Issues

**Users not being created in database**
- Check the [src/app/auth/callback/route.ts](src/app/auth/callback/route.ts) file for any errors
- Check Supabase logs in the dashboard

**Redirect not working**
- Make sure your `NEXT_PUBLIC_APP_URL` in `.env.local` is set correctly
- Check browser console for errors

---

## Important URLs

### Development
- Login: `http://localhost:3000/login`
- Signup: `http://localhost:3000/signup`
- Auth Callback: `http://localhost:3000/auth/callback`

### Production
- Supabase Project: `https://qtkouemogsymqrzkysar.supabase.co`
- Auth Callback: `https://qtkouemogsymqrzkysar.supabase.co/auth/v1/callback`

---

## Files Modified

1. [src/app/login/page.tsx](src/app/login/page.tsx) - Added Google/Facebook auth buttons
2. [src/components/auth/SocialAuthButtons.tsx](src/components/auth/SocialAuthButtons.tsx) - Social auth component (already existed)
3. [src/app/auth/callback/route.ts](src/app/auth/callback/route.ts) - OAuth callback handler (already existed)
4. [src/app/signup/SignupGate.tsx](src/app/signup/SignupGate.tsx) - Already has social auth (no changes needed)

---

## Next Steps

1. ✅ Configure Google OAuth in Supabase Dashboard (use instructions above)
2. Configure Facebook OAuth (optional, if needed)
3. Test the authentication flow
4. Add any custom claims or metadata to user profiles as needed
5. Deploy to production and update OAuth redirect URLs

---

## Support

If you encounter issues:
1. Check Supabase logs in the dashboard
2. Check browser console for JavaScript errors
3. Verify all redirect URLs are configured correctly
4. Ensure environment variables are loaded properly
