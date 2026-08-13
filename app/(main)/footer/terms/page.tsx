import Link from "next/link";
import { SENDER_EMAIL_ADDRESS, SITE_NAME } from "@/utils/constants";

const lastUpdated = "August 12, 2026";

const sections = [
  {
    id: "acceptance",
    title: "1. Acceptance of these Terms",
    content: (
      <>
        <p>
          These Terms of Service govern your access to and use of {SITE_NAME},
          including our website, language information, maps, reels, audio,
          video, translations, comments, and related services (collectively, the
          “Service”).
        </p>

        <p className="mt-4">
          By accessing or using the Service, you agree to these Terms. If you do
          not agree, please do not use the Service.
        </p>
      </>
    ),
  },
  {
    id: "service",
    title: "2. Using CrowdLang",
    content: (
      <>
        <p>
          {SITE_NAME} is a community platform for discovering, sharing, and
          preserving language knowledge. You may use the Service only in
          accordance with these Terms and all applicable laws.
        </p>

        <p className="mt-4">
          You may not interfere with the Service, attempt to bypass security
          measures, access accounts or data without authorization, introduce
          harmful code, or use automated tools in a way that disrupts the
          platform.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "3. Accounts and authentication",
    content: (
      <>
        <p>
          Some features require an account. You are responsible for activity
          that occurs through your account and for keeping your credentials
          secure.
        </p>

        <p className="mt-4">
          You may be able to sign in using email and password or a supported
          third-party provider, such as Google, GitHub, Facebook, or Microsoft.
          Third-party authentication services are governed by their own terms
          and privacy practices.
        </p>

        <p className="mt-4">
          Please notify us promptly if you believe your account has been
          accessed without permission.
        </p>
      </>
    ),
  },
  {
    id: "content",
    title: "4. Your content and permissions",
    content: (
      <>
        <p>
          You retain ownership of content you submit to CrowdLang, including
          reels, audio, video, captions, transcripts, translations, comments,
          essays, images, and other material (“User Content”).
        </p>

        <p className="mt-4">
          By submitting User Content, you grant CrowdLang a non-exclusive,
          worldwide, royalty-free license to host, store, reproduce, format,
          display, distribute, and make the content available through the
          Service. This license exists only as needed to operate, improve, and
          promote the Service.
        </p>

        <p className="mt-4">
          You represent that you own the User Content or have the necessary
          rights, permissions, and approvals to share it through CrowdLang. Do
          not upload content that infringes another person’s copyright, privacy,
          publicity, or other rights.
        </p>
      </>
    ),
  },
  {
    id: "community",
    title: "5. Community standards",
    content: (
      <>
        <p>
          CrowdLang is intended to be a welcoming place for language learners,
          speakers, educators, and cultural communities. Use the platform with
          respect for people, languages, and cultures.
        </p>

        <ul className="mt-4 space-y-3">
          <li className="flex gap-3">
            <span aria-hidden="true" className="font-bold text-teal-600">
              ✓
            </span>
            Do not post unlawful, hateful, harassing, threatening, deceptive, or
            abusive material.
          </li>

          <li className="flex gap-3">
            <span aria-hidden="true" className="font-bold text-teal-600">
              ✓
            </span>
            Do not share copyrighted material unless you have permission or a
            valid legal right to do so.
          </li>

          <li className="flex gap-3">
            <span aria-hidden="true" className="font-bold text-teal-600">
              ✓
            </span>
            Do not misrepresent a language, culture, identity, or your
            connection to a community.
          </li>

          <li className="flex gap-3">
            <span aria-hidden="true" className="font-bold text-teal-600">
              ✓
            </span>
            Do not publish personal information about another person without
            their permission.
          </li>

          <li className="flex gap-3">
            <span aria-hidden="true" className="font-bold text-teal-600">
              ✓
            </span>
            Treat cultural knowledge with care and add context where
            appropriate.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "moderation",
    title: "6. Moderation and removal",
    content: (
      <>
        <p>
          We may review, limit visibility of, edit metadata for, remove, or
          disable access to content or accounts that we reasonably believe
          violate these Terms, harm users, create legal risk, or threaten the
          integrity of the Service.
        </p>

        <p className="mt-4">
          We are not required to monitor all content, and the presence of
          content on CrowdLang does not mean that we endorse or verify it.
        </p>
      </>
    ),
  },
  {
    id: "accuracy",
    title: "7. Language information and accuracy",
    content: (
      <>
        <p>
          CrowdLang may include community-contributed language details,
          geographic information, alphabets, essays, translations, transcripts,
          and audio or video material. This content may be incomplete, may
          contain mistakes, or may reflect different perspectives and language
          varieties.
        </p>

        <p className="mt-4">
          Use language information as a learning and discovery resource. Do not
          rely on it as the sole source for academic, legal, medical,
          professional, or cultural advice.
        </p>
      </>
    ),
  },
  {
    id: "intellectual-property",
    title: "8. CrowdLang intellectual property",
    content: (
      <>
        <p>
          The CrowdLang name, logo, branding, software, design, platform
          features, and other Service materials are owned by or licensed to
          CrowdLang and are protected by applicable intellectual property laws.
        </p>

        <p className="mt-4">
          Except where these Terms permit it, you may not copy, modify,
          distribute, reverse engineer, or exploit any part of the Service
          without prior written permission.
        </p>
      </>
    ),
  },
  {
    id: "termination",
    title: "9. Suspension and termination",
    content: (
      <>
        <p>
          You may stop using the Service at any time. We may suspend or
          terminate access to the Service if we reasonably believe you violated
          these Terms, created risk for the community, or used the Service in a
          harmful or unlawful way.
        </p>

        <p className="mt-4">
          You may request account deletion through our{" "}
          <Link
            href="/footer/delete"
            className="font-semibold text-teal-700 underline underline-offset-2 hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-100"
          >
            Account Deletion Policy
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    id: "disclaimer",
    title: "10. Disclaimers and limitation of liability",
    content: (
      <>
        <p>
          The Service is provided on an “as is” and “as available” basis.
          CrowdLang does not guarantee that the Service will always be secure,
          uninterrupted, error-free, complete, or available at a particular
          time.
        </p>

        <p className="mt-4">
          To the maximum extent permitted by applicable law, CrowdLang will not
          be liable for indirect, incidental, special, consequential, or
          punitive damages arising from your use of, or inability to use, the
          Service.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "11. Changes to these Terms",
    content: (
      <>
        <p>
          We may update these Terms from time to time. When we make changes, we
          will update the “Last updated” date at the top of this page.
        </p>

        <p className="mt-4">
          If a change materially affects your rights or obligations, we may
          provide additional notice through the Service or by another reasonable
          method. Continuing to use CrowdLang after revised Terms take effect
          means you accept the revised Terms.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "12. Contact us",
    content: (
      <p>
        If you have questions about these Terms, contact us at{" "}
        <a
          href={`mailto:${SENDER_EMAIL_ADDRESS}?subject=${encodeURIComponent(
            `${SITE_NAME} Terms of Service question`,
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

export default function TermsPage() {
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
              Terms of Service
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
              These Terms explain the rules, responsibilities, and permissions
              that apply when you use {SITE_NAME}.
            </p>

            <p className="mt-5 text-sm font-medium text-slate-500 dark:text-slate-400">
              Last updated: {lastUpdated}
            </p>
          </div>

          <div className="px-6 py-8 sm:px-10 sm:py-10">
            <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4 text-sm leading-6 text-teal-900 dark:border-teal-500/20 dark:bg-teal-950/20 dark:text-teal-100">
              <p className="font-bold">Important</p>

              <p className="mt-1">
                By using CrowdLang, you agree to follow these Terms and to use
                the community respectfully.
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
                  href="/footer/privacy"
                  className="font-semibold text-teal-700 underline underline-offset-2 hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-100"
                >
                  Privacy Policy
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
