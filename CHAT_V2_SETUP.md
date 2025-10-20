# Professional Chat UI v2 - Setup Guide

## What's New

### ✨ Features
- **Professional Design**: Modern, clean interface with proper spacing and visual hierarchy
- **File Uploads**: Support for images, PDFs, and documents (up to 10MB per file)
- **Real-time Updates**: Live participant count and message delivery
- **Avatars**: Visual indicators for customer (C/Y) vs mechanic (M)
- **Better UX**: Loading states, error handling, file previews, drag indicators
- **Responsive**: Works on desktop, tablet, and mobile

### 🎨 Visual Improvements
- Gradient background for depth
- Proper message bubbles with shadows
- Clear online/offline status indicators
- Professional header with icons
- File attachment previews with download links
- Smooth animations and transitions

## Setup Steps

### Step 1: Enable Realtime (Critical!)

Go to Supabase Dashboard → **Database → Replication**:

Enable Realtime for:
1. ✅ **sessions**
2. ✅ **session_participants**
3. ✅ **chat_messages**

Click **Save** after enabling each one.

### Step 2: Create Storage Bucket

Go to Supabase Dashboard → **Storage**:

1. Click **"New bucket"**
2. Name: `chat-attachments`
3. Set as **Public** ✅
4. Click **Create bucket**

Then run this SQL in SQL Editor to set up policies:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Users can upload chat attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
);

-- Allow public access to view attachments
CREATE POLICY "Public can view attachments"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'chat-attachments');
```

### Step 3: Test the Flow

#### A. Customer Side

1. Go to: `http://localhost:3000/api/checkout?plan=chat10`
2. Complete checkout with test card: `4242 4242 4242 4242`
3. You should land in the NEW professional chat UI
4. See: "○ Waiting for mechanic..." (amber color)

#### B. Mechanic Side

1. Go to: `http://localhost:3000/admin/sessions`
2. Click **"Join Session"** on the available session
3. You'll be redirected to the same chat room
4. You should see "Mechanic" badge in header

#### C. Both See Updates

**Customer sees:**
- Status changes to "● 1 mechanic online" (green)
- Avatar appears: "M" for mechanic

**Mechanic sees:**
- Avatar appears: "C" for customer
- Can start chatting immediately

#### D. Send Messages

1. Type a message and press Enter (or click send button)
2. Message appears immediately for both parties
3. Try Shift+Enter for multi-line messages

#### E. Send Files

1. Click the paperclip icon (📎)
2. Select an image, PDF, or document
3. See file preview appear below textarea
4. Click send
5. File appears as downloadable link in message bubble
6. Both parties can download the file

## Features in Detail

### Message Types

**Text Only:**
```
Customer: "My car is making a strange noise"
```

**Text + Attachment:**
```
Customer: "Here's a video of the noise"
[video-recording.mp4 - 2.3 MB] [Download]
```

**Attachment Only:**
```
Customer: 📎 Attachment
[engine-photo.jpg - 450 KB] [Download]
```

### File Upload Limits

- **Max file size**: 10 MB per file
- **Supported types**:
  - Images: JPG, PNG, GIF, WebP
  - Documents: PDF, DOC, DOCX, TXT
  - Any other file type (will be downloadable)
- **Multiple files**: Yes, attach multiple files at once
- **Remove before sending**: Click X on file preview

### Keyboard Shortcuts

- **Enter**: Send message
- **Shift+Enter**: New line in message
- **Tab**: Focus between textarea and buttons

### Visual Indicators

| Indicator | Meaning |
|-----------|---------|
| ○ Waiting for mechanic... | No mechanic joined yet (amber) |
| ● 1 mechanic online | Mechanic connected (green) |
| Blue bubble on right | Your messages |
| Gray bubble on left | Other person's messages |
| "M" avatar | Mechanic |
| "C" or "Y" avatar | Customer (C) or You (Y) |
| Spinning icon | Sending message/uploading |

## Troubleshooting

### Issue: "Waiting for mechanic" doesn't update when mechanic joins

**Solution:**
- Verify Realtime is enabled for `session_participants` in Supabase
- Check browser console for WebSocket errors
- Refresh the customer's page
- Check that mechanic actually joined (query database)

```sql
SELECT * FROM session_participants WHERE session_id = 'YOUR_SESSION_ID';
```

### Issue: Messages don't appear in real-time

**Solution:**
- Verify Realtime is enabled for `chat_messages` in Supabase
- Check browser console for errors
- Verify both users are in the same session
- Test by refreshing the page (messages should load)

### Issue: File upload fails

**Solution:**
- Verify storage bucket `chat-attachments` exists
- Verify bucket is set to **public**
- Check RLS policies are created (run SQL above)
- Check file size (must be < 10MB)
- Check browser console for specific error

### Issue: Can't download attachments

**Solution:**
- Verify bucket is public
- Check file URL in database is correct
- Try opening URL directly in new tab
- Check RLS policies allow SELECT

### Issue: Chat UI looks broken

**Solution:**
- Hard refresh browser (Ctrl+Shift+R)
- Check Tailwind CSS is working
- Check browser console for JS errors
- Try in incognito mode

## Database Queries for Debugging

### Check if Realtime is working
```sql
-- Check subscriptions
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('sessions', 'session_participants', 'chat_messages');
```

### View messages with attachments
```sql
SELECT
  id,
  content,
  created_at,
  attachments,
  sender_id
FROM chat_messages
WHERE session_id = 'YOUR_SESSION_ID'
ORDER BY created_at;
```

### Check storage bucket
```sql
SELECT * FROM storage.buckets WHERE id = 'chat-attachments';
```

### View uploaded files
```sql
SELECT
  name,
  bucket_id,
  created_at,
  metadata
FROM storage.objects
WHERE bucket_id = 'chat-attachments'
ORDER BY created_at DESC
LIMIT 10;
```

## Next Steps

### Immediate
1. ✅ Enable Realtime for the 3 tables
2. ✅ Create storage bucket
3. ✅ Test complete flow

### Future Enhancements
- [ ] Image preview thumbnails (instead of download link)
- [ ] Typing indicators ("Mechanic is typing...")
- [ ] Read receipts (seen/delivered status)
- [ ] Session timer (countdown from 10 minutes)
- [ ] Auto-complete session after timer expires
- [ ] Session rating/feedback after completion
- [ ] Message reactions (emoji reactions)
- [ ] Voice messages
- [ ] Screen recording tool integration

## File Structure

```
src/app/chat/[id]/
├── page.tsx          # Server component - auth & data fetching
├── ChatRoom.tsx      # Old chat UI (not used)
└── ChatRoomV2.tsx    # NEW professional chat UI ⭐
```

## Comparison: Old vs New

| Feature | Old UI | New UI |
|---------|--------|--------|
| Design | Basic | Professional ✅ |
| File Upload | ❌ | ✅ |
| Avatars | ❌ | ✅ |
| Status Indicator | Text only | Icon + Color ✅ |
| Message Styling | Simple bubbles | Rich bubbles ✅ |
| Mobile Responsive | Basic | Optimized ✅ |
| Error Handling | Basic | Detailed ✅ |
| Loading States | Spinner | Spinner + Text ✅ |

---

**Ready to test!** Follow the setup steps above and enjoy your professional chat system! 🎉
