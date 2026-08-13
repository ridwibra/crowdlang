import Link from "next/link";
import { SITE_NAME } from "@/utils/constants";

const pageGuide = [
  {
    step: "01",
    icon: "🏠",
    title: "Start at the home page",
    description:
      "Use the home page to get an overview of CrowdLang and navigate to the parts of the platform you need.",
    actionLabel: "Go home",
    href: "/",
    actionClass: "bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500",
  },
  {
    step: "02",
    icon: "🎬",
    title: "Explore language reels",
    description:
      "Visit the Reels page to discover video and audio posts shared by contributors. Watch, listen, and explore content across languages.",
    actionLabel: "Explore reels",
    href: "/reel",
    actionClass: "bg-cyan-600 text-white hover:bg-cyan-700 focus:ring-cyan-500",
  },
  {
    step: "03",
    icon: "🗺️",
    title: "Explore language maps",
    description:
      "Visit the Language Maps page to explore where languages are spoken and discover language information geographically.",
    actionLabel: "View language maps",
    href: "/map",
    actionClass:
      "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500",
  },
  {
    step: "04",
    icon: "➕",
    title: "Share a reel",
    description:
      "Use the Add Reel page when you want to contribute a video or audio reel. Add a caption, choose a language, include tags, and provide a transcript or translation when available.",
    actionLabel: "Add a reel",
    href: "/reel/addreel",
    actionClass:
      "bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500",
  },
  {
    step: "05",
    icon: "👤",
    title: "Create an account",
    description:
      "Register for an account to become part of the CrowdLang community and access features that require signing in.",
    actionLabel: "Register",
    href: "/register",
    actionClass:
      "bg-slate-800 text-white hover:bg-slate-700 focus:ring-slate-500 dark:bg-slate-700",
  },
];

const reelGuide = [
  {
    icon: "📹",
    title: "Video reels",
    description:
      "Watch a contributor’s video, use the playback controls, and mute or unmute when you choose.",
  },
  {
    icon: "🎧",
    title: "Audio reels",
    description:
      "Listen to audio content using the built-in audio controls. Playback pauses when the reel leaves the screen.",
  },
  {
    icon: "📝",
    title: "Transcripts",
    description:
      "When a reel includes a transcript, select the Transcript button to read what was said.",
  },
  {
    icon: "🌐",
    title: "Translations",
    description:
      "When a translation is available, select Translation to read the content in English.",
  },
  {
    icon: "❤️",
    title: "Likes",
    description:
      "Use the Like button to show appreciation for reels you enjoy.",
  },
];
const languageDetailsGuide = [
  {
    icon: "🌍",
    title: "See where a language is spoken",
    description:
      "View the countries associated with the language from the language profile header.",
  },
  {
    icon: "🔤",
    title: "Explore alphabets",
    description:
      "View the writing systems and character sets that have been added for the language.",
  },
  {
    icon: "🔎",
    title: "Learn about letters",
    description:
      "Browse letters in each alphabet and view IPA pronunciation information when it is available.",
  },
  {
    icon: "📚",
    title: "Read essays",
    description:
      "Read language-related essays and see their category, learning level, author, tags, and images.",
  },
  {
    icon: "🌐",
    title: "Compare translations",
    description:
      "Read the original essay text alongside its English translation when one has been provided.",
  },
  {
    icon: "⌕",
    title: "Search learning material",
    description:
      "Search essays by title, original text, translation, category, level, or tags.",
  },
];
export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-teal-50 via-cyan-50 to-slate-100 dark:border-slate-800 dark:from-teal-950/40 dark:via-cyan-950/20 dark:to-slate-950">
        <div className="absolute -left-16 top-0 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl dark:bg-teal-500/10" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl dark:bg-cyan-500/10" />

        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-teal-200 bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-teal-700 shadow-sm backdrop-blur dark:border-teal-800 dark:bg-slate-900/70 dark:text-teal-300">
              CrowdLang guide
            </span>

            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl dark:text-white">
              How to use {SITE_NAME}
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8 dark:text-slate-300">
              Find the right page, discover language content, and share your own
              voice with the CrowdLang community.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/reel"
                className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
              >
                Explore reels
              </Link>

              <Link
                href="/register"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:ring-offset-slate-950"
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-600 dark:text-teal-400">
            Page guide
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Which page should you visit?
          </h2>

          <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
            Use this guide whenever you are unsure where to go next.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {pageGuide.map((item) => (
            <article
              key={item.title}
              className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="absolute right-5 top-4 text-5xl font-black text-slate-100 dark:text-slate-800">
                {item.step}
              </span>

              <span
                aria-hidden="true"
                className="relative inline-flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-2xl dark:bg-teal-950/60"
              >
                {item.icon}
              </span>

              <h3 className="relative mt-5 text-xl font-bold">{item.title}</h3>

              <p className="relative mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {item.description}
              </p>

              <Link
                href={item.href}
                className={`relative mt-5 inline-flex rounded-xl px-4 py-2.5 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${item.actionClass}`}
              >
                {item.actionLabel}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-600 dark:text-teal-400">
              Using reels
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Learn from every post.
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
              Reels can include video or audio, along with useful language
              details added by contributors.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {reelGuide.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950"
              >
                <span aria-hidden="true" className="text-3xl">
                  {item.icon}
                </span>

                <h3 className="mt-4 text-lg font-bold">{item.title}</h3>

                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-600 dark:text-teal-400">
            Language details
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Explore a language in more detail.
          </h2>

          <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
            Select a language from the home page to explore its writing systems,
            reading material, translations, and the places where it is spoken.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {languageDetailsGuide.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
            >
              <span
                aria-hidden="true"
                className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-2xl dark:bg-indigo-950/60"
              >
                {item.icon}
              </span>

              <h3 className="mt-4 text-lg font-bold">{item.title}</h3>

              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {item.description}
              </p>
            </article>
          ))}
        </div>

        <Link
          href="/"
          className="mt-8 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
        >
          Browse languages
        </Link>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span
              aria-hidden="true"
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100 text-2xl dark:bg-cyan-950/60"
            >
              ✅
            </span>

            <h2 className="mt-5 text-2xl font-black">Before sharing a reel</h2>

            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <li className="flex gap-3">
                <span aria-hidden="true" className="font-bold text-teal-600">
                  ✓
                </span>
                Choose whether you want to share a video or audio reel.
              </li>

              <li className="flex gap-3">
                <span aria-hidden="true" className="font-bold text-teal-600">
                  ✓
                </span>
                Select the language that best matches your content.
              </li>

              <li className="flex gap-3">
                <span aria-hidden="true" className="font-bold text-teal-600">
                  ✓
                </span>
                Add a clear caption and useful tags to help others discover it.
              </li>

              <li className="flex gap-3">
                <span aria-hidden="true" className="font-bold text-teal-600">
                  ✓
                </span>
                Add a transcript or English translation whenever it is
                available.
              </li>
            </ul>

            <Link
              href="/reel/addreel"
              className="mt-7 inline-flex rounded-xl bg-cyan-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
              Create a reel
            </Link>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-700 p-7 text-white shadow-xl">
            <span
              aria-hidden="true"
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-2xl"
            >
              🌍
            </span>

            <h2 className="mt-5 text-2xl font-black">
              Help languages stay visible.
            </h2>

            <p className="mt-4 text-sm leading-7 text-cyan-50">
              Every reel can help another person hear a new language, learn an
              expression, or reconnect with a culture. Share respectfully and
              add context whenever you can.
            </p>

            <Link
              href="/reel"
              className="mt-7 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-teal-700 transition hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-teal-600"
            >
              Discover reels
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-100/70 py-16 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-600 dark:text-teal-400">
            Ready to begin?
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Discover a language, then share your voice.
          </h2>

          <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
            Start exploring the CrowdLang community today.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/reel"
              className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
            >
              Explore reels
            </Link>

            <Link
              href="/register"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:ring-offset-slate-950"
            >
              Register
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
