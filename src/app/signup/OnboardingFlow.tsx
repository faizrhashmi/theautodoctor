"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type PlanOption = {
  id: string;
  name: string;
  description: string;
  price: string;
  perks: string[];
};

type AvailabilitySlot = {
  start: Date;
  end: Date;
};

type LiveAvailability = {
  name: string;
  specialty: string;
  waitMinutes: number;
};

const PLAN_OPTIONS: PlanOption[] = [
  {
    id: "quick",
    name: "Quick Triage (15 min)",
    price: "$35",
    description: "Fast guidance for warning lights and simple issues.",
    perks: ["Live video with certified mechanic", "Action plan & next steps", "Recording sent afterwards"],
  },
  {
    id: "standard",
    name: "Standard Consultation (30 min)",
    price: "$59",
    description: "Deep dive diagnostics and repair estimates.",
    perks: ["Pre-appointment review of your notes", "Live video with screen share", "Written summary & repair plan"],
  },
  {
    id: "inspection",
    name: "Remote Inspection (45 min)",
    price: "$89",
    description: "Pre-purchase or remote inspection with documentation.",
    perks: ["Live inspection checklist", "Documentation you can share or print", "Follow-up questions included"],
  },
];

function generateAvailability(): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];
  const now = new Date();
  for (let dayOffset = 1; dayOffset <= 7; dayOffset += 1) {
    const base = new Date(now);
    base.setDate(base.getDate() + dayOffset);
    base.setHours(9, 0, 0, 0);

    for (let block = 0; block < 5; block += 1) {
      const start = new Date(base);
      start.setHours(9 + block * 2, 0, 0, 0);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + 45);
      slots.push({ start, end });
    }
  }
  return slots;
}

async function updateProfile(payload: Record<string, unknown>) {
  const res = await fetch("/api/customer/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any)?.error || "Unable to update your profile.");
  }
}

async function saveSchedule(plan: string, dateIso: string, slotIso: string | null) {
  const res = await fetch("/api/customer/schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, date: dateIso, slot: slotIso }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any)?.error || "Unable to save your booking.");
  }
}

type OnboardingFlowProps = {
  email: string;
  initialPlan: string | null;
  initialSlot: string | null;
  initialFullName: string | null;
  initialPhone: string | null;
  initialVehicle: string | null;
};

type Step = "details" | "plan" | "schedule" | "summary";

export default function OnboardingFlow({
  email,
  initialPlan,
  initialSlot,
  initialFullName,
  initialPhone,
  initialVehicle,
}: OnboardingFlowProps) {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState(initialFullName ?? "");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [vehicle, setVehicle] = useState(initialVehicle ?? "");
  const [detailsComplete, setDetailsComplete] = useState<boolean>(Boolean(initialFullName && initialPhone));
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [plan, setPlan] = useState<string | null>(initialPlan);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const [availability] = useState<AvailabilitySlot[]>(() => generateAvailability());
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialSlot ? new Date(initialSlot) : null);
  const [selectedTime, setSelectedTime] = useState<string | null>(initialSlot ?? null);
  const [appointmentConfirmed, setAppointmentConfirmed] = useState<boolean>(Boolean(initialSlot));
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const [checkingLive, setCheckingLive] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveInfo, setLiveInfo] = useState<LiveAvailability | null>(null);
  const [liveCount, setLiveCount] = useState<number | null>(null);

  const step: Step = useMemo(() => {
    if (!detailsComplete) return "details";
    if (!plan) return "plan";
    if (!appointmentConfirmed) return "schedule";
    return "summary";
  }, [detailsComplete, plan, appointmentConfirmed]);

  const uniqueDates = useMemo(() => {
    const seen = new Map<string, Date>();
    availability.forEach((slot) => {
      const key = slot.start.toDateString();
      if (!seen.has(key)) {
        seen.set(key, new Date(slot.start));
      }
    });
    return Array.from(seen.values()).slice(0, 7);
  }, [availability]);

  const timeOptions = useMemo(() => {
    if (!selectedDate) return [] as AvailabilitySlot[];
    return availability.filter((slot) => slot.start.toDateString() === selectedDate.toDateString());
  }, [availability, selectedDate]);

  useEffect(() => {
    setDetailsError(null);
  }, [fullName, phone, vehicle]);

  async function handleSaveDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingDetails) return;
    if (!fullName.trim()) {
      setDetailsError("Please enter your full name.");
      return;
    }
    if (!phone.trim()) {
      setDetailsError("Please provide a contact phone number.");
      return;
    }

    setSavingDetails(true);
    setDetailsError(null);
    try {
      await updateProfile({ fullName: fullName.trim(), phone: phone.trim(), vehicle: vehicle.trim() || null });
      setDetailsComplete(true);
    } catch (err: any) {
      setDetailsError(err?.message || "Unable to save your details. Please try again.");
      return;
    } finally {
      setSavingDetails(false);
    }
  }

  async function handlePlanSelect(option: PlanOption) {
    if (savingPlan) return;
    setPlanError(null);
    setSavingPlan(true);
    try {
      await updateProfile({ plan: option.id });
      setPlan(option.id);
      setSelectedDate(null);
      setSelectedTime(null);
      setAppointmentConfirmed(false);
    } catch (err: any) {
      setPlanError(err?.message || "Unable to save your plan. Please try again.");
    } finally {
      setSavingPlan(false);
    }
  }

  async function handleScheduleConfirm() {
    if (!plan) {
      setAvailabilityError("Pick a session to continue.");
      return;
    }
    if (!selectedDate) {
      setAvailabilityError("Choose a date to continue.");
      return;
    }

    setSavingSchedule(true);
    setAvailabilityError(null);
    setScheduleMessage(null);
    try {
      const dateIso = selectedDate.toISOString();
      const slotIso = selectedTime ?? null;
      await saveSchedule(plan, dateIso, slotIso);
      setAppointmentConfirmed(true);
      setScheduleMessage(
        "Thanks! A mechanic will review your request and email you to confirm the exact time."
      );
    } catch (err: any) {
      setAvailabilityError(err?.message || "Unable to save your booking. Please try again.");
      return;
    } finally {
      setSavingSchedule(false);
    }
  }

  async function handleSpeakNow() {
    if (!detailsComplete) {
      setLiveError("Add your contact details first.");
      return;
    }
    if (!plan) {
      setLiveError("Pick a session type to see who can help you right now.");
      return;
    }

    setCheckingLive(true);
    setLiveError(null);
    setLiveInfo(null);
    setLiveCount(null);
    try {
      const res = await fetch("/api/mechanics/availability");
      if (!res.ok) throw new Error("Unable to check availability");
      const data = await res.json();
      if (typeof data.mechanicsOnline === "number") {
        setLiveCount(data.mechanicsOnline);
      }
      if (data.mechanic) {
        setLiveInfo({
          name: data.mechanic.name,
          specialty: data.mechanic.specialty,
          waitMinutes: data.mechanic.eta ?? data.waitMinutes ?? 2,
        });
      } else {
        setLiveError("Mechanics are online. Choose a package to continue.");
      }
    } catch (err: any) {
      setLiveError(err?.message || "Unable to check availability.");
    } finally {
      setCheckingLive(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 lg:flex-row">
        <div className="lg:w-[60%]">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-semibold text-slate-900">
              {step === "details"
                ? "Tell us about yourself first"
                : step === "plan"
                ? "Choose the session that fits your repair question"
                : step === "schedule"
                ? "Reserve a time with a certified mechanic"
                : "You are all set"}
            </h1>
            <button
              onClick={handleSignOut}
              className="text-xs font-semibold text-slate-500 underline underline-offset-4"
            >
              Sign out
            </button>
          </div>
          <p className="text-slate-600">
            Tell us how we can help, then secure the time that works best for your schedule. Your notes carry over to your mechanic so they are ready from the first minute.
          </p>

          <div className="mt-8 space-y-6">
            {step === "details" && (
              <form onSubmit={handleSaveDetails} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-600">
                  Create your profile so your mechanic can greet you by name and reach you if anything changes.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Full name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Phone number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="e.g. 416-555-0123"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Vehicle (optional)</label>
                  <input
                    type="text"
                    value={vehicle}
                    onChange={(e) => setVehicle(e.target.value)}
                    placeholder="Year / Make / Model"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {detailsError && <p className="text-sm text-rose-600">{detailsError}</p>}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">We will use this information for confirmations and reminders only.</p>
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    disabled={savingDetails}
                  >
                    {savingDetails ? "Saving..." : "Save and continue"}
                  </button>
                </div>
              </form>
            )}

            {step === "plan" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  <div>
                    <div className="font-semibold text-slate-800">Contact on file</div>
                    <div>{fullName || "Your name"}</div>
                    <div>{phone || "Your phone number"}</div>
                  </div>
                  <button type="button" className="text-blue-600 hover:underline" onClick={() => setDetailsComplete(false)}>
                    Update details
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {PLAN_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handlePlanSelect(option)}
                      disabled={savingPlan}
                      className={`flex h-full flex-col justify-between rounded-xl border px-4 py-5 text-left transition shadow-sm ${
                        plan === option.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300"
                      }`}
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{option.name}</div>
                        <div className="mt-1 text-xs text-slate-500">{option.description}</div>
                        <div className="mt-3 text-lg font-semibold text-slate-900">{option.price}</div>
                        <ul className="mt-3 space-y-2 text-xs text-slate-600">
                          {option.perks.map((perk) => (
                            <li key={perk}>• {perk}</li>
                          ))}
                        </ul>
                      </div>
                      <span className="mt-4 text-xs font-semibold uppercase tracking-wide text-blue-600">
                        {plan === option.id ? "Selected" : "Select plan"}
                      </span>
                    </button>
                  ))}
                </div>
                {planError && <p className="text-sm text-rose-600">{planError}</p>}
              </div>
            )}

            {step === "schedule" && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Pick a day that works for you</h2>
                <p className="mt-2 text-sm text-slate-600">Mechanics are available seven days a week. You can leave the exact time undecided—your mechanic will confirm via email once they accept your request.</p>
                {availabilityError && <p className="mt-3 text-sm text-rose-600">{availabilityError}</p>}
                {scheduleMessage && <p className="mt-3 text-sm text-emerald-600">{scheduleMessage}</p>}

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {uniqueDates.map((date) => {
                    const selected = selectedDate && date.toDateString() === selectedDate.toDateString();
                    return (
                      <button
                        key={date.toISOString()}
                        type="button"
                        onClick={() => {
                          setSelectedDate(date);
                          setSelectedTime(null);
                          setAppointmentConfirmed(false);
                          setScheduleMessage(null);
                        }}
                        className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                          selected ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300"
                        }`}
                      >
                        <div className="font-medium text-slate-800">
                          {date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedDate && timeOptions.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-slate-600">Optional: pick a time</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {timeOptions.map((slot) => {
                        const iso = slot.start.toISOString();
                        const selected = selectedTime === iso;
                        return (
                          <button
                            key={iso}
                            type="button"
                            onClick={() => setSelectedTime(selected ? null : iso)}
                            className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                              selected ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300"
                            }`}
                          >
                            {slot.start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setSelectedTime(null)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-600 hover:bg-slate-100"
                      >
                        Decide with mechanic
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleScheduleConfirm}
                  disabled={savingSchedule}
                  className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {savingSchedule ? "Saving..." : "Continue"}
                </button>
              </div>
            )}

            {step === "summary" && (
              <div className="space-y-6">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">You are all set</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    We have saved your booking under <span className="font-medium">{email}</span>. Watch for an email from your mechanic to confirm the exact time.
                  </p>
                  {plan && (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{PLAN_OPTIONS.find((p) => p.id === plan)?.name}</p>
                          <p className="text-xs text-slate-500">{PLAN_OPTIONS.find((p) => p.id === plan)?.description}</p>
                        </div>
                        <p className="text-sm font-semibold text-slate-700">{PLAN_OPTIONS.find((p) => p.id === plan)?.price}</p>
                      </div>
                    </div>
                  )}
                  {selectedDate && (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      Preferred day: {selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                      {selectedTime && (
                        <span>
                          {" at "}
                          {new Date(selectedTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      onClick={() => setDetailsComplete(false)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Update contact info
                    </button>
                    <button
                      onClick={() => {
                        setPlan(null);
                        setSelectedDate(null);
                        setSelectedTime(null);
                        setAppointmentConfirmed(false);
                      }}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Choose a different plan
                    </button>
                    <button
                      onClick={() => {
                        setAppointmentConfirmed(false);
                        setScheduleMessage(null);
                      }}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Pick a new time
                    </button>
                    <button
                      onClick={() => router.push(`/intake?plan=${plan ?? "trial"}`)}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Continue to intake form
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
                  <h3 className="text-sm font-semibold">Need help sooner?</h3>
                  <p className="mt-1 text-sm text-blue-900">
                    Use the "Speak with a mechanic now" option if you have an urgent question. We connect you to a live expert when one is available.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 lg:w-[40%]">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Speak with a mechanic now</h3>
            <p className="mt-2 text-sm text-slate-600">
              Need immediate advice? We only show names once you have an account and pick a package. Mechanics must accept the request before the video room opens.
            </p>
            {liveCount !== null && <p className="mt-2 text-xs text-slate-500">Mechanics online: {liveCount}</p>}
            {liveInfo && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <div className="font-semibold">
                  <button
                    type="button"
                    className="text-emerald-800 underline underline-offset-2"
                    onClick={() => router.push("/pricing?from=live")}
                  >
                    {liveInfo.name}
                  </button>
                </div>
                <div className="text-xs">{liveInfo.specialty}</div>
                <div className="mt-1 text-xs">Estimated wait: {liveInfo.waitMinutes} minutes</div>
                <p className="mt-2 text-xs text-emerald-800">
                  Choose a package on the pricing page to reserve your live session. We email the mechanic for confirmation.
                </p>
                <button
                  onClick={() => router.push("/pricing?from=live")}
                  className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  View pricing packages
                </button>
              </div>
            )}
            {liveError && <p className="mt-3 text-sm text-rose-600">{liveError}</p>}
            {!liveInfo && (
              <button
                onClick={handleSpeakNow}
                disabled={checkingLive}
                className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                {checkingLive ? "Checking availability..." : "Check live availability"}
              </button>
            )}
            <p className="mt-3 text-xs text-slate-500">
              The live session begins only after a mechanic accepts your request. You will receive email confirmation.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">How it works</h3>
            <ol className="mt-3 space-y-3 text-sm text-slate-600">
              <li>
                <span className="font-semibold text-slate-800">1.</span> Tell us about your vehicle and the issue you are seeing.
              </li>
              <li>
                <span className="font-semibold text-slate-800">2.</span> Meet your mechanic on a private video call at the time you selected.
              </li>
              <li>
                <span className="font-semibold text-slate-800">3.</span> Receive a summary, repair plan, and follow-up recommendations via email.
              </li>
            </ol>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Need to prepare?</h3>
            <p className="mt-2 text-sm text-slate-600">Having these ready helps your mechanic get right to work:</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>VIN number and mileage (if available)</li>
              <li>Photos or short videos of the issue</li>
              <li>Any trouble codes or warning lights you have seen</li>
              <li>Maintenance history or repair estimates</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
