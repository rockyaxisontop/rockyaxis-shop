"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { verifyBeforeUpdateEmail } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, ChevronDown, House, Loader2, LocateFixed, MapPin, Pencil, UserRound } from "lucide-react";

import { useAuth } from "@/components/providers";
import { authErrorMessage } from "@/lib/firebase/auth";
import { getDb } from "@/lib/firebase/client";

type AddressLabel = "Home" | "Work" | "Other";

type ProfileData = {
  fullName: string;
  phoneNumber: string;
  buildingStreet: string;
  locality: string;
  region: string;
  city: string;
  area: string;
  address: string;
  label: AddressLabel;
  birthday: string;
  gender: string;
  coordinates: { latitude: number; longitude: number } | null;
};

const EMPTY_PROFILE: ProfileData = {
  fullName: "",
  phoneNumber: "",
  buildingStreet: "",
  locality: "",
  region: "",
  city: "",
  area: "",
  address: "",
  label: "Home",
  birthday: "",
  gender: "",
  coordinates: null,
};

const fieldClass =
  "h-11 w-full rounded-md border border-border bg-white px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15";

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 text-sm font-medium text-ink ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<ProfileData>(EMPTY_PROFILE);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailNotice, setEmailNotice] = useState("");
  const [locationNotice, setLocationNotice] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent("/profile")}`);
      return;
    }

    let active = true;
    setProfileLoading(true);
    setEmailDraft(user.email ?? "");
    void getDoc(doc(getDb(), "users", user.uid))
      .then((snapshot) => {
        if (!active) return;
        const saved = snapshot.data() as Partial<ProfileData> | undefined;
        setProfile({
          ...EMPTY_PROFILE,
          ...saved,
          fullName: saved?.fullName || user.displayName || "",
          coordinates: saved?.coordinates ?? null,
        });
      })
      .catch((cause: unknown) => {
        if (active) setError(authErrorMessage(cause));
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loading, router, user]);

  function updateField<Key extends keyof ProfileData>(key: Key, value: ProfileData[Key]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await setDoc(
        doc(getDb(), "users", user.uid),
        { ...profile, email: user.email ?? null, updatedAt: serverTimestamp() },
        { merge: true },
      );
      setNotice("Your delivery and profile information has been saved.");
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function requestEmailChange() {
    const nextEmail = emailDraft.trim();
    if (!user || !nextEmail) {
      setEmailNotice("Enter the email address you want to use.");
      return;
    }
    if (nextEmail === user.email) {
      setEmailNotice("This is already your current email address.");
      return;
    }
    setEmailSending(true);
    setEmailNotice("");
    try {
      await verifyBeforeUpdateEmail(user, nextEmail);
      setEmailNotice(`A verification link was sent to ${nextEmail}.`);
    } catch (cause) {
      setEmailNotice(authErrorMessage(cause));
    } finally {
      setEmailSending(false);
    }
  }

  function selectLocation() {
    setLocationNotice("");
    if (!navigator.geolocation) {
      setLocationNotice("Location is unavailable in this browser. Enter your address below.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        updateField("coordinates", { latitude: coords.latitude, longitude: coords.longitude });
        setLocationNotice("Location selected. Complete the written address for delivery.");
      },
      () => setLocationNotice("Location was not available. You can enter your address manually."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  if (loading || profileLoading) {
    return (
      <div className="mx-auto min-h-72 w-full max-w-5xl animate-pulse py-10" aria-label="Loading profile">
        <div className="h-7 w-48 rounded bg-surface-2" />
        <div className="mt-8 h-64 rounded-lg bg-surface-2" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-5xl py-5 sm:py-8">
      <header className="mb-8 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-tint text-brand">
            <UserRound className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">Your Profile</h1>
            <p className="mt-0.5 text-sm text-ink-soft">Manage your account and delivery information.</p>
          </div>
        </div>
        <Link
          href="/"
          className="inline-flex h-9 w-fit items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-ink-soft transition-colors hover:border-brand hover:bg-brand-tint hover:text-brand"
        >
          <House className="size-4" />
          Home
        </Link>
      </header>

      <form onSubmit={saveProfile} className="grid gap-10 lg:grid-cols-[minmax(0,1.45fr)_minmax(16rem,0.75fr)] lg:gap-12">
        <section aria-labelledby="delivery-title" className="min-w-0">
          <div className="mb-5 flex items-center gap-2">
            <MapPin className="size-4 text-brand" />
            <h2 id="delivery-title" className="text-lg font-bold text-ink">Delivery Information</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <input
                className={fieldClass}
                autoComplete="name"
                required
                value={profile.fullName}
                onChange={(event) => updateField("fullName", event.target.value)}
                placeholder="Enter your full name"
              />
            </Field>
            <Field label="Phone number">
              <input
                id="phone-number"
                className={fieldClass}
                type="tel"
                autoComplete="tel"
                required
                value={profile.phoneNumber}
                onChange={(event) => updateField("phoneNumber", event.target.value)}
                placeholder="Enter your mobile number"
              />
            </Field>
            <Field label="Building / House No / Floor / Street" className="sm:col-span-2">
              <input
                className={fieldClass}
                autoComplete="address-line1"
                required
                value={profile.buildingStreet}
                onChange={(event) => updateField("buildingStreet", event.target.value)}
                placeholder="House number, building, floor, street"
              />
            </Field>
            <Field label="Colony / Suburb / Locality / Landmark" className="sm:col-span-2">
              <input
                className={fieldClass}
                autoComplete="address-line2"
                required
                value={profile.locality}
                onChange={(event) => updateField("locality", event.target.value)}
                placeholder="Neighborhood or nearby landmark"
              />
            </Field>
            <Field label="Region">
              <input
                className={fieldClass}
                autoComplete="address-level1"
                required
                value={profile.region}
                onChange={(event) => updateField("region", event.target.value)}
                placeholder="Enter your region"
              />
            </Field>
            <Field label="City">
              <input
                className={fieldClass}
                autoComplete="address-level2"
                required
                value={profile.city}
                onChange={(event) => updateField("city", event.target.value)}
                placeholder="Enter your city"
              />
            </Field>
            <Field label="Area">
              <input
                className={fieldClass}
                required
                value={profile.area}
                onChange={(event) => updateField("area", event.target.value)}
                placeholder="Enter your area"
              />
            </Field>
            <Field label="Address">
              <input
                className={fieldClass}
                value={profile.address}
                onChange={(event) => updateField("address", event.target.value)}
                placeholder="Apartment, suite, or extra directions (optional)"
              />
            </Field>

            <fieldset className="sm:col-span-2">
              <legend className="mb-2 text-sm font-medium text-ink">Select a label for effective delivery</legend>
              <div className="flex flex-wrap gap-2">
                {(["Home", "Work", "Other"] as const).map((label) => (
                  <label key={label} className="cursor-pointer">
                    <input
                      className="peer sr-only"
                      type="radio"
                      name="address-label"
                      value={label}
                      checked={profile.label === label}
                      onChange={() => updateField("label", label)}
                    />
                    <span className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm text-ink-soft transition peer-checked:border-brand peer-checked:bg-brand-tint peer-checked:text-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={selectLocation}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-ink transition-colors hover:border-brand hover:text-brand"
            >
              <LocateFixed className="size-4" />
              Select location
            </button>
            {locationNotice ? <p className="mt-2 text-xs text-ink-soft" role="status">{locationNotice}</p> : null}
            {profile.coordinates ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-stock">
                <Check className="size-3.5" /> Location selected
              </p>
            ) : null}
          </div>

        </section>

        <aside className="min-w-0 self-start rounded-lg border border-border bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-ink">Account details</h2>
              <p className="mt-0.5 text-xs text-ink-soft">Email, mobile, and personal details</p>
            </div>
            <button
              type="button"
              onClick={() => setEditingPersonal((value) => !value)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-bold tracking-wide text-ink-soft transition-colors hover:border-brand hover:text-brand"
            >
              <Pencil className="size-3.5" />
              {editingPersonal ? "DONE" : "EDIT PROFILE"}
            </button>
          </div>

          <dl className="mt-4 divide-y divide-border">
            <div className="py-3 first:pt-0">
              <dt className="flex items-center justify-between gap-3 text-xs font-semibold text-ink-soft">
                Email Address
                <button type="button" className="text-brand hover:underline" onClick={() => setChangingEmail((value) => !value)}>
                  {changingEmail ? "Cancel" : "Change"}
                </button>
              </dt>
              <dd className="mt-1 break-all text-sm text-ink">{user.email ?? "No email address"}</dd>
              {changingEmail ? (
                <div className="mt-3 flex flex-col gap-2">
                  <input
                    className={fieldClass}
                    type="email"
                    autoComplete="email"
                    value={emailDraft}
                    onChange={(event) => setEmailDraft(event.target.value)}
                    placeholder="New email address"
                  />
                  <button
                    type="button"
                    disabled={emailSending}
                    onClick={() => void requestEmailChange()}
                    className="h-9 rounded-md border border-brand px-3 text-xs font-semibold text-brand hover:bg-brand-tint disabled:opacity-60"
                  >
                    {emailSending ? "Sending…" : "Send verification link"}
                  </button>
                  {emailNotice ? <p role="status" className="text-xs text-ink-soft">{emailNotice}</p> : null}
                </div>
              ) : null}
            </div>
            <div className="py-3">
              <dt className="flex items-center justify-between gap-3 text-xs font-semibold text-ink-soft">
                Mobile
                <a className="text-brand hover:underline" href="#phone-number">{profile.phoneNumber ? "Edit" : "Add"}</a>
              </dt>
              <dd className="mt-1 text-sm text-ink">{profile.phoneNumber || "Please enter your mobile"}</dd>
            </div>
            <div className="py-3">
              <dt className="text-xs font-semibold text-ink-soft">Birthday</dt>
              <dd className="mt-1 text-sm text-ink">{profile.birthday || "Please enter your birthday"}</dd>
            </div>
            <div className="py-3 last:pb-0">
              <dt className="text-xs font-semibold text-ink-soft">Gender</dt>
              <dd className="mt-1 text-sm text-ink">{profile.gender || "Please enter your gender"}</dd>
            </div>
          </dl>

          {editingPersonal ? (
            <div className="mt-3 grid gap-4">
              <Field label="Birthday">
                <span className="relative">
                  <input
                    className={`${fieldClass} pr-10`}
                    type="date"
                    value={profile.birthday}
                    onChange={(event) => updateField("birthday", event.target.value)}
                  />
                  <CalendarDays className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-soft" />
                </span>
              </Field>
              <Field label="Gender">
                <span className="relative">
                  <select
                    className={`${fieldClass} appearance-none pr-9`}
                    value={profile.gender}
                    onChange={(event) => updateField("gender", event.target.value)}
                  >
                    <option value="">Please enter your gender</option>
                    <option>Female</option>
                    <option>Male</option>
                    <option>Non-binary</option>
                    <option>Prefer not to say</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-soft" />
                </span>
              </Field>
              <p className="text-xs text-ink-soft">Save your changes with the button below.</p>
            </div>
          ) : null}
        </aside>

        <div className="flex flex-col items-start gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between lg:col-span-2">
          <div className="min-w-0" aria-live="polite">
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            {notice ? <p role="status" className="text-sm text-stock">{notice}</p> : null}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-wait disabled:opacity-70 sm:w-auto"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {saving ? "Saving…" : "Save profile and delivery information"}
          </button>
        </div>
      </form>
    </div>
  );
}