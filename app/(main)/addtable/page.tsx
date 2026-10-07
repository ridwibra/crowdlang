import { redirect } from "next/navigation";
import ToggleFields from "@/components/ToggleFields";
import db from "@/utils/db";
import Language from "@/models/Language";
import Table from "@/models/Table";
import { getSession } from "@/lib/server";
import User from "@/models/User";

export default async function AddTablePage() {
  await db.connect();

  const languages = await Language.find({
    status: { $ne: "pending_deletion" },
  })
    .sort({ name: 1 })
    .lean();

  async function handleSubmit(formData: FormData) {
    "use server";

    const languageId = formData.get("languageId") as string;
    const text = formData.get("text") as string;
    const translation = formData.get("translation") as string;
    const textType = formData.get("textType") as string;

    if (!languageId) {
      throw new Error("Please select a language");
    }

    await db.connect();

    const session = await getSession();

    if (!session) {
      throw new Error("Unauthorized");
    }

    const mongoUser = await User.findOne({
      email: session.user.email,
    });

    if (!mongoUser) {
      throw new Error("User not found in database");
    }

    const language = await Language.findById(languageId).lean();

    if (!language) {
      throw new Error("Language not found");
    }

    await Table.create({
      text,
      translation,
      language: [language._id],
      textType,
      createdBy: mongoUser._id,
    });

    // redirect(`/${encodeURIComponent(language.name)}`);
    redirect(`/`);
  }

  return (
    <main className="min-h-screen bg-slate-50 py-6 dark:bg-slate-950 sm:py-10">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-950/5 dark:border-slate-800 dark:bg-slate-900">
          {/* Header */}
          <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50 px-6 py-7 dark:border-indigo-500/15 dark:from-indigo-500/10 dark:via-violet-500/10 dark:to-fuchsia-500/10 sm:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white shadow-sm">
                +
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700 dark:text-indigo-300">
                  Language table
                </p>

                <h1 className="mt-1 break-words text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                  Add table entry
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Select a language and add a word, phrase, translation, or
                  other learning entry.
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form action={handleSubmit} className="p-6 sm:p-8">
            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Entry details
              </p>

              <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                Create a new language entry
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Select the language first, then complete the entry fields below.
              </p>
            </div>

            <ToggleFields
              languages={languages.map((language) => ({
                _id: language._id.toString(),
                name: language.name,
              }))}
            />

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-end dark:border-slate-800">
              <button
                type="submit"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 sm:w-auto"
              >
                <span className="mr-2 text-lg leading-none">+</span>
                Save entry
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
