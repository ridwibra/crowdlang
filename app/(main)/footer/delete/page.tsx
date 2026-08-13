import Link from "next/link";
import { SENDER_EMAIL_ADDRESS, SITE_NAME } from "@/utils/constants";

const lastUpdated = "August 12, 2026";

export default function DeletePage() {
  const emailSubject = encodeURIComponent(
    `${SITE_NAME} account deletion request`,
  );

  const emailBody = encodeURIComponent(
    `Hello ${SITE_NAME} team,

I would like to request deletion of my CrowdLang account and associated personal information.

Account email address:
Display name, if different:

Please confirm once my request has been received.

Thank you.`,
  );

  return (
    <main className="min-h-screen bg-slate-50 py-8 text-slate-900 dark:bg-slate-950 dark:text-white sm:py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="h-2 bg-gradient-to-r from-red-500 via-rose-500 to-orange-500" />

          <div className="border-b border-slate-200 bg-gradient-to-br from-red-50 via-rose-50 to-slate-50 px-6 py-10 dark:border-slate-800 dark:from-red-950/30 dark:via-rose-950/20 dark:to-slate-900 sm:px-10">
            <span className="inline-flex rounded-full border border-red-200 bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-red-700 shadow-sm dark:border-red-500/20 dark:bg-slate-900/70 dark:text-red-300">
              Account and privacy
            </span>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              Account Deletion Policy
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
              Learn how to request deletion of your CrowdLang account, personal
              information, and content associated with your profile.
            </p>

            <p className="mt-5 text-sm font-medium text-slate-500 dark:text-slate-400">
              Last updated: {lastUpdated}
            </p>
          </div>

          <div className="px-6 py-8 sm:px-10 sm:py-10">
            <section className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-500/20 dark:bg-red-500/10">
              <div className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-600 text-sm font-black text-white"
                >
                  !
                </span>

                <div>
                  <h2 className="font-bold text-red-900 dark:text-red-100">
                    Account deletion is permanent
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-red-800 dark:text-red-200">
                    Once your account and associated information are deleted,
                    you may lose access to your profile and account-based
                    features. Some information may remain temporarily in secure
                    backups or where retention is required by law.
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-10">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-600 dark:text-teal-400">
                Request deletion
              </p>

              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                How to request account deletion
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
                Send an account deletion request to our support email. Include
                the email address associated with your CrowdLang account so we
                can verify the request and protect your account from
                unauthorized deletion.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={`mailto:${SENDER_EMAIL_ADDRESS}?subject=${emailSubject}&body=${emailBody}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                >
                  Request account deletion
                </a>

                <a
                  href={`mailto:${SENDER_EMAIL_ADDRESS}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus:ring-offset-slate-900"
                >
                  Contact support
                </a>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/40">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Include the following information
                </p>

                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  <li className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="font-bold text-teal-600 dark:text-teal-400"
                    >
                      ✓
                    </span>
                    The email address associated with your CrowdLang account
                  </li>

                  <li className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="font-bold text-teal-600 dark:text-teal-400"
                    >
                      ✓
                    </span>
                    Your display name, if it differs from your email identity
                  </li>

                  <li className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="font-bold text-teal-600 dark:text-teal-400"
                    >
                      ✓
                    </span>
                    Whether you want to request deletion of specific public
                    content in addition to your account
                  </li>
                </ul>
              </div>
            </section>

            <section className="mt-10">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-600 dark:text-teal-400">
                What deletion covers
              </p>

              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Information we will review for deletion
              </h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-lg dark:bg-red-950/50"
                  >
                    👤
                  </span>

                  <h3 className="mt-4 font-bold text-slate-900 dark:text-white">
                    Account information
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Your account profile, email address, display name, profile
                    image, authentication connections, sessions, and account
                    preferences.
                  </p>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-lg dark:bg-red-950/50"
                  >
                    🎬
                  </span>

                  <h3 className="mt-4 font-bold text-slate-900 dark:text-white">
                    Personal contributions
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Content directly associated with your account, such as
                    reels, comments, likes, uploaded media, and other
                    profile-linked content, subject to our review process.
                  </p>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-lg dark:bg-red-950/50"
                  >
                    🛡️
                  </span>

                  <h3 className="mt-4 font-bold text-slate-900 dark:text-white">
                    Security records
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Some limited records may be retained when necessary for
                    security, fraud prevention, legal obligations, or resolving
                    disputes.
                  </p>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-lg dark:bg-red-950/50"
                  >
                    💾
                  </span>

                  <h3 className="mt-4 font-bold text-slate-900 dark:text-white">
                    Backup information
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Deleted information may remain temporarily in protected
                    backups until those backups are replaced or expire under our
                    normal retention process.
                  </p>
                </article>
              </div>
            </section>

            <section className="mt-10">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-600 dark:text-teal-400">
                What happens next
              </p>

              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Our deletion request process
              </h2>

              <ol className="mt-6 space-y-4">
                <li className="flex gap-4">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-black text-white">
                    1
                  </span>

                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      We receive your request
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      We review your request and may contact you if additional
                      information is needed.
                    </p>
                  </div>
                </li>

                <li className="flex gap-4">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-black text-white">
                    2
                  </span>

                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      We verify ownership
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      We may verify that the request comes from the account
                      owner before making irreversible changes.
                    </p>
                  </div>
                </li>

                <li className="flex gap-4">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-black text-white">
                    3
                  </span>

                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      We process the request
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      We delete or de-identify eligible account information and
                      content, subject to applicable legal, security, and backup
                      retention requirements.
                    </p>
                  </div>
                </li>

                <li className="flex gap-4">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-black text-white">
                    4
                  </span>

                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      We confirm completion
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      We will send a confirmation to the email address used for
                      the request when the deletion process is complete or when
                      additional action is required.
                    </p>
                  </div>
                </li>
              </ol>
            </section>

            <section className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/20 dark:bg-amber-500/10">
              <h2 className="text-lg font-black text-amber-900 dark:text-amber-100">
                Content contributed to the community
              </h2>

              <p className="mt-3 text-sm leading-6 text-amber-800 dark:text-amber-200">
                Certain contributions may be reviewed separately when they have
                become part of shared community language resources. If you want
                specific public content removed, identify that content clearly
                in your request so we can review it.
              </p>
            </section>

            <section className="mt-10">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-600 dark:text-teal-400">
                Questions
              </p>

              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Need help with a deletion request?
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
                Contact us at{" "}
                <a
                  href={`mailto:${SENDER_EMAIL_ADDRESS}?subject=${encodeURIComponent(
                    `${SITE_NAME} account deletion question`,
                  )}`}
                  className="font-semibold text-teal-700 underline underline-offset-2 hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-100"
                >
                  {SENDER_EMAIL_ADDRESS}
                </a>
                .
              </p>
            </section>

            <div className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <p>
                Please also review our{" "}
                <Link
                  href="/footer/privacy"
                  className="font-semibold text-teal-700 underline underline-offset-2 hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-100"
                >
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link
                  href="/footer/terms"
                  className="font-semibold text-teal-700 underline underline-offset-2 hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-100"
                >
                  Terms of Service
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
