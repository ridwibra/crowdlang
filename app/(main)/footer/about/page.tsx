import Link from "next/link";
import { SENDER_EMAIL_ADDRESS, SITE_NAME } from "@/utils/constants";

const values = [
  {
    icon: "🗣️",
    title: "Every voice matters",
    description:
      "We believe every language carries stories, knowledge, humour, and identity worth sharing.",
  },
  {
    icon: "🤝",
    title: "Built together",
    description:
      "Our community grows through contributions from speakers, learners, teachers, and culture keepers.",
  },
  {
    icon: "🌍",
    title: "Connection across cultures",
    description:
      "We make it easier to discover languages and connect with people beyond borders.",
  },
];

const guidelines = [
  "Treat every language, culture, and contributor with respect.",
  "Share content you have the right to post.",
  "Use clear, respectful language when sharing content.",
  "Help protect cultural knowledge by adding context where appropriate.",
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-teal-50 via-cyan-50 to-slate-100 dark:border-slate-800 dark:from-teal-950/40 dark:via-cyan-950/20 dark:to-slate-950">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl dark:bg-teal-500/10" />
        <div className="absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl dark:bg-cyan-500/10" />

        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-teal-200 bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-teal-700 shadow-sm backdrop-blur dark:border-teal-800 dark:bg-slate-900/70 dark:text-teal-300">
              About {SITE_NAME}
            </span>

            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl dark:text-white">
              Languages live through the people who speak them.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8 dark:text-slate-300">
              {SITE_NAME} is a community space for celebrating languages,
              cultures, and the people who keep them alive through everyday
              speech, stories, knowledge, and creativity.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/how-it-works"
                className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
              >
                How CrowdLang works
              </Link>

              <Link
                href="/register"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:ring-offset-slate-950"
              >
                Join CrowdLang
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-600 dark:text-teal-400">
              Our mission
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Make language sharing more human.
            </h2>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
              Language is more than vocabulary and grammar. It carries family
              memories, history, traditions, creativity, and ways of seeing the
              world. {SITE_NAME} was built to give people a welcoming place to
              recognise, preserve, and celebrate this living knowledge.
            </p>

            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
              Whether you are fluent, learning your first phrase, teaching
              others, or reconnecting with your heritage, you belong here.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-600 dark:text-teal-400">
              What guides us
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              A welcoming place for every learner and speaker.
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
              We want CrowdLang to be a respectful space where people can value
              language diversity and learn from one another with care.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {values.map((value) => (
              <article
                key={value.title}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950"
              >
                <span aria-hidden="true" className="text-3xl">
                  {value.icon}
                </span>

                <h3 className="mt-4 text-lg font-bold">{value.title}</h3>

                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {value.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-600 dark:text-teal-400">
              Community first
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Help keep the space respectful.
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
              A strong community depends on thoughtful participation. We ask
              everyone to contribute with care and respect for the people,
              experiences, and cultures represented on CrowdLang.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <ul className="space-y-4">
              {guidelines.map((guideline) => (
                <li
                  key={guideline}
                  className="flex items-start gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white"
                  >
                    ✓
                  </span>

                  {guideline}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-700 px-6 py-12 text-center shadow-xl sm:px-12">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-100">
            Add your voice
          </p>

          <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-4xl">
            Your language has a story worth sharing.
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-cyan-50">
            Join the CrowdLang community and help ensure languages, stories, and
            cultural knowledge remain visible for future generations.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-teal-700 transition hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-teal-600"
            >
              Join the community
            </Link>

            <a
              href={`mailto:${SENDER_EMAIL_ADDRESS}?subject=${encodeURIComponent(
                `Question about ${SITE_NAME}`,
              )}`}
              aria-label={`Email ${SITE_NAME} support`}
              className="rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-teal-600"
            >
              Contact us
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
