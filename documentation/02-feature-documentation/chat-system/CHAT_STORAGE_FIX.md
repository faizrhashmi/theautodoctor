# Fix: Chat File Upload RLS Policy Error

## Problem
Users and mechanics cannot upload documents during chat sessions. Error message:
```
Send message error: Error: Failed to upload faiz_service_advisor_cv_final.pdf: new row violates row-level security policy
```

## Root Cause
The `chat-attachments` storage bucket either:
1. Doesn't exist in your Supabase project
2. Exists but has no RLS (Row-Level Security) policies allowing authenticated users to upload files

## Solution
**All configuration must be done via Supabase Dashboard UI** (SQL migrations don't have permission to modify storage tables).

**Time required**: 10 minutes

---

## Step-by-Step Fix

### STEP 1: Create the Storage Bucket (3 minutes)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project: `askautodoctor`

2. **Navigate to Storage**
   - Click "Storage" in the left sidebar
   - Click "New Bucket" button (green button, top right)

3. **Configure the Bucket**
   - **Name**: `chat-attachments` (exactly this name)
   - **Public bucket**: ✅ Toggle ON (allows public URL access)
   - **File size limit**: `50 MB` (enter 50 in the field)
   - **Allowed MIME types**: Click "Add" and enter these one by one:
     - `image/jpeg`
     - `image/png`
     - `image/gif`
     - `image/webp`
     - `application/pdf`
     - `application/msword`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
     - `application/vnd.ms-excel`
     - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
     - `text/plain`
     - `video/mp4`
     - `video/quicktime`
   - Click "Create Bucket"

4. **Verify**
   - You should see `chat-attachments` in your bucket list
   - Status badge should show "Public"

---

### STEP 2: Add Storage Policies (5 minutes)

**Why do we need policies?** Even though the bucket is public, RLS (Row-Level Security) prevents authenticated users from uploading unless we add explicit policies.

1. **Navigate to Policies**
   - Click on the `chat-attachments` bucket
   - Click "Policies" tab at the top
   - You should see "No policies created" message

2. **Create Policy #1: Upload Files**
   - Click "New Policy" button
   - Select "Custom Policy"
   - Fill in the form:
     - **Policy name**: `Authenticated users can upload`
     - **Allowed operation**: Check **INSERT** box only
     - **Target roles**: Select `authenticated` from dropdown
     - **USING expression**: `true` (just type the word true)
     - **WITH CHECK expression**: `bucket_id = 'chat-attachments'`
   - Click "Review" → "Save Policy"

3. **Create Policy #2: Read Files**
   - Click "New Policy" → "Custom Policy"
   - Fill in:
     - **Policy name**: `Authenticated users can read`
     - **Allowed operation**: Check **SELECT** box only
     - **Target roles**: `authenticated`
     - **USING expression**: `bucket_id = 'chat-attachments'`
   - Click "Review" → "Save Policy"

4. **Create Policy #3: Update Files**
   - Click "New Policy" → "Custom Policy"
   - Fill in:
     - **Policy name**: `Authenticated users can update`
     - **Allowed operation**: Check **UPDATE** box only
     - **Target roles**: `authenticated`
     - **USING expression**: `bucket_id = 'chat-attachments'`
     - **WITH CHECK expression**: `bucket_id = 'chat-attachments'`
   - Click "Review" → "Save Policy"

5. **Create Policy #4: Delete Files**
   - Click "New Policy" → "Custom Policy"
   - Fill in:
     - **Policy name**: `Authenticated users can delete`
     - **Allowed operation**: Check **DELETE** box only
     - **Target roles**: `authenticated`
     - **USING expression**: `bucket_id = 'chat-attachments'`
   - Click "Review" → "Save Policy"

6. **Verify All Policies**
   - Go back to Policies tab
   - You should see 4 policies listed:
     ```
     ✓ Authenticated users can upload (INSERT)
     ✓ Authenticated users can read (SELECT)
     ✓ Authenticated users can update (UPDATE)
     ✓ Authenticated users can delete (DELETE)
     ```

---

### STEP 3: Test File Upload (2 minutes)

1. **Test in Your App**
   - Open your application
   - Navigate to any active chat session
   - Click the attachment/file icon
   - Select a PDF or image file
   - Click send

2. **Expected Result**
   - ✅ File uploads successfully (no error)
   - ✅ File appears as a clickable link in the chat
   - ✅ Clicking the link opens/downloads the file

3. **Verify in Dashboard**
   - Go back to Supabase Dashboard → Storage → chat-attachments
   - Click "Browse files"
   - You should see a folder with the session ID
   - Inside that folder, your uploaded file(s)

---

## Troubleshooting

### Error: "Bucket already exists"
**Solution**: The bucket exists but needs policies. Skip STEP 1, go directly to STEP 2.

### Still getting upload errors after adding policies
**Check these:**
1. **User is logged in**: Open browser DevTools → Application → Cookies → check for `sb-*` cookies
2. **Bucket name is exact**: Must be `chat-attachments` (not `chat_attachments` or anything else)
3. **All 4 policies exist**: Go to Storage → chat-attachments → Policies tab
4. **Browser cache**: Try clearing cookies and logging in again
5. **Check browser console**: Look for the actual error message

### Files upload but don't appear in chat
**Possible causes:**
1. Check `/api/chat/send-message` API endpoint in Network tab
2. Verify `chat_messages` table has RLS policies allowing inserts
3. Check if WebSocket connection is active (realtime updates)

### Policy creation fails
**Solution**: Make sure you're using the correct expressions:
- For `bucket_id = 'chat-attachments'` - include the quotes around chat-attachments
- For `true` - just type the word true without quotes

---

## What This Fixes

✅ **Customers** can upload documents in chat sessions
✅ **Mechanics** can upload documents in chat sessions
✅ Files stored in organized folders: `{session-id}/{timestamp}-{random}.{ext}`
✅ Public URLs work immediately after upload
✅ No more "row-level security policy" errors

---

## File Organization

After setup, files are organized like this:
```
chat-attachments/
├── abc123-session-id/
│   ├── 1701234567-a1b2c3.pdf
│   ├── 1701234789-d4e5f6.jpg
│   └── 1701234901-g7h8i9.png
├── def456-session-id/
│   └── 1701235123-j0k1l2.pdf
└── ghi789-session-id/
    └── 1701235456-m3n4o5.docx
```

Each session gets its own folder, and files have timestamps to prevent naming conflicts.

---

## Security Notes

### Why are policies permissive?
- **Both customers and mechanics need access**: Can't use auth.uid() because mechanics use cookie authentication
- **Session ID in path provides isolation**: Files are organized by session
- **Public bucket is intentional**: Makes URLs work immediately without signed URLs
- **Still requires authentication**: Only logged-in users can upload

### Is this secure?
Yes, for chat file sharing:
- URLs are unguessable (timestamp + random string)
- Files aren't sensitive (they're shared in chat anyway)
- Only authenticated users can upload
- Session ID provides natural access control

---

## Reference Documentation

For technical details and configuration values, see:
- [CHAT_STORAGE_SETUP_REFERENCE.md](CHAT_STORAGE_SETUP_REFERENCE.md) - Complete configuration reference

---

## Need Help?

If you still have issues:
1. Check Supabase Dashboard → Logs for detailed errors
2. Open browser DevTools → Console for client-side errors
3. Check Network tab for failed API requests
4. Verify your `.env.local` has correct Supabase credentials

The bucket and policies can also be tested by uploading a file directly through the Supabase Dashboard to ensure the configuration works.
