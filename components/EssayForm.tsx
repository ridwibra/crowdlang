"use client";

import {
  useState,
  useRef,
  useEffect,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { toast } from "sonner";
import { uploadMedia, deleteMedia } from "@/utils/files/requests";

type EssayImage = {
  image_url: string;
  public_id: string | null;
};

type LanguageType = {
  _id: string;
  name: string;
};

type ExistingEssay = {
  _id: string;
  title?: string;
  translationTitle?: string;
  category?: string;
  level?: string;
  tags?: string[];
  body?: string;
  translationBody?: string;
  images?: {
    image_url?: string;
    public_id?: string | null;
  }[];
};

type EssayFormProps = {
  language: LanguageType;
  existingEssay?: ExistingEssay | null;
  closeForm: () => void;
};

function normalizeImages(images: ExistingEssay["images"]): EssayImage[] {
  return (images ?? [])
    .filter(
      (image): image is typeof image & { image_url: string } =>
        typeof image.image_url === "string" && Boolean(image.image_url),
    )
    .map((image) => ({
      image_url: image.image_url,
      public_id: image.public_id || null,
    }));
}

function EssayToolbar({
  editor,
  disabled,
}: {
  editor: Editor | null;
  disabled: boolean;
}) {
  if (!editor) {
    return null;
  }

  const baseButtonClass =
    "inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-slate-900";

  const activeButtonClass =
    "border-indigo-600 bg-indigo-600 text-white shadow-sm";

  const inactiveButtonClass =
    "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300";

  const buttonClass = (active: boolean) =>
    `${baseButtonClass} ${active ? activeButtonClass : inactiveButtonClass}`;

  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800/70">
      <button
        type="button"
        disabled={disabled}
        aria-label="Bold"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={buttonClass(editor.isActive("bold"))}
      >
        <b>B</b>
      </button>

      <button
        type="button"
        disabled={disabled}
        aria-label="Italic"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={buttonClass(editor.isActive("italic"))}
      >
        <i>I</i>
      </button>

      <div className="mx-1 h-8 w-px self-center bg-slate-200 dark:bg-slate-700" />

      <button
        type="button"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={buttonClass(editor.isActive("heading", { level: 2 }))}
      >
        H2
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={buttonClass(editor.isActive("bulletList"))}
      >
        • List
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={buttonClass(editor.isActive("orderedList"))}
      >
        1. List
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={buttonClass(editor.isActive("blockquote"))}
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
}: EssayFormProps) {
  const [title, setTitle] = useState(existingEssay?.title || "");
  const [translationTitle, setTranslationTitle] = useState(
    existingEssay?.translationTitle || "",
  );
  const [category, setCategory] = useState(existingEssay?.category || "");
  const [level, setLevel] = useState(existingEssay?.level || "");
  const [tags, setTags] = useState(existingEssay?.tags?.join(", ") || "");
  const [images, setImages] = useState<EssayImage[]>(() =>
    normalizeImages(existingEssay?.images),
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const originalImagesRef = useRef<EssayImage[]>(
    normalizeImages(existingEssay?.images),
  );
  const newUploadIdsRef = useRef(new Set<string>());
  const operationRef = useRef(false);
  const savedRef = useRef(false);

  const busy = loading || uploading;

  const bodyEditor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
    ],
    content: existingEssay?.body || "",
    immediatelyRender: false,
  });

  const translationEditor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
    ],
    content: existingEssay?.translationBody || "",
    immediatelyRender: false,
  });

  useEffect(() => {
    bodyEditor?.setEditable(!busy);
    translationEditor?.setEditable(!busy);
  }, [bodyEditor, translationEditor, busy]);

  async function cleanupUploads(publicIds: string[]) {
    const results = await Promise.allSettled(
      publicIds.map((publicId) => deleteMedia(publicId)),
    );

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        newUploadIdsRef.current.delete(publicIds[index]);
      } else {
        console.error(
          "Essay image cleanup failed:",
          publicIds[index],
          result.reason,
        );
      }
    });

    return results.some((result) => result.status === "rejected");
  }

  const handleImagesChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (!files.length || operationRef.current || savedRef.current) {
      return;
    }

    if (files.length + images.length > 3) {
      const message = "You can upload up to 3 images.";
      setError(message);
      toast.error(message);
      return;
    }

    const acceptedTypes = ["image/png", "image/jpeg", "image/webp"];

    if (files.some((file) => !acceptedTypes.includes(file.type))) {
      toast.error("Please choose PNG, JPEG, or WebP images.");
      return;
    }

    operationRef.current = true;
    setUploading(true);
    setError("");

    try {
      const uploaded = await uploadMedia(files, "essays");

      const nextImages: EssayImage[] = uploaded.map((image) => ({
        image_url: image.url,
        public_id: image.public_id || null,
      }));

      nextImages.forEach((image) => {
        if (image.public_id) {
          newUploadIdsRef.current.add(image.public_id);
        }
      });

      setImages((previous) => [...previous, ...nextImages]);
    } catch (uploadError: unknown) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Image upload failed.";

      setError(message);
      toast.error(message);
    } finally {
      operationRef.current = false;
      setUploading(false);
    }
  };

  const handleRemoveImage = (image: EssayImage) => {
    if (operationRef.current || savedRef.current) {
      return;
    }

    setError("");

    // Existing assets stay in Cloudinary until the essay save succeeds.
    setImages((previous) =>
      previous.filter((candidate) =>
        image.public_id
          ? candidate.public_id !== image.public_id
          : candidate.image_url !== image.image_url,
      ),
    );
  };

  const handleCancel = async () => {
    if (operationRef.current || savedRef.current) {
      return;
    }

    operationRef.current = true;
    setLoading(true);

    try {
      // Only unsaved uploads from this form are eligible for cancellation cleanup.
      await cleanupUploads([...newUploadIdsRef.current]);
      closeForm();
    } finally {
      operationRef.current = false;
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (operationRef.current || savedRef.current) {
      return;
    }

    if (!title.trim()) {
      const message = "An essay title is required.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!bodyEditor || !translationEditor) {
      toast.error("The editors are still loading. Please try again.");
      return;
    }

    operationRef.current = true;
    setLoading(true);
    setError("");

    const retainedIds = new Set(
      images
        .map((image) => image.public_id)
        .filter((id): id is string => typeof id === "string" && !!id),
    );

    const removedExistingIds = originalImagesRef.current
      .map((image) => image.public_id)
      .filter(
        (id): id is string =>
          typeof id === "string" && !!id && !retainedIds.has(id),
      );

    const discardedUploadIds = [...newUploadIdsRef.current].filter(
      (id) => !retainedIds.has(id),
    );

    const payload = {
      title: title.trim(),
      translationTitle: translationTitle.trim(),
      category: category.trim(),
      level: level || undefined,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      body: bodyEditor.getHTML(),
      translationBody: translationEditor.getHTML(),
      images,
      language: language._id,
    };

    try {
      const response = await fetch(
        existingEssay ? `/api/essay/${existingEssay._id}` : "/api/essay",
        {
          method: existingEssay ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data: { message?: string } = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        const message =
          data.message ||
          (response.status === 403
            ? "Only this essay's author, an admin, or root can edit it."
            : response.status === 401
              ? "Please sign in to continue."
              : "Unable to save the essay.");

        toast.error(message);

        if (response.status !== 401 && response.status !== 403) {
          setError(message);
        }

        return;
      }

      savedRef.current = true;

      // Saved images must never be treated as unsaved uploads.
      retainedIds.forEach((id) => {
        newUploadIdsRef.current.delete(id);
      });

      const cleanupIds = [
        ...new Set([...removedExistingIds, ...discardedUploadIds]),
      ];

      await cleanupUploads(cleanupIds);

      closeForm();
      window.location.reload();
    } catch (saveError: unknown) {
      const message =
        saveError instanceof Error ? saveError.message : "Request failed.";

      setError(message);
      toast.error(message);
    } finally {
      operationRef.current = false;
      setLoading(false);
    }
  };

  const inputClass =
    "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500";

  const labelClass =
    "mb-2 block text-sm font-bold text-slate-800 dark:text-slate-100";

  const editorClass =
    "min-h-[250px] bg-white p-4 text-sm leading-7 text-slate-800 dark:bg-slate-900 dark:text-slate-200 [&_.ProseMirror]:min-h-[215px] [&_.ProseMirror]:outline-none [&_.ProseMirror_h1]:mt-5 [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h2]:mt-5 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h3]:mt-4 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-bold [&_.ProseMirror_ul]:my-3 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ol]:my-3 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_blockquote]:my-4 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-indigo-500 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic";

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-3xl border border-indigo-200 bg-white shadow-xl shadow-indigo-950/5 dark:border-indigo-500/20 dark:bg-slate-900"
    >
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
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200"
          >
            {error}
          </div>
        )}

        <section>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Titles
          </p>

          <h3 className="mb-4 mt-1 text-lg font-bold text-slate-900 dark:text-white">
            Name the essay
          </h3>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Essay title</span>
              <input
                className={inputClass}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={`Title in ${language.name}`}
                disabled={busy}
                required
              />
            </label>

            <label className="block">
              <span className={labelClass}>
                Translation title{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </span>
              <input
                className={inputClass}
                value={translationTitle}
                onChange={(event) => setTranslationTitle(event.target.value)}
                placeholder="English title"
                disabled={busy}
              />
            </label>
          </div>
        </section>

        <section>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Content
          </p>

          <h3 className="mb-4 mt-1 text-lg font-bold text-slate-900 dark:text-white">
            Original text and translation
          </h3>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-700">
                <p className="text-base font-bold text-slate-900 dark:text-white">
                  Essay body
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Write the original essay in {language.name}.
                </p>
              </div>

              <EssayToolbar editor={bodyEditor} disabled={busy} />

              <div className={editorClass}>
                <EditorContent editor={bodyEditor} />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm dark:border-indigo-500/20 dark:bg-slate-900">
              <div className="border-b border-indigo-100 bg-indigo-50/50 px-4 py-4 dark:border-indigo-500/15 dark:bg-indigo-500/5">
                <p className="text-base font-bold text-slate-900 dark:text-white">
                  English translation
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Add an English version for learners and readers.
                </p>
              </div>

              <EssayToolbar editor={translationEditor} disabled={busy} />

              <div className={editorClass}>
                <EditorContent editor={translationEditor} />
              </div>
            </div>
          </div>
        </section>

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
              disabled={busy || images.length >= 3}
              onChange={handleImagesChange}
              className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-bold file:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:file:bg-indigo-500/10 dark:file:text-indigo-300"
            />

            <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {uploading
                ? "Uploading images..."
                : "PNG, JPEG, and WebP images are supported. You may upload up to three images."}
            </p>

            {images.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((image) => (
                  <div
                    key={image.public_id ?? image.image_url}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.image_url}
                      alt="Essay image"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />

                    <button
                      type="button"
                      aria-label="Remove essay image"
                      disabled={busy}
                      onClick={() => handleRemoveImage(image)}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-slate-900"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Metadata
          </p>

          <h3 className="mb-4 mt-1 text-lg font-bold text-slate-900 dark:text-white">
            Help readers find this essay
          </h3>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <label className="block">
              <span className={labelClass}>Category</span>
              <input
                className={inputClass}
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Culture, history, food..."
                disabled={busy}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Level</span>
              <select
                className={inputClass}
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                disabled={busy}
              >
                <option value="">Select level</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>

            <label className="block">
              <span className={labelClass}>
                Tags{" "}
                <span className="font-normal text-slate-400">
                  (comma separated)
                </span>
              </span>
              <input
                className={inputClass}
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="travel, family, grammar..."
                disabled={busy}
              />
            </label>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-end dark:border-slate-800">
          <button
            type="button"
            onClick={() => void handleCancel()}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus:ring-offset-slate-900"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:focus:ring-offset-slate-900"
          >
            {uploading
              ? "Uploading..."
              : loading
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
