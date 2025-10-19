'use client';

import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';

export default function VideoPage({ searchParams }: { searchParams?: { token?: string; room?: string } }) {
  const token = searchParams?.token ?? undefined;
  const serverUrl = "wss://myautodoctorca-oe6r6oqr.livekit.cloud";

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect
      video
      audio
      data-lk-theme="default"
      style={{ height: '100dvh' }}
    >
      <VideoConference />
    </LiveKitRoom>
  );
}
