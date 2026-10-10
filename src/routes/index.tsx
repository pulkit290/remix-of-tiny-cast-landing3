import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLink } from "@/components/auth-link";
import type { ReactNode } from "react";
import { ArrowRight, MousePointerClick, Globe, Bug, Timer, KeyRound, Server, Camera, ListOrdered, Radio, AlertTriangle, FileText } from "lucide-react";
import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-shell";
// Served as a plain static file from public/ so it plays on every host (Lovable and Vercel).
const demoVideoUrl = "/videos/poolabs-demo.mp4";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Poolabs — Put AI users inside your app before real users do" },
      { name: "description", content: "Poolabs launches multiple autonomous AI users in separate browser sessions to test real multi-user workflows." },
      { property: "og:title", content: "Poolabs — Multi-user AI testing" },
      { property: "og:description", content: "Autonomous AI users interact with each other inside your app to test multi-role flows in real browsers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const steps = ["Add your app URL", "Define AI users & roles", "Give each user a goal", "Start the run", "Review every action"];

const records: [string, string, [typeof MousePointerClick, string], [typeof MousePointerClick, string]][] = [
  ["Action timeline", "Every step each AI user took, in the exact order it happened.", [MousePointerClick, "AI user"], [ListOrdered, "Timeline"]],
  ["Live browser state", "Where each user is right now while the run is going.", [Globe, "Browser"], [Radio, "Live view"]],
  ["Screenshots", "Captured from the real browser after actions and on finish.", [MousePointerClick, "Action"], [Camera, "Screenshot"]],
  ["Issues with evidence", "Problems logged with severity and the steps that led there.", [Bug, "Failed step"], [AlertTriangle, "Issue"]],
  ["Run outcome & report", "Pass, fail, partial or error with duration and summary. Copy, export or share it.", [Timer, "Run"], [FileText, "Report"]],
];


const faq: [string, string][] = [
  ["What do I need to run a test?", "A Poolabs account, a publicly reachable URL for your app, and the browser worker deployed with its address and secret added to the app. Without the worker, runs are marked as not started."],
  ["Do AI users need real accounts?", "If your flow needs sign-in, give each AI user a test account. Only the email is stored here; passwords stay on your worker."],
  ["How many users per test?", "As many as your scenario needs. Each gets its own isolated browser context."],
  ["Is anything simulated?", "No. Every status and action you see was reported by a real browser session."],
];

const pill = "press inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 font-bold uppercase tracking-wide text-primary-foreground shadow-[0_8px_30px_-6px_var(--glow)] transition-transform hover:-translate-y-0.5";

function Sticker({ icon: Icon, className }: { icon: typeof Server; className: string }) {
  return (
    <span className={`inline-flex h-12 w-12 shrink-0 -rotate-6 items-center justify-center rounded-2xl border-2 border-ink transition-transform duration-300 group-hover:rotate-0 ${className}`}>
      <Icon className="h-5 w-5" />
    </span>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-sun p-3 md:p-6">
      <div className="relative overflow-hidden rounded-[2rem] bg-ink text-paper">
        <div aria-hidden data-parallax="0.2" className="pointer-events-none absolute inset-x-0 top-[-30%]">
          <div className="mx-auto h-[1400px] w-[1400px] rounded-full opacity-25"
            style={{ background: "repeating-radial-gradient(circle, transparent 0 58px, var(--paper) 58px 60px)" }} />
        </div>

        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-6 sm:py-6">
          <Logo />
          <nav className="hidden items-center gap-7 rounded-full bg-paper px-7 py-2.5 text-xs font-bold uppercase text-ink md:flex">
            <a href="#how" className="story-link">How it works</a><a href="#records" className="story-link">What you get</a><Link to="/about" className="story-link">About</Link><AuthLink to="/login" className="story-link">Sign in</AuthLink>
          </nav>
          <AuthLink to="/signup" className="press rounded-full bg-primary px-5 py-2.5 text-xs font-bold uppercase text-primary-foreground">Get started</AuthLink>
        </header>

        <section className="relative z-10 mx-auto max-w-4xl px-6 pb-20 pt-14 text-center">
          <p className="reveal font-mono text-xs uppercase tracking-[0.25em] text-primary">Multi-user AI testing</p>
          <h1 className="reveal reveal-1 mt-4 text-5xl leading-[0.95] sm:text-6xl md:text-8xl">Put AI users<br />inside your app</h1>
          <p className="reveal reveal-2 mx-auto mt-6 max-w-lg text-paper/75">
            Poolabs launches multiple autonomous AI users in separate browser sessions and makes them interact with your application — and with each other — like real customers.
          </p>
          <div className="reveal reveal-2 mt-9 flex flex-wrap justify-center gap-3">
            <AuthLink to="/signup" className={pill} signedIn={<>Go to dashboard <ArrowRight className="h-4 w-4" /></>}>Test my app <ArrowRight className="h-4 w-4" /></AuthLink>
            <a href="#how" className="press inline-flex items-center rounded-full border-2 border-paper px-7 py-3 font-bold uppercase tracking-wide">See how it works</a>
          </div>
        </section>


        <section className="relative z-10 mx-auto max-w-4xl px-6 pb-24">
          <p className="reveal text-center font-mono text-xs uppercase tracking-[0.3em] text-primary">See it in action</p>
          <div className="reveal reveal-1 mt-6 overflow-hidden rounded-[2rem] border border-paper/15 shadow-2xl">
            <video src={demoVideo.url} controls playsInline preload="metadata" className="block aspect-video w-full bg-ink" />
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
          <p className="reveal text-center font-mono text-xs uppercase tracking-[0.3em] text-primary">Why multi-user testing</p>
          <h2 className="reveal reveal-1 mx-auto mt-4 max-w-3xl text-center text-4xl leading-none sm:text-5xl md:text-6xl">Most bugs only show up when two people use your app at once</h2>
          <div className="mt-14 grid gap-10 border-t border-paper/15 pt-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-paper/15">
            {[
              ["Real browsers, side by side", "Each AI user gets its own isolated browser session with its own cookies and login, so a host and a guest really are two different people to your app."],
              ["Goals, not scripts", "You describe what each user wants to achieve. The AI decides what to click and type, so changes to your layout do not break the test."],
              ["Proof for every step", "Every click, page and error is recorded with screenshots from the actual browser. If nothing ran, the run says so instead of guessing."],
            ].map(([t, d], i) => (
              <div key={t} className={`reveal reveal-${i + 1} md:px-8 first:md:pl-0 last:md:pr-0`}>
                <span className="font-display text-3xl text-primary">0{i + 1}</span>
                <h3 className="mt-2 text-2xl">{t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-paper/70">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="relative z-10 mx-2 rounded-t-[2rem] border-t-[10px] border-accent bg-paper px-6 pb-20 pt-14 text-ink md:mx-10">
          <section id="how" className="mx-auto max-w-5xl">
            <h2 data-reveal className="text-4xl sm:text-5xl">How it works</h2>
            <ol className="relative mt-10 space-y-8 border-l-4 border-accent pl-8">
              {steps.map((s, i) => (
                <li key={s} data-reveal style={{ ["--d" as string]: `${i * 0.08}s` }} className="relative">
                  <span className="absolute -left-[3.05rem] top-0 flex h-9 w-9 items-center justify-center rounded-full bg-ink font-display text-lg text-primary">{i + 1}</span>
                  <p className="text-xl font-semibold">{s}</p>
                </li>
              ))}
            </ol>
          </section>

          <section id="records" className="mx-auto mt-24 max-w-5xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-5xl md:text-6xl">What every run records</h2>
              <p className="max-w-xs text-sm font-medium opacity-70">Nothing here is estimated. Each item is written only from what the browsers actually did.</p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-4 md:grid-rows-2">
              {/* Feature tile */}
              <article data-reveal className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-ink bg-sun p-7 shadow-[6px_6px_0_0_var(--ink)] transition-transform duration-300 hover:-translate-y-1.5 hover:rotate-[-0.4deg] active:scale-[0.99] md:col-span-2 md:row-span-2 md:p-9">
                <div>
                  <Sticker icon={ListOrdered} className="bg-ink text-sun" />
                  <h3 className="mt-6 text-5xl leading-[0.9] md:text-6xl">Action<br />timeline</h3>
                  <p className="mt-4 max-w-sm text-sm font-medium leading-relaxed text-ink/75">{records[0]![1]}</p>
                </div>
                <div className="mt-8">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/60">Step types recorded</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["click", "type", "navigate", "wait", "done", "fail"].map((k) => (
                      <span key={k} className="rounded-full border-2 border-ink bg-paper px-3 py-1 font-mono text-xs font-semibold">{k}</span>
                    ))}
                  </div>
                </div>
              </article>

              {[
                { r: records[1]!, icon: Radio, tone: "bg-ink text-paper", sticker: "bg-sun text-ink" },
                { r: records[2]!, icon: Camera, tone: "bg-pop-teal text-ink", sticker: "bg-ink text-pop-teal" },
                { r: records[3]!, icon: Bug, tone: "bg-pop-pink text-ink", sticker: "bg-ink text-pop-pink" },
                { r: records[4]!, icon: FileText, tone: "bg-paper text-ink", sticker: "bg-ink text-sun" },
              ].map(({ r, icon, tone, sticker }, i) => (
                <article key={r[0]} data-reveal style={{ ["--d" as string]: `${(i + 1) * 0.08}s` }} className={`group flex flex-col rounded-3xl border-2 border-ink p-6 shadow-[6px_6px_0_0_var(--ink)] transition-transform duration-300 hover:-translate-y-1.5 hover:rotate-[-0.4deg] active:scale-[0.99] ${tone}`}>
                  <div className="flex items-start justify-between">
                    <Sticker icon={icon} className={sticker} />
                    <span className="font-mono text-xs opacity-60">0{i + 2}</span>
                  </div>
                  <h3 className="mt-6 text-3xl leading-[0.95]">{r[0]}</h3>
                  <p className="mt-2 text-sm leading-relaxed opacity-75">{r[1]}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mx-auto mt-6 max-w-5xl">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                [Server, "Runs on your worker", <>Browsers run in a separate Node + Playwright service you deploy. It authenticates to Poolabs with a shared secret.</>, "bg-pop-purple text-paper", "bg-paper text-pop-purple"],
                [KeyRound, "Passwords stay with you", <>Only test account emails are saved here. Passwords never leave your worker. <Link to="/security" className="font-semibold underline underline-offset-4">Read about security</Link>.</>, "bg-pop-green text-ink", "bg-ink text-pop-green"],
              ].map(([Icon, t, d, tone, sticker], i) => (
                <article key={t as string} data-reveal style={{ ["--d" as string]: `${i * 0.1}s` }} className={`flex items-start gap-5 rounded-3xl border-2 border-ink p-7 shadow-[6px_6px_0_0_var(--ink)] transition-transform duration-300 hover:-translate-y-1.5 hover:rotate-[-0.4deg] active:scale-[0.99] ${tone as string}`}>
                  <Sticker icon={Icon as typeof Server} className={sticker as string} />
                  <div>
                    <h3 className="text-3xl leading-[0.95]">{t as string}</h3>
                    <p className="mt-2 text-sm leading-relaxed opacity-85">{d as ReactNode}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mx-auto mt-20 max-w-3xl">
            <h2 data-reveal className="text-4xl sm:text-5xl">Questions</h2>
            <div className="mt-6 divide-y-2 divide-ink border-y-2 border-ink">
              {faq.map(([q, a]) => (
                <details key={q} className="group py-4">
                  <summary className="cursor-pointer list-none font-semibold">{q}<span className="float-right transition-transform group-open:rotate-45">+</span></summary>
                  <p className="mt-2 text-sm opacity-80">{a}</p>
                </details>
              ))}
            </div>
            <div className="mt-16 flex justify-center">
              <AuthLink to="/signup" className={pill} signedIn={<>Go to dashboard <ArrowRight className="h-4 w-4" /></>}>Test my app <ArrowRight className="h-4 w-4" /></AuthLink>
            </div>
          </section>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
