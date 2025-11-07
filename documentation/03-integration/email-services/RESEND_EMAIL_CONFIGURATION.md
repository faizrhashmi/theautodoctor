# Resend Email Configuration

## Overview
Configuration of Resend.com email service for sending authentication emails from the Auto Doctor platform. This integration enables automated email verification during customer signup with custom domain support.

## Date Implemented
2025-01-07

## Service Details
- **Provider:** Resend.com
- **Purpose:** Transactional emails (email verification, password reset)
- **Domain:** askautodoctor.com
- **Verified:** Yes

## Initial Setup Issue

### Problem: Domain Not Verified Error
When attempting to send emails using `noreply@askautodoctor.com`, received error:

```
The askautodoctor.com domain is not verified. Please, add and verify your domain on https://resend.com/domains.
```

### Root Cause
The domain `askautodoctor.com` was not verified in Resend's system, preventing emails from being sent from that domain.

### Temporary Solution
Used Resend's sandbox domain for testing:

```env
SMTP_USER=resend
SMTP_PASS=[API_KEY]
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_ADMIN_EMAIL=onboarding@resend.dev
```

**Result:** Email successfully received using sandbox address.

### Permanent Solution
User verified the domain `askautodoctor.com` through Resend's domain verification process:

1. Access Resend dashboard at https://resend.com/domains
2. Add domain: `askautodoctor.com`
3. Add required DNS records (SPF, DKIM, DMARC)
4. Wait for DNS propagation (~5-30 minutes)
5. Verify domain status in Resend dashboard

## Supabase SMTP Configuration

### Location
Supabase Dashboard → Project Settings → Authentication → Email Templates → SMTP Settings

### Final Configuration

```plaintext
SMTP Provider: Custom SMTP Server
SMTP Host: smtp.resend.com
SMTP Port: 465
SMTP User: resend
SMTP Password: [Resend API Key]
Sender Email: noreply@askautodoctor.com
Sender Name: Auto Doctor
Enable SMTP: ✓
```

### Environment Variables

```env
# Resend API Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx

# SMTP Configuration for Supabase
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=[same as RESEND_API_KEY]
SMTP_ADMIN_EMAIL=noreply@askautodoctor.com
```

## DNS Records Required

To verify `askautodoctor.com` with Resend, the following DNS records must be configured:

### SPF Record (TXT)
```
Host: @
Type: TXT
Value: v=spf1 include:_spf.resend.com ~all
```

### DKIM Records (CNAME)
```
Host: resend._domainkey
Type: CNAME
Value: [provided by Resend]

Host: resend2._domainkey
Type: CNAME
Value: [provided by Resend]
```

### DMARC Record (TXT)
```
Host: _dmarc
Type: TXT
Value: v=DMARC1; p=none; rua=mailto:dmarc@askautodoctor.com
```

**Note:** Actual values are provided by Resend during domain setup.

## Testing Email Delivery

### Test Process
1. Navigate to signup page
2. Complete signup form with valid email
3. Submit form
4. Check email inbox (including spam folder)
5. Verify email contains confirmation link
6. Click confirmation link

### Expected Email Content
- **From:** Auto Doctor <noreply@askautodoctor.com>
- **Subject:** Confirm Your Email
- **Content:** Email verification link with Supabase auth code

### User Feedback
> "received the email"

Confirmation that email delivery is working after domain verification.

## Email Templates

### Confirmation Email Template
Located in: Supabase Dashboard → Authentication → Email Templates → Confirm Signup

```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your email:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
```

**Note:** Default Supabase template is used. Can be customized with branding if needed.

## Troubleshooting

### Issue: Email Not Received
**Possible Causes:**
1. Domain not verified - check Resend dashboard
2. DNS records not propagated - wait 30 minutes, check with DNS lookup tool
3. SMTP credentials incorrect - verify API key matches
4. Email in spam folder - check spam/junk folders
5. Rate limiting - Resend free tier has sending limits

**Debug Steps:**
```typescript
// Add logging to track email sending
console.log('Sending confirmation email to:', user.email)
console.log('SMTP configured:', {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  from: process.env.SMTP_ADMIN_EMAIL
})
```

### Issue: "Invalid API Key" Error
**Solution:** Regenerate API key in Resend dashboard and update environment variables in both:
- Local `.env.local` file
- Supabase Project Settings → SMTP Settings

### Issue: Emails Going to Spam
**Solutions:**
1. Ensure SPF, DKIM, DMARC records are properly configured
2. Warm up the domain by gradually increasing send volume
3. Add plain text version alongside HTML
4. Avoid spam trigger words in subject/content
5. Monitor sender reputation in Resend dashboard

## Rate Limits

### Resend Free Tier
- 100 emails per day
- 3,000 emails per month
- Verified domains: 1
- Team members: 1

### Resend Pro Tier ($20/month)
- 50,000 emails per month
- Additional emails: $1 per 1,000
- Unlimited verified domains
- Unlimited team members

**Current Status:** Free tier is sufficient for development and initial launch.

## Security Considerations

### API Key Storage
- ✅ Stored in environment variables (`.env.local`)
- ✅ Not committed to version control (`.gitignore`)
- ✅ Rotated regularly (monthly recommended)
- ✅ Used server-side only (not exposed to client)

### Email Validation
- ✅ Email format validation in signup form
- ✅ Rate limiting on signup endpoint (prevent spam)
- ✅ Email verification required before account activation

### Domain Reputation
- Monitor bounce rates in Resend dashboard
- Remove invalid email addresses from sending list
- Implement double opt-in for newsletter subscriptions
- Handle unsubscribe requests immediately

## Related Documentation
- [SIGNUP_FLOW_REDESIGN.md](../../02-feature-documentation/authentication/SIGNUP_FLOW_REDESIGN.md) - Signup form implementation
- [PKCE_EMAIL_CONFIRMATION_ISSUES.md](../../04-troubleshooting/authentication/PKCE_EMAIL_CONFIRMATION_ISSUES.md) - Email confirmation flow issues

## Migration from Default Supabase Emails

### Before (Supabase Default)
- Emails sent from Supabase infrastructure
- Generic sender address
- Limited customization
- Lower deliverability rates

### After (Resend + Custom Domain)
- Emails sent from verified custom domain
- Branded sender address (noreply@askautodoctor.com)
- Full template control
- Higher deliverability and trust

## Monitoring & Analytics

### Resend Dashboard Metrics
- **Delivered:** Emails successfully delivered
- **Bounced:** Invalid email addresses
- **Opened:** Email open tracking (if enabled)
- **Clicked:** Link click tracking

### Access Dashboard
https://resend.com/dashboard

**Recommended Monitoring:**
- Check daily send volume vs limits
- Monitor bounce rate (should be <5%)
- Review spam complaints (should be <0.1%)
- Track delivery time (should be <5 seconds)

## Next Steps

### Production Readiness Checklist
- [x] Domain verified in Resend
- [x] DNS records configured
- [x] SMTP settings updated in Supabase
- [x] Test email received successfully
- [ ] Set up email templates with branding
- [ ] Configure password reset emails
- [ ] Set up monitoring alerts for deliverability issues
- [ ] Document upgrade path to Pro tier if needed
- [ ] Set up backup SMTP provider (e.g., SendGrid) for redundancy

### Future Enhancements
1. **Custom Email Templates:** Design branded HTML templates with Auto Doctor logo and colors
2. **Transactional Email Types:**
   - Welcome email after signup
   - Session confirmation
   - Session reminder (1 hour before)
   - Receipt/invoice after payment
   - Password reset
3. **Analytics Integration:** Track email engagement metrics in admin dashboard
4. **A/B Testing:** Test different subject lines and content for better open rates
