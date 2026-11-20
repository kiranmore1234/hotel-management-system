"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { BrandLogo } from "@/components/BrandLogo";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hindiVoiceAvailable, setHindiVoiceAvailable] = useState(false);
  const welcomeStarted = useRef(false);
  const welcomePending = useRef(false);
  const speechRequestId = useRef(0);

  const speakWelcome = useCallback((fromUserGesture = false) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
    if (welcomeStarted.current) return true;
    if (welcomePending.current && !fromUserGesture) return true;

    const hour = new Date().getHours();
    const greeting = hour >= 5 && hour < 12
      ? "सुप्रभात"
      : hour >= 12 && hour < 18
        ? "नमस्कार, आपका दिन शुभ हो"
        : "शुभ रात्रि";
    const utterance = new SpeechSynthesisUtterance(`नमस्ते, ${greeting}. नियोजन रेस्टोरेंट में आपका स्वागत है।`);
    utterance.lang = "hi-IN";
    const voices = window.speechSynthesis.getVoices();
    const hindiVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("hi"));
    setHindiVoiceAvailable(hindiVoices.length > 0);
    const femaleVoice = hindiVoices.find((voice) =>
      /female|woman|zira|heera|samantha|aria|jenny|susan/i.test(voice.name)
    );
    utterance.voice = femaleVoice ?? hindiVoices[0] ?? null;
    utterance.rate = 0.94;
    utterance.pitch = 1.08;
    const requestId = ++speechRequestId.current;
    welcomePending.current = true;
    utterance.onstart = () => {
      if (requestId !== speechRequestId.current) return;
      welcomeStarted.current = true;
      welcomePending.current = false;
    };
    utterance.onerror = () => {
      if (requestId === speechRequestId.current) {
        welcomePending.current = false;
        welcomeStarted.current = false;
        setHindiVoiceAvailable(window.speechSynthesis.getVoices()
          .some((voice) => voice.lang.toLowerCase().startsWith("hi")));
      }
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return true;
  }, []);

  useEffect(() => {
    if (loading || !user) return;
    router.replace("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const updateVoiceAvailability = () => {
      const available = window.speechSynthesis.getVoices()
        .some((voice) => voice.lang.toLowerCase().startsWith("hi"));
      setHindiVoiceAvailable(available);
      if (!welcomeStarted.current && !welcomePending.current && available)
        speakWelcome();
    };
    const retryFromGesture = () => {
      if (!welcomeStarted.current)
        speakWelcome(true);
    };
    const timer = window.setTimeout(() => {
      updateVoiceAvailability();
      speakWelcome();
    }, 350);
    window.addEventListener("pointerdown", retryFromGesture);
    window.addEventListener("keydown", retryFromGesture);
    window.speechSynthesis.addEventListener("voiceschanged", updateVoiceAvailability);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", retryFromGesture);
      window.removeEventListener("keydown", retryFromGesture);
      window.speechSynthesis.removeEventListener("voiceschanged", updateVoiceAvailability);
      window.speechSynthesis.cancel();
    };
  }, [speakWelcome]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-backdrop flex min-h-screen items-center justify-center p-0 sm:p-5 lg:p-8">
      <div className="login-card page-enter grid min-h-screen w-full overflow-hidden bg-[#fbfaf6] shadow-2xl sm:min-h-[700px] sm:max-w-6xl sm:rounded-[30px] lg:grid-cols-2">
        <section
          aria-label="Niyojan Resto staff portal"
          className="login-visual relative flex min-h-[245px] flex-col justify-between overflow-hidden px-6 py-6 text-white sm:px-9 sm:py-8 lg:min-h-0 lg:px-12 lg:py-11"
        >
          <div className="login-visual-image absolute inset-0" />
          <div className="login-visual-shade absolute inset-0" />
          <div className="login-visual-glow absolute inset-0" />
          <div className="login-orbit login-orbit-one" />
          <div className="login-orbit login-orbit-two" />

          <div className="login-brand-row relative z-10 flex items-center justify-between gap-4">
            <BrandLogo name="Niyojan Resto" tone="dark" />
          </div>

          <div className="login-hero-copy relative z-10 mt-8 max-w-lg lg:mb-5 lg:mt-auto">
            <p className="login-eyebrow mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f0d7ab] backdrop-blur-md">
              <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
              Welcome to Niyojan
            </p>
            <h1 className="login-hero-title max-w-md text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
              Hospitality, made memorable.
            </h1>
            <p className="login-hero-description mt-3 max-w-sm text-sm leading-6 text-white/75 sm:mt-4 sm:text-base">
              Your workspace for thoughtful service and smooth restaurant operations.
            </p>
            <div className="mt-6 hidden items-center gap-3 text-xs text-white/75 sm:flex">
              <span className="h-px w-9 bg-[#e1bd83]" />
              हर मेहमान के लिए खास अनुभव
            </div>
          </div>
        </section>

        <section className="login-form-panel relative flex items-center justify-center px-6 py-8 sm:px-10 sm:py-10 lg:px-16">
          <div className="login-form-enter w-full max-w-[410px]">
            <div className="mb-8">
              <div className="login-access-badge mb-4 inline-flex items-center gap-2 rounded-full border border-[#dce9df] bg-[#edf3ef] px-3 py-1.5 text-xs font-semibold text-[#285543]">
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                  <path d="M6.5 8.5V6.8a3.5 3.5 0 0 1 7 0v1.7m-8.2 0h9.4c.7 0 1.3.6 1.3 1.3v6.1c0 .7-.6 1.3-1.3 1.3H5.3c-.7 0-1.3-.6-1.3-1.3V9.8c0-.7.6-1.3 1.3-1.3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                ADMIN & MANAGER ACCESS
              </div>
              <h2 className="login-heading font-display text-3xl font-semibold tracking-tight text-[#18352c] sm:text-[2.15rem]">
                Welcome back
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Sign in to your Niyojan workspace
                <span className="ml-1 text-slate-400">· लॉगिन करें</span>
              </p>
              <button type="button" onClick={() => speakWelcome(true)} className="login-voice-button mt-3 inline-flex min-h-9 items-center gap-2 rounded-full bg-[#edf3ef] px-3 text-xs font-semibold text-[#285543] transition hover:bg-[#dfece4]">
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8v4h3l4 3V5L6 8H3Z" />
                  <path d="M13 7a5 5 0 0 1 0 6m2-8a8 8 0 0 1 0 10" />
                </svg>
                Hear welcome
              </button>
              {!hindiVoiceAvailable ? (
                <p role="status" className="mt-2 text-xs leading-5 text-amber-700">
                  Hindi speech voice is not available in the browser yet. Restart the browser after the Windows Hindi speech voice is installed, then reload this page.
                </p>
              ) : null}
            </div>

            <form onSubmit={onSubmit} className="space-y-5" aria-busy={submitting}>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Username</span>
                <span className="login-input-wrap flex min-h-[54px] items-center gap-3 rounded-xl border border-[#dedfd8] bg-white px-3.5 transition-all duration-200">
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px] shrink-0 text-slate-400">
                    <circle cx="10" cy="6.3" r="3" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M4.2 16.4c.5-2.6 2.7-4.1 5.8-4.1s5.3 1.5 5.8 4.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    autoCapitalize="none"
                    required
                    className="min-w-0 flex-1 border-0 bg-transparent py-3 text-sm text-[#20372e] outline-none placeholder:text-slate-400"
                    placeholder="Enter your username"
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Password</span>
                <span className="login-input-wrap flex min-h-[54px] items-center gap-3 rounded-xl border border-[#dedfd8] bg-white px-3.5 transition-all duration-200">
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px] shrink-0 text-slate-400">
                    <rect x="4" y="8.2" width="12" height="9" rx="1.8" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M6.8 8.2V6.3a3.2 3.2 0 0 1 6.4 0v1.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className="min-w-0 flex-1 border-0 bg-transparent py-3 text-sm text-[#20372e] outline-none placeholder:text-slate-400"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="rounded-md p-1 text-slate-400 transition hover:text-[#18352c]"
                  >
                    {showPassword ? (
                      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5">
                        <path d="M3 3l14 14M8.6 8.7a2 2 0 0 0 2.7 2.7M6 5.4A10.7 10.7 0 0 1 10 4.5c4.3 0 7.3 3.6 8 5.5a8.8 8.8 0 0 1-2.1 3.1M4.3 6.5A9.1 9.1 0 0 0 2 10c.7 1.9 3.7 5.5 8 5.5 1 0 1.9-.2 2.7-.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5">
                        <path d="M2 10s2.7-5.5 8-5.5 8 5.5 8 5.5-2.7 5.5-8 5.5S2 10 2 10Z" stroke="currentColor" strokeWidth="1.5" />
                        <circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    )}
                  </button>
                </span>
              </label>

              {error ? (
                <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="login-submit group flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-[#18352c] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(24,53,44,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#244b3e] hover:shadow-[0_12px_24px_rgba(24,53,44,0.22)] disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in to workspace
                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4 transition-transform group-hover:translate-x-1">
                      <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="mt-7 flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-[#e9e9e3]" />
              <span>Protected staff sign-in</span>
              <span className="h-px flex-1 bg-[#e9e9e3]" />
            </div>
            <Link href="/" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#426b58] transition hover:text-[#18352c]">
              <span aria-hidden="true">←</span>
              Return to Niyojan website
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
