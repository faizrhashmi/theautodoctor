// src/app/signup/layout.tsx
'use client'

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import CustomerNavbar from '@/components/customer/CustomerNavbar';
import { createClient } from '@/lib/supabase';

export default function SignupLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show CustomerNavbar for logged-in users
  if (user && !loading) {
    return (
      <>
        <CustomerNavbar />
        {children}
      </>
    );
  }

  // Show no navbar for logged-out users (ClientNavbar will show from root layout)
  return <>{children}</>;
}
