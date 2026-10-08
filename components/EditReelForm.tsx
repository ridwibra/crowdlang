"use client";

import { deleteMedia, uploadMedia } from "@/utils/files/requests";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { toast } from "sonner";

type LanguageOption = {
  _id: string;
  name: string;
};

type ReelMedia = {
  image_url: string;
  public_id: string;
};

type ReelMediaType = "video" | "audio";

type EditReelFormProps = {
  reelId: string;
  initialCaption: string;
  initialTags: string[];
  initialTranscription: string;
  initialTranslation: string;
  initialLanguageId: string;
  initialMedia: ReelMedia;
  initialType: ReelMediaType;
  languages: LanguageOption[];
  onCancel: () => void;
  onSaved: () => void;
};

const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/ogg",
  "video/x-msvideo",
];

const AUDIO_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
  "audio/ogg",
  "audio/webm",
  "audio/flac",
];

const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "ogv", "avi"];
const AUDIO_EXTENSIONS = ["mp3", "wav", "m4a", "aac", "ogg", "oga", "flac"];

const MAX_VIDEO_SIZE = 200 * 1024 * 1024;
const MAX_AUDIO_SIZE = 20 * 1024 * 1024;
const MAX_VIDEO_DURATION = 5 * 60;
const MAX_AUDIO_DURATION = 10 * 60;

function getMediaType(file: File): ReelMediaType | null {
  const mime = file.type.toLowerCase();
  const extension = file.name.toLowerCase().split(".").pop() || "";

  if (VIDEO_MIME_TYPES.includes(mime)) return "video";
  if (AUDIO_MIME_TYPES.includes(mime)) return "audio";
  if (VIDEO_EXTENSIONS.includes(extension)) return "video";
  if (AUDIO_EXTENSIONS.includes(extension)) return "audio";

  return null;
}

function formatFileSize(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

function validateMediaDuration(
  type: ReelMediaType,
  objectUrl: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const element = document.createElement(type);
    let settled = false;
    let timeout: ReturnType<typeof setTimeout>;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;

      clearTimeout(timeout);
      element.onloadedmetadata = null;
      element.onerror = null;
      element.removeAttribute("src");
      element.load();

      if (error) reject(error);
      else resolve();
    };

    timeout = setTimeout(
      () =>
        finish(new Error("Checking the file took too long. Try another file.")),
      15_000,
    );

    element.onloadedmetadata = () => {
      const duration = element.duration;

      if (!Number.isFinite(duration) || duration <= 0) {
        finish(new Error("Unable to read the selected file duration."));
        return;
      }

      const maximum =
        type === "audio" ? MAX_AUDIO_DURATION : MAX_VIDEO_DURATION;

      if (duration > maximum) {
        finish(
          new Error(
            type === "audio"
              ? "Audio cannot be longer than 10 minutes."
              : "Video cannot be longer than 5 minutes.",
          ),
        );
        return;
      }

      finish();
    };

    element.onerror = () => {
      finish(
        new Error("Unable to read this file. Please choose another file."),
      );
    };

    element.preload = "metadata";
    element.src = objectUrl;
  });
}

export default function EditReelForm({
  reelId,
  initialCaption,
  initialTags,
  initialTranscription,
  initialTranslation,
  initialLanguageId,
  initialMedia,
  initialType,
  languages,
  onCancel,
  onSaved,
}: EditReelFormProps) {
  const formId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const operationRef = useRef(false);
  const mountedRef = useRef(true);
  const savedRef = useRef(false);
  const uncertainRef = useRef(false);

  const [caption, setCaption] = useState(initialCaption || "");
  const [tagsText, setTagsText] = useState((initialTags || []).join(", "));
  const [transcription, setTranscription] = useState(
    initialTranscription || "",
  );
  const [translation, setTranslation] = useState(initialTranslation || "");
  const [languageId, setLanguageId] = useState(initialLanguageId || "");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<ReelMediaType>(initialType);

  const [captionError, setCaptionError] = useState("");
  const [languageError, setLanguageError] = useState("");
  const [mediaError, setMediaError] = useState("");
  const [saving, setSaving] = useState(false);
  const [validatingMedia, setValidatingMedia] = useState(false);

  const busy = saving || validatingMedia;
  const selectedLanguage = languages.find((item) => item._id === languageId);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const nextFile = input.files?.[0];
    input.value = "";

    if (!nextFile || operationRef.current) return;

    const nextType = getMediaType(nextFile);

    if (!nextType) {
      const message = "Choose a supported audio or video file.";
      setMediaError(message);
      toast.error(message);
      return;
    }

    const maximumSize = nextType === "audio" ? MAX_AUDIO_SIZE : MAX_VIDEO_SIZE;

    if (nextFile.size > maximumSize) {
      const message =
        nextType === "audio"
          ? "Audio must be no larger than 20 MB."
          : "Video must be no larger than 200 MB.";

      setMediaError(message);
      toast.error(message);
      return;
    }

    operationRef.current = true;
    setValidatingMedia(true);
    setMediaError("");

    const objectUrl = URL.createObjectURL(nextFile);

    try {
      await validateMediaDuration(nextType, objectUrl);

      if (!mountedRef.current) {
        URL.revokeObjectURL(objectUrl);
        return;
      }

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      previewUrlRef.current = objectUrl;
      setFile(nextFile);
      setMediaType(nextType);
      setPreviewUrl(objectUrl);
      toast.success(`${nextType === "audio" ? "Audio" : "Video"} selected.`);
    } catch (error) {
      URL.revokeObjectURL(objectUrl);

      if (mountedRef.current) {
        const message =
          error instanceof Error ? error.message : "Invalid media file.";
        setMediaError(message);
        toast.error(message);
      }
    } finally {
      operationRef.current = false;
      if (mountedRef.current) setValidatingMedia(false);
    }
  };

  const removeReplacement = () => {
    if (operationRef.current) return;

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    previewUrlRef.current = null;
    setFile(null);
    setPreviewUrl(null);
    setMediaType(initialType);
    setMediaError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (operationRef.current) return;

    if (savedRef.current || uncertainRef.current) {
      toast.error("Refresh the page before editing this reel again.");
      return;
    }

    const cleanedCaption = caption.trim();

    setCaptionError("");
    setLanguageError("");
    setMediaError("");

    if (!cleanedCaption || cleanedCaption.length > 2000) {
      setCaptionError("Caption must contain between 1 and 2,000 characters.");
      return;
    }

    if (!languageId) {
      setLanguageError("Please select a language.");
      return;
    }

    if (
      transcription.trim().length > 5000 ||
      translation.trim().length > 5000
    ) {
      toast.error(
        "Transcription and translation are limited to 5,000 characters each.",
      );
      return;
    }

    operationRef.current = true;
    setSaving(true);

    let uploadedMedia: ReelMedia | null = null;
    let updateAttempted = false;
    let updateRejected = false;
    let updateSucceeded = false;

    try {
      let mediaToSave = initialMedia;
      let typeToSave = initialType;

      if (file) {
        const uploaded = (await uploadMedia(file, "reels"))?.[0];

        if (!uploaded?.url || !uploaded?.public_id) {
          throw new Error("Media upload did not return a valid file.");
        }

        uploadedMedia = {
          image_url: uploaded.url,
          public_id: uploaded.public_id,
        };

        mediaToSave = uploadedMedia;
        typeToSave = mediaType;
      }

      updateAttempted = true;

      const response = await fetch(`/api/reel/${reelId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: cleanedCaption,
          tags: tagsText
            .split(",")
            .map((tag) => tag.trim().toLowerCase())
            .filter(Boolean),
          transcription: transcription.trim(),
          translation: translation.trim(),
          language: languageId,
          media: mediaToSave,
          type: typeToSave,
        }),
      });

      updateSucceeded = response.ok;
      updateRejected = [400, 401, 403, 404].includes(response.status);

      if (updateSucceeded) savedRef.current = true;

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to update reel.");
      }

      if (
        uploadedMedia &&
        initialMedia.public_id &&
        initialMedia.public_id !== uploadedMedia.public_id
      ) {
        try {
          const result = await deleteMedia(initialMedia.public_id);

          if (!result.success) {
            throw new Error("Previous media cleanup was not confirmed.");
          }
        } catch (error) {
          console.warn("Previous reel media cleanup failed:", error);
          toast.warning(
            "Reel updated, but the previous media could not be removed.",
          );
        }
      }

      toast.success("Reel updated successfully.");
      onSaved();
    } catch (error) {
      if (
        uploadedMedia?.public_id &&
        !updateSucceeded &&
        (!updateAttempted || updateRejected)
      ) {
        try {
          const result = await deleteMedia(uploadedMedia.public_id);
          if (!result.success) throw new Error("Replacement cleanup failed.");
        } catch (cleanupError) {
          console.warn("Unused replacement cleanup failed:", cleanupError);
        }
      }

      if (updateSucceeded) {
        console.error("Reel saved, but UI refresh failed:", error);
        toast.error("The reel was saved. Refresh the page to see the changes.");
      } else if (updateAttempted && !updateRejected) {
        uncertainRef.current = true;
        toast.error(
          "The update could not be confirmed. Refresh and check the reel before trying again.",
        );
      } else {
        toast.error(
          error instanceof Error ? error.message : "Failed to update reel.",
        );
      }
    } finally {
      operationRef.current = false;
      if (mountedRef.current) setSaving(false);
    }
  };

  const displayedMediaUrl = previewUrl || initialMedia.image_url;
  const displayedType = previewUrl ? mediaType : initialType;

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-teal-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

  const labelClass =
    "mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200";

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 min-w-0 space-y-6 rounded-2xl border border-teal-200 bg-teal-50/40 p-4 dark:border-teal-900/60 dark:bg-teal-950/20 sm:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
            Reel Editor
          </p>
          <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
            Edit Reel
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Update details or replace the audio or video file.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Close
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className={labelClass}>Audio or Video</h4>
          <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold uppercase text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
            {displayedType}
          </span>
        </div>

        {displayedType === "audio" ? (
          <div className="rounded-2xl bg-gradient-to-br from-teal-950 via-cyan-950 to-slate-950 p-5">
            <p className="mb-2 truncate font-semibold text-white">
              {file?.name || "Current audio reel"}
            </p>
            {file && (
              <p className="mb-3 text-xs text-slate-300">
                {formatFileSize(file.size)}
              </p>
            )}
            <audio controls src={displayedMediaUrl} className="w-full" />
          </div>
        ) : (
          <video
            controls
            playsInline
            src={displayedMediaUrl}
            className="h-64 w-full rounded-2xl bg-black object-contain sm:h-80"
          />
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-700"
          >
            {validatingMedia
              ? "Checking File..."
              : file
                ? "Choose Another File"
                : "Replace Media"}
          </button>

          {file && (
            <button
              type="button"
              onClick={removeReplacement}
              disabled={busy}
              className="rounded-xl bg-slate-500 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 disabled:opacity-50"
            >
              Keep Current Media
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,video/*,.mp3,.wav,.m4a,.aac,.ogg,.oga,.flac,.mp4,.webm,.mov,.ogv,.avi"
          disabled={busy}
          onChange={handleFileChange}
          className="hidden"
        />

        <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Video: maximum 200 MB and 5 minutes.
          <br />
          Audio: maximum 20 MB and 10 minutes.
        </p>

        {mediaError && (
          <p
            role="alert"
            className="mt-2 text-sm text-red-600 dark:text-red-400"
          >
            {mediaError}
          </p>
        )}
      </section>

      <div>
        <label htmlFor={`${formId}-caption`} className={labelClass}>
          Caption
        </label>
        <textarea
          id={`${formId}-caption`}
          value={caption}
          onChange={(event) => {
            setCaption(event.target.value);
            setCaptionError("");
          }}
          disabled={busy}
          rows={3}
          maxLength={2000}
          dir="auto"
          placeholder="Write a caption..."
          aria-invalid={Boolean(captionError)}
          className={inputClass}
        />
        {captionError && (
          <p
            role="alert"
            className="mt-1 text-sm text-red-600 dark:text-red-400"
          >
            {captionError}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${formId}-tags`} className={labelClass}>
          Tags <span className="text-xs font-normal">— comma separated</span>
        </label>
        <input
          id={`${formId}-tags`}
          value={tagsText}
          onChange={(event) => setTagsText(event.target.value)}
          disabled={busy}
          dir="auto"
          placeholder="culture, music, vocabulary"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-transcription`} className={labelClass}>
          Transcription (optional)
        </label>
        <textarea
          id={`${formId}-transcription`}
          value={transcription}
          onChange={(event) => setTranscription(event.target.value)}
          disabled={busy}
          rows={4}
          maxLength={5000}
          dir="auto"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-translation`} className={labelClass}>
          English Translation (optional)
        </label>
        <textarea
          id={`${formId}-translation`}
          value={translation}
          onChange={(event) => setTranslation(event.target.value)}
          disabled={busy}
          rows={4}
          maxLength={5000}
          lang="en"
          dir="ltr"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-language`} className={labelClass}>
          Language
        </label>
        <select
          id={`${formId}-language`}
          value={languageId}
          onChange={(event) => {
            setLanguageId(event.target.value);
            setLanguageError("");
          }}
          disabled={busy}
          aria-invalid={Boolean(languageError)}
          className={inputClass}
        >
          <option value="">Select a language...</option>
          {languages.map((language) => (
            <option key={language._id} value={language._id}>
              {language.name}
            </option>
          ))}
        </select>
        {selectedLanguage && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Selected: {selectedLanguage.name}
          </p>
        )}
        {languageError && (
          <p
            role="alert"
            className="mt-1 text-sm text-red-600 dark:text-red-400"
          >
            {languageError}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
