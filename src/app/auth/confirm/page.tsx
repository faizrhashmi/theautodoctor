"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function AuthConfirmPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("Verifying your email...");

  useEffect(() => {
    const code = searchParams.get("code");
    const next = searchParams.get("next");

    async function exchange() {
      if (!code) {
        setStatus("error");
        setMessage("Missing confirmation code. Please try signing in again.");
        return;
      }

      console.log("Attempting to exchange code:", code);

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      console.log("Exchange result:", { data, error });

      if (error) {
        console.error("Exchange error:", error);
        setStatus("error");
        setMessage(error.message || "We couldn't confirm your email. Please try again.");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const fullName = (user?.user_metadata?.full_name as string | undefined) ?? null;
      const phone = (user?.user_metadata?.phone as string | undefined) ?? null;
      const vehicle = (user?.user_metadata?.vehicle_hint as string | undefined) ?? null;
      const dateOfBirth = (user?.user_metadata?.date_of_birth as string | undefined) ?? null;

      await fetch("/api/customer/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone, vehicle, dateOfBirth }),
      }).catch(() => {});

      setStatus("success");
      setMessage("Email confirmed! Redirecting you to choose your package...");
      setTimeout(() => {
        router.replace(next ?? "/signup");
      }, 1200);
    }

    exchange();
  }, [searchParams, supabase, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Checking your link...</h1>
        <p
          className={`mt-4 text-sm ${
            status === "error"
              ? "text-rose-600"
              : status === "success"
              ? "text-emerald-600"
              : "text-slate-600"
          }`}
        >
          {message}
        </p>
        {status === "error" && (
          <div className="mt-6 space-y-2 text-sm text-slate-600">
            <p>Try opening the confirmation link from the same device you used to sign up.</p>
            <p>
              Still stuck?{" "}
              <a href="mailto:support@askautodoctor.com" className="text-orange-600 hover:underline">
                Contact support
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
