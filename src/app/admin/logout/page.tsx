'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogout() {
  const router = useRouter();

  useEffect(() => {
    async function logout() {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
        });
        
        // Redirect to login page after logout
        window.location.href = '/admin/login';
      } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/admin/login';
      }
    }

    logout();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Logging out...</h1>
        <p className="mt-2 text-slate-600">Please wait while we sign you out.</p>
      </div>
    </div>
  );
}