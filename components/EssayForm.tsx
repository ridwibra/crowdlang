"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

// Required extensions for formatting buttons to work
import Heading from "@tiptap/extension-heading";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import Blockquote from "@tiptap/extension-blockquote";

import { uploadMedia, deleteMedia } from "@/utils/files/requests";

type EssayImage = {
  image_url: string;
  public_id: string | null;
};

type LanguageType = {
  _id: string;
  name: string;
};

function EssayToolbar({ editor }: { editor: any }) {
  if (!editor) return null;

  const baseButtonClass =
    "inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900";

  const activeButtonClass =
    "border-indigo-600 bg-indigo-600 text-white shadow-sm";

  const inactiveButtonClass =
    "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300";

  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800/70">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`${baseButtonClass} ${
          editor.isActive("bold") ? activeButtonClass : inactiveButtonClass
        }`}
      >
        <b>B</b>
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`${baseButtonClass} ${
          editor.isActive("italic") ? activeButtonClass : inactiveButtonClass
        }`}
      >
        <i>I</i>
      </button>

      <div className="mx-1 h-8 w-px self-center bg-slate-200 dark:bg-slate-700" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`${baseButtonClass} ${
          editor.isActive("heading", { level: 2 })
            ? activeButtonClass
            : inactiveButtonClass
        }`}
      >
        H2
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`${baseButtonClass} ${
          editor.isActive("bulletList")
            ? activeButtonClass
            : inactiveButtonClass
        }`}
      >
        • List
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`${baseButtonClass} ${
          editor.isActive("orderedList")
            ? activeButtonClass
            : inactiveButtonClass
        }`}
      >
        1. List
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`${baseButtonClass} ${
          editor.isActive("blockquote")
            ? activeButtonClass
            : inactiveButtonClass
        }`}
      >
        ❝ Quote
      </button>
    </div>
  );
}

export default function EssayForm({
  language,
  existingEssay,
  closeForm,
}: {
  language: LanguageType;
  existingEssay?: any;
  closeForm: () => void;
}) {
  const [title, setTitle] = useState(existingEssay?.title || "");
  const [translationTitle, setTranslationTitle] = useState(
    existingEssay?.translationTitle || "",
  );
  const [category, setCategory] = useState(existingEssay?.category || "");
  const [level, setLevel] = useState(existingEssay?.level || "");
  const [tags, setTags] = useState(existingEssay?.tags?.join(", ") || "");
  const [images, setImages] = useState<EssayImage[]>(
    existingEssay?.images || [],
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const bodyEditor = useEditor({
    extensions: [
      StarterKit,
      Heading.configure({ levels: [1, 2, 3] }),
      BulletList,
      OrderedList,
      ListItem,
      Blockquote,
    ],
    content: existingEssay?.body || "",
  });

  const translationEditor = useEditor({
    extensions: [
      StarterKit,
      Heading.configure({ levels: [1, 2, 3] }),
      BulletList,
      OrderedList,
      ListItem,
      Blockquote,
    ],
    content: existingEssay?.translationBody || "",
  });

  const handleImagesChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const files: File[] = Array.from(selectedFiles);

    if (files.length + images.length > 3) {
      setError("You can upload up to 3 images.");
      return;
    }

    setError("");

    try {
      const uploaded = await uploadMedia(files, "essays");

      const nextImages: EssayImage[] = uploaded.map((u) => ({
        image_url: u.url,
        public_id: u.public_id ?? null,
      }));

      setImages((prev) => [...prev, ...nextImages]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    }
  };

  const handleRemoveImage = async (img: EssayImage) => {
    setError("");

    setImages((prev) => prev.filter((i) => i.public_id !== img.public_id));

    if (img.public_id) {
      try {
        await deleteMedia(img.public_id);
      } catch {
        // ignore delete errors
      }
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const safeTags: string[] = tags
      .split(",")
      .map((t: string) => t.trim())
      .filter((t: string) => t.length > 0);

    const payload = {
      title: title.trim(),
      translationTitle: translationTitle.trim(),
      category: category.trim(),
      level: level || undefined,
      tags: safeTags,
      body: bodyEditor?.getHTML() || "",
      translationBody: translationEditor?.getHTML() || "",
      images,
      language: language._id,
    };

    const url = existingEssay
      ? `/api/essay/${existingEssay._id}`
      : "/api/essay";

    const method = existingEssay ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Something went wrong.");
        setLoading(false);
        return;
      }

      closeForm();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-3xl border border-indigo-200 bg-white shadow-xl shadow-indigo-950/5 dark:border-indigo-500/20 dark:bg-slate-900"
    >
      {/* Form header */}
      <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50 px-5 py-5 dark:border-indigo-500/15 dark:from-indigo-500/10 dark:via-violet-500/10 dark:to-fuchsia-500/10 sm:px-7">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white shadow-sm">
            ✦
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700 dark:text-indigo-300">
              {existingEssay ? "Essay editor" : "New essay"}
            </p>

            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              {existingEssay ? "Edit essay" : "Create a new essay"}
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {existingEssay
                ? `Update the essay and translation for ${language.name}.`
                : `Add reading material for learners of ${language.name}.`}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8 p-5 sm:p-7">
        {error && (
          <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
              !
            </span>

            <p className="leading-5">{error}</p>
          </div>
        )}

        {/* Titles */}
        <section>
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Titles
            </p>

            <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
              Name the essay
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-100">
                Essay title
              </label>

              <input
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`Title in ${language.name}`}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-100">
                Translation title{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>

              <input
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
                value={translationTitle}
                onChange={(e) => setTranslationTitle(e.target.value)}
                placeholder="English title"
              />
            </div>
          </div>
        </section>

        {/* Body and translation */}
        <section>
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Content
            </p>

            <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
              Original text and translation
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-700">
                <label className="block text-base font-bold text-slate-900 dark:text-white">
                  Essay body
                </label>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Write the original essay in {language.name}.
                </p>
              </div>

              <EssayToolbar editor={bodyEditor} />

              <div className="min-h-[250px] bg-white p-4 text-sm leading-7 text-slate-800 dark:bg-slate-900 dark:text-slate-200 [&_.ProseMirror]:min-h-[215px] [&_.ProseMirror]:outline-none [&_.ProseMirror_h2]:mt-5 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_ul]:my-3 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ol]:my-3 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_blockquote]:my-4 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-indigo-500 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-slate-600 dark:[&_.ProseMirror_blockquote]:text-slate-300">
                <EditorContent editor={bodyEditor} />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm dark:border-indigo-500/20 dark:bg-slate-900">
              <div className="border-b border-indigo-100 bg-indigo-50/50 px-4 py-4 dark:border-indigo-500/15 dark:bg-indigo-500/5">
                <label className="block text-base font-bold text-slate-900 dark:text-white">
                  English translation
                </label>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Add an English version for learners and readers.
                </p>
              </div>

              <EssayToolbar editor={translationEditor} />

              <div className="min-h-[250px] bg-white p-4 text-sm leading-7 text-slate-800 dark:bg-slate-900 dark:text-slate-200 [&_.ProseMirror]:min-h-[215px] [&_.ProseMirror]:outline-none [&_.ProseMirror_h2]:mt-5 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_ul]:my-3 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ol]:my-3 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_blockquote]:my-4 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-indigo-500 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-slate-600 dark:[&_.ProseMirror_blockquote]:text-slate-300">
                <EditorContent editor={translationEditor} />
              </div>
            </div>
          </div>
        </section>

        {/* Images */}
        <section>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Images
              </p>

              <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                Add visual context{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </h3>
            </div>

            <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {images.length} / 3 uploaded
            </span>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={handleImagesChange}
              className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-bold file:text-indigo-700 hover:file:bg-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:file:bg-indigo-500/10 dark:file:text-indigo-300 dark:hover:file:bg-indigo-500/20"
            />

            <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
              PNG, JPEG, and WebP images are supported. You may upload up to
              three images.
            </p>

            {images.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((img) => (
                  <div
                    key={img.public_id ?? img.image_url}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.image_url}
                      alt="Essay image"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveImage(img)}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white opacity-0 shadow-sm transition hover:bg-red-700 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Metadata */}
        <section>
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Metadata
            </p>

            <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
              Help readers find this essay
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-100">
                Category
              </label>

              <input
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Culture, history, food..."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-100">
                Level
              </label>

              <select
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              >
                <option value="">Select level</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-100">
                Tags{" "}
                <span className="font-normal text-slate-400">
                  (comma separated)
                </span>
              </label>

              <input
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="travel, family, grammar..."
              />
            </div>
          </div>
        </section>

        {/* Buttons */}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-end dark:border-slate-800">
          <button
            type="button"
            onClick={closeForm}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus:ring-offset-slate-900"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:focus:ring-offset-slate-900"
          >
            {loading
              ? "Saving..."
              : existingEssay
                ? "Update essay"
                : "Create essay"}
          </button>
        </div>
      </div>
    </form>
  );
}
