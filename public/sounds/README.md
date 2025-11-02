# Notification Sounds

## notification.mp3

Place a soft notification chime (0.8-1 second) here.

Recommended:
- Format: MP3 or WAV
- Duration: 0.8-1 seconds
- Volume: Moderate (will be set to 0.7 programmatically)
- Tone: Pleasant, non-intrusive chime

Free sound resources:
- https://freesound.org/
- https://mixkit.co/free-sound-effects/notification/
- https://www.zapsplat.com/sound-effect-categories/

For now, the app will attempt to play `/sounds/notification.mp3`.
If the file doesn't exist, it will fail silently (no error to user).
