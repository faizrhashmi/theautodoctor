import React from 'react';

// Minimal placeholder page to satisfy Next.js page collector.
// The project also defines the admin shells under `src/app/admin/(shell)/intakes/[id]`.
// This file prevents build-time "Cannot find module for page" errors when collectors expect
// the non-grouped route. It can be removed if the routing layout is consolidated.

interface Props {
  params: { id: string };
}

export default function AdminIntakePlaceholder({ params }: Props) {
  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-xl font-semibold">Admin intake {params.id}</h1>
      <p className="mt-2 text-sm text-slate-600">This is a placeholder page created to allow the build to complete. Please use the admin shell routes under <code>admin/(shell)/intakes</code> for the actual UI.</p>
    </div>
  );
}
