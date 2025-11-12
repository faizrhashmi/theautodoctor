"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Validate password strength
  function isValidPassword(password: string): { valid: boolean; message: string } {
    if (password.length < 8) {
      return { valid: false, message: "Password must be at least 8 characters" };
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
      return { valid: false, message: "Must include uppercase and lowercase letters" };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: "Must include at least one number" };
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return { valid: false, message: "Must include at least one special character" };
    }
    return { valid: true, message: "" };
  }

  // Validate password on change
  useEffect(() => {
    if (password) {
      const validation = isValidPassword(password);
      if (!validation.valid) {
        setPasswordError(validation.message);
      } else {
        setPasswordError(null);
      }
    } else {
      setPasswordError(null);
    }
  }, [password]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate password
    const validation = isValidPassword(password);
    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/customer/dashboard");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-white">Reset Your Password</h1>
            <p className="mt-2 text-slate-400">
              Enter your new password below
            </p>
          </div>

          {/* Form Card */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-8 shadow-2xl backdrop-blur-sm">
            {success ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                  <svg
                    className="h-8 w-8 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white">Password Reset Successful!</h2>
                <p className="mt-2 text-slate-400">
                  Redirecting you to your dashboard...
                </p>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-6">
                {/* Error Message */}
                {error && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {/* New Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                    New Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-3 text-white placeholder-slate-400 transition-all focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    placeholder="Enter your new password"
                  />
                  {passwordError && (
                    <p className="mt-2 text-sm text-red-400">{passwordError}</p>
                  )}

                  {/* Password Requirements */}
                  <div className="mt-3 space-y-1">
                    <p className="text-xs text-slate-400">Password must contain:</p>
                    <ul className="ml-4 space-y-1 text-xs text-slate-500">
                      <li className={password.length >= 8 ? "text-green-400" : ""}>
                        • At least 8 characters
                      </li>
                      <li className={/[a-z]/.test(password) && /[A-Z]/.test(password) ? "text-green-400" : ""}>
                        • Uppercase and lowercase letters
                      </li>
                      <li className={/[0-9]/.test(password) ? "text-green-400" : ""}>
                        • At least one number
                      </li>
                      <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? "text-green-400" : ""}>
                        • At least one special character
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-3 text-white placeholder-slate-400 transition-all focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    placeholder="Confirm your new password"
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="mt-2 text-sm text-red-400">Passwords do not match</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !!passwordError || password !== confirmPassword}
                  className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:from-orange-600 hover:to-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="mr-2 h-5 w-5 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Resetting Password...
                    </span>
                  ) : (
                    "Reset Password"
                  )}
                </button>

                {/* Back to Login */}
                <div className="text-center">
                  <Link
                    href="/signup"
                    className="text-sm text-slate-400 hover:text-orange-400 transition-colors"
                  >
                    Back to Login
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
