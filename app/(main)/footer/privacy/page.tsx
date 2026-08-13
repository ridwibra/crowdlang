import Link from "next/link";
import { SENDER_EMAIL_ADDRESS, SITE_NAME } from "@/utils/constants";

const lastUpdated = "August 12, 2026";

const sections = [
  {
    id: "overview",
    title: "1. Overview",
    content: (
      <>
        <p>
          {SITE_NAME} (“CrowdLang,” “we,” “us,” or “our”) respects your privacy.
          This Privacy Policy explains how we collect, use, store, and share
          information when you use our website, language tools, maps, reels,
          translations, and related services (collectively, the “Service”).
        </p>

        <p className="mt-4">
          By using CrowdLang, you understand that your information may be
          handled as described in this Privacy Policy.
        </p>
      </>
    ),
  },
  {
    id: "information-we-collect",
    title: "2. Information we collect",
    content: (
      <>
        <p>
          We collect information you provide directly, information associated
          with your account, and limited technical information needed to operate
          and secure the Service.
        </p>

        <h3 className="mt-6 text-lg font-bold text-slate-900 dark:text-white">
          Information you provide
        </h3>

        <ul className="mt-3 space-y-3">
          <li className="flex gap-3">
            <span aria-hidden="true" className="font-bold text-teal-600">
              ✓
            </span>
            Account details, such as your name, email address, and profile
            image.
          </li>

          <li className="flex gap-3">
            <span aria-hidden="true" className="font-bold text-teal-600">
              ✓
            </span>
            Language information you submit, including language names, countries
            or territories, alphabets, letters, and pronunciation information.
          </li>

          <li className="flex gap-3">
            <span aria-hidden="true" className="font-bold text-teal-600">
              ✓
            </span>
            User Content, such as reels, audio, video, captions, transcripts,
            translations, essays, images, comments, tags, and likes.
          </li>

          <li className="flex gap-3">
            <span aria-hidden="true" className="font-bold text-teal-600">
              ✓
            </span>
            Messages or requests you send to us through email or forms.
          </li>
        </ul>

        <h3 className="mt-6 text-lg font-bold text-slate-900 dark:text-white">
          Information from sign-in providers
        </h3>

        <p className="mt-3">
          If you sign in with a third-party provider, such as Google, GitHub,
          Facebook, or Microsoft, we may receive information made available by
          that provider, such as your name, email address, profile image, and
          provider-specific account identifier.
        </p>

        <p className="mt-4">
          We do not receive or store your third-party provider password.
        </p>

        <h3 className="mt-6 text-lg font-bold text-slate-900 dark:text-white">
          Technical and usage information
        </h3>

        <p className="mt-3">
          We may automatically process limited technical information required to
          provide the Service, such as session identifiers, browser information,
          device information, IP address, security logs, and actions needed to
          help prevent fraud, misuse, or unauthorized access.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use-information",
    title: "3. How we use information",
    content: (
      <>
        <p>We use information to operate, maintain, and improve CrowdLang.</p>

        <ul className="mt-4 space-y-3">
          <li className="flex gap-3">
            <span aria-hidden="true" className="font-bold text-teal-600">
              ✓
            </span>
            Create and manage accounts, sessions, and authentication.
          </li>

          <li className="flex gap-3">
            <span aria-hidden="true" className="font-bold text-teal-600">
              ✓
            </span>
            Display and organize user-submitted language information and User
            Content.
          </li>

          <li className="flex gap-3">
            <span aria-hidden="true" className="font-bold text-teal-600">
              ✓
            </span>
            Process likes, comments, edits, deletions, and other actions you
            take through the Service.
          </li>

          <li className="flex gap-3">
            <span aria-hidden="true" className="font-bold text-teal-600">
              ✓
            </span>
            Protect CrowdLang, its users, and the public from harmful,
            fraudulent, or unauthorized activity.
          </li>

          <li className="flex gap-3">
            <span aria-hidden="true" className="font-bold text-teal-600">
              ✓
            </span>
            Respond to support requests, legal obligations, and important
            service communications.
          </li>
        </ul>

        <p className="mt-5">We do not sell your personal information.</p>
      </>
    ),
  },
  {
    id: "public-content",
    title: "4. Public content and profile information",
    content: (
      <>
        <p>
          Some information is intended to be visible to other users or visitors
          of CrowdLang. This may include your display name, profile image,
          language contributions, reels, captions, essays, translations,
          comments, likes, and other content you choose to submit publicly.
        </p>

        <p className="mt-4">
          Do not share sensitive personal information in public content. Once
          content is public, other people may view, copy, or share it outside
          CrowdLang.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "5. Cookies and session technology",
    content: (
      <>
        <p>
          CrowdLang uses cookies or similar technologies that are necessary for
          features such as authentication, session management, security, and
          remembering certain preferences.
        </p>

        <p className="mt-4">
          You can control cookies through your browser settings. However,
          disabling cookies may prevent some parts of the Service from working
          correctly, including account sign-in.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "6. How information is shared",
    content: (
      <>
        <p>
          We do not sell personal information. We may share information only in
          limited circumstances, including:
        </p>

        <ul className="mt-4 space-y-3">
          <li className="flex gap-3">
            <span aria-hidden="true" className="font-bold text-teal-600">
              ✓
            </span>
            With service providers that help us operate the Service, such as
            hosting, database, authentication, storage, or email providers.
          </li>

          <li className="flex gap-3">
            <span aria-hidden="true" className="font-bold text-teal-600">
              ✓
            </span>
            With third-party sign-in providers when you choose to use their
            authentication services.
          </li>

          <li className="flex gap-3">
            <span aria-hidden="true" className="font-bold text-teal-600">
              ✓
            </span>
            When required by law, regulation, subpoena, court order, or other
            valid legal process.
          </li>

          <li className="flex gap-3">
            <span aria-hidden="true" className="font-bold text-teal-600">
              ✓
            </span>
            When reasonably necessary to protect the rights, safety, security,
            or integrity of CrowdLang, our users, or others.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "retention",
    title: "7. Data retention",
    content: (
      <>
        <p>
          We retain personal information for as long as reasonably necessary to
          operate the Service, maintain records, comply with legal obligations,
          resolve disputes, and enforce our agreements.
        </p>

        <p className="mt-4">
          Public content may remain visible until it is deleted, removed, or no
          longer needed for the operation of the Service. Certain information
          may remain in backups or logs for a limited period after deletion.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "8. Security",
    content: (
      <>
        <p>
          We use reasonable administrative, technical, and organizational
          measures designed to protect information from unauthorized access,
          alteration, loss, or misuse.
        </p>

        <p className="mt-4">
          However, no website, internet transmission, or storage system can be
          guaranteed to be completely secure. Please use a strong password and
          protect access to your connected sign-in accounts.
        </p>
      </>
    ),
  },
  {
    id: "rights",
    title: "9. Your choices and rights",
    content: (
      <>
        <p>
          Depending on where you live and applicable law, you may have rights to
          request access to, correction of, deletion of, or a copy of your
          personal information.
        </p>

        <p className="mt-4">
          You may also request account deletion through our{" "}
          <Link
            href="/footer/delete"
            className="font-semibold text-teal-700 underline underline-offset-2 hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-100"
          >
            Account Deletion Policy
          </Link>
          .
        </p>

        <p className="mt-4">
          To make a privacy request, contact us using the email address listed
          below. We may need to verify your identity before fulfilling a
          request.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "10. Children’s privacy",
    content: (
      <>
        <p>
          CrowdLang is not directed to children under 13, and we do not
          knowingly collect personal information from children under 13.
        </p>

        <p className="mt-4">
          If you believe a child has provided personal information to CrowdLang,
          please contact us so we can review and take appropriate action.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "11. Changes to this Privacy Policy",
    content: (
      <>
        <p>
          We may update this Privacy Policy from time to time. When we do, we
          will revise the “Last updated” date at the top of this page.
        </p>

        <p className="mt-4">
          If we make a material change to how we handle personal information, we
          may provide additional notice through the Service or another
          reasonable method.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "12. Contact us",
    content: (
      <p>
        If you have questions, concerns, or requests about this Privacy Policy
        or your personal information, contact us at{" "}
        <a
          href={`mailto:${SENDER_EMAIL_ADDRESS}?subject=${encodeURIComponent(
            `${SITE_NAME} privacy question`,
          )}`}
          className="font-semibold text-teal-700 underline underline-offset-2 hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-100"
        >
          {SENDER_EMAIL_ADDRESS}
        </a>
        .
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-8 text-slate-900 dark:bg-slate-950 dark:text-white sm:py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="h-2 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600" />

          <div className="border-b border-slate-200 bg-gradient-to-br from-teal-50 via-cyan-50 to-slate-50 px-6 py-10 dark:border-slate-800 dark:from-teal-950/30 dark:via-cyan-950/20 dark:to-slate-900 sm:px-10">
            <span className="inline-flex rounded-full border border-teal-200 bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-teal-700 shadow-sm dark:border-teal-500/20 dark:bg-slate-900/70 dark:text-teal-300">
              Legal
            </span>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              Privacy Policy
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
              This policy explains how {SITE_NAME} handles account information,
              community content, cookies, and other personal information.
            </p>

            <p className="mt-5 text-sm font-medium text-slate-500 dark:text-slate-400">
              Last updated: {lastUpdated}
            </p>
          </div>

          <div className="px-6 py-8 sm:px-10 sm:py-10">
            <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4 text-sm leading-6 text-teal-900 dark:border-teal-500/20 dark:bg-teal-950/20 dark:text-teal-100">
              <p className="font-bold">Privacy at a glance</p>

              <p className="mt-1">
                We use your information to provide CrowdLang, manage accounts,
                display the content you choose to share, and protect the
                community. We do not sell your personal information.
              </p>
            </div>

            <div className="mt-10 space-y-10">
              {sections.map((section) => (
                <section key={section.id} id={section.id}>
                  <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white sm:text-2xl">
                    {section.title}
                  </h2>

                  <div className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
                    {section.content}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <p>
                Please also review our{" "}
                <Link
                  href="/footer/terms"
                  className="font-semibold text-teal-700 underline underline-offset-2 hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-100"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/footer/delete"
                  className="font-semibold text-teal-700 underline underline-offset-2 hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-100"
                >
                  Account Deletion Policy
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
