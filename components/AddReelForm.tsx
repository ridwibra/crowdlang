"use client";

import { deleteMedia, uploadMedia } from "@/utils/files/requests";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { toast } from "sonner";

type MediaKind = "audio" | "video";

type UploadedMedia = {
  url: string;
  public_id: string;
};

type LanguageOption = {
  _id: string;
  name: string;
};

const MAX_TAGS = 20;
const MAX_VIDEO_SIZE = 200 * 1024 * 1024;
const MAX_AUDIO_SIZE = 20 * 1024 * 1024;
const MAX_VIDEO_DURATION = 5 * 60;
const MAX_AUDIO_DURATION = 10 * 60;

const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "ogv", "avi"];
const AUDIO_EXTENSIONS = ["mp3", "wav", "m4a", "aac", "ogg", "oga", "flac"];

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

const AVAILABLE_TAGS = [
  "language-learning",
  "vocabulary",
  "pronunciation",
  "grammar",
  "writing-systems",
  "expressions",
  "conversation",
  "translation",
  "culture",
  "history",
  "traditions",
  "religion",
  "folklore",
  "storytelling",
  "proverbs",
  "poetry",
  "literature",
  "music",
  "dance",
  "art",
  "festivals",
  "people",
  "family",
  "community",
  "food",
  "daily-life",
  "education",
  "work",
  "travel",
  "sports",
  "humor",
  "nature",
  "environment",
  "science",
  "technology",
  "dialects",
  "oral-history",
  "language-documentation",
  "language-preservation",
  "sign-languages",
];

function getMediaKind(file: File): MediaKind | null {
  const mimeType = file.type.toLowerCase();
  const extension = file.name.toLowerCase().split(".").pop() || "";

  if (VIDEO_MIME_TYPES.includes(mimeType)) return "video";
  if (AUDIO_MIME_TYPES.includes(mimeType)) return "audio";
  if (VIDEO_EXTENSIONS.includes(extension)) return "video";
  if (AUDIO_EXTENSIONS.includes(extension)) return "audio";

  return null;
}

function formatFileSize(bytes: number) {
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
}

function formatTag(tag: string) {
  return tag
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function validateMediaDuration(
  kind: MediaKind,
  objectUrl: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const mediaElement = document.createElement(kind);
    let settled = false;
    let timeout: ReturnType<typeof setTimeout>;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;

      clearTimeout(timeout);
      mediaElement.onloadedmetadata = null;
      mediaElement.onerror = null;
      mediaElement.removeAttribute("src");
      mediaElement.load();

      if (error) reject(error);
      else resolve();
    };

    timeout = setTimeout(() => {
      finish(
        new Error(
          "Checking this file took too long. Please choose another file.",
        ),
      );
    }, 15_000);

    mediaElement.onloadedmetadata = () => {
      const duration = mediaElement.duration;

      if (!Number.isFinite(duration) || duration <= 0) {
        finish(
          new Error(
            "Unable to read this file's duration. Please choose another file.",
          ),
        );
        return;
      }

      const maximumDuration =
        kind === "audio" ? MAX_AUDIO_DURATION : MAX_VIDEO_DURATION;

      if (duration > maximumDuration) {
        finish(
          new Error(
            kind === "audio"
              ? "Audio cannot be longer than 10 minutes."
              : "Video cannot be longer than 5 minutes.",
          ),
        );
        return;
      }

      finish();
    };

    mediaElement.onerror = () => {
      finish(
        new Error(
          "This file could not be read. Try another supported audio or video file.",
        ),
      );
    };

    mediaElement.preload = "metadata";
    mediaElement.src = objectUrl;
  });
}

export default function AddReelForm({
  languages,
}: {
  languages: LanguageOption[];
}) {
  const router = useRouter();
  const formId = useId();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const languageBoxRef = useRef<HTMLDivElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const operationRef = useRef(false);
  const mountedRef = useRef(true);
  const createdRef = useRef(false);
  const uncertainRef = useRef(false);

  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [transcription, setTranscription] = useState("");
  const [translation, setTranslation] = useState("");

  const [language, setLanguage] = useState("");
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(
    null,
  );
  const [showDropdown, setShowDropdown] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<MediaKind | null>(null);

  const [loading, setLoading] = useState(false);
  const [validatingMedia, setValidatingMedia] = useState(false);
  const [creationUncertain, setCreationUncertain] = useState(false);
  const [creationSucceeded, setCreationSucceeded] = useState(false);

  const busy =
    loading || validatingMedia || creationUncertain || creationSucceeded;

  const filteredLanguages = languages.filter((item) =>
    item.name.toLowerCase().includes(language.trim().toLowerCase()),
  );

  useEffect(() => {
    mountedRef.current = true;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        event.target instanceof Node &&
        !languageBoxRef.current?.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      mountedRef.current = false;
      document.removeEventListener("mousedown", handleClickOutside);

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const clearMedia = () => {
    if (operationRef.current || createdRef.current || uncertainRef.current) {
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    previewUrlRef.current = null;
    setFile(null);
    setPreviewUrl(null);
    setMediaKind(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const selectedFile = input.files?.[0];
    input.value = "";

    if (
      !selectedFile ||
      operationRef.current ||
      createdRef.current ||
      uncertainRef.current
    ) {
      return;
    }

    const kind = getMediaKind(selectedFile);

    if (!kind) {
      toast.error(
        "Unsupported file. Choose MP3, WAV, M4A, AAC, OGG, FLAC, MP4, MOV, or WebM.",
      );
      return;
    }

    const maximumSize = kind === "audio" ? MAX_AUDIO_SIZE : MAX_VIDEO_SIZE;

    if (selectedFile.size > maximumSize) {
      toast.error(
        kind === "audio"
          ? "Audio must be no larger than 20 MB."
          : "Video must be no larger than 200 MB.",
      );
      return;
    }

    operationRef.current = true;
    setValidatingMedia(true);

    const objectUrl = URL.createObjectURL(selectedFile);

    try {
      await validateMediaDuration(kind, objectUrl);

      if (!mountedRef.current) {
        URL.revokeObjectURL(objectUrl);
        return;
      }

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      previewUrlRef.current = objectUrl;
      setFile(selectedFile);
      setPreviewUrl(objectUrl);
      setMediaKind(kind);

      toast.success(
        `${kind === "audio" ? "Audio" : "Video"} selected successfully.`,
      );
    } catch (error) {
      URL.revokeObjectURL(objectUrl);

      if (mountedRef.current) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to validate the selected file.",
        );
      }
    } finally {
      operationRef.current = false;
      if (mountedRef.current) setValidatingMedia(false);
    }
  };

  const triggerFileSelect = () => {
    if (!busy && !operationRef.current) {
      fileInputRef.current?.click();
    }
  };

  const toggleTag = (tag: string) => {
    if (busy) return;

    if (tags.includes(tag)) {
      setTags((previous) => previous.filter((item) => item !== tag));
      return;
    }

    if (tags.length >= MAX_TAGS) {
      toast.error(`You can select up to ${MAX_TAGS} topics.`);
      return;
    }

    setTags((previous) => [...previous, tag]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (operationRef.current || createdRef.current || uncertainRef.current) {
      return;
    }

    if (!file || !mediaKind) {
      toast.error("Please upload a valid audio or video file.");
      return;
    }

    const cleanedCaption = caption.trim();

    if (!cleanedCaption || cleanedCaption.length > 2000) {
      toast.error("Caption must contain between 1 and 2,000 characters.");
      return;
    }

    if (
      !selectedLanguageId ||
      !languages.some((item) => item._id === selectedLanguageId)
    ) {
      toast.error("Please select a language from the available list.");
      return;
    }

    if (
      transcription.trim().length > 5000 ||
      translation.trim().length > 5000
    ) {
      toast.error(
        "Transcription and translation cannot exceed 5,000 characters each.",
      );
      return;
    }

    operationRef.current = true;
    setLoading(true);
    setShowDropdown(false);

    let uploadedFile: UploadedMedia | null = null;
    let creationAttempted = false;
    let creationRejected = false;

    try {
      const uploaded = (await uploadMedia(file, "reels"))?.[0];

      if (uploaded?.public_id) {
        uploadedFile = uploaded;
      }

      if (!uploaded?.url || !uploaded?.public_id) {
        throw new Error("Media upload did not return a valid file.");
      }

      creationAttempted = true;

      const response = await fetch("/api/reel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caption: cleanedCaption,
          tags,
          transcription: transcription.trim(),
          translation: translation.trim(),
          language: selectedLanguageId,
          media: {
            image_url: uploaded.url,
            public_id: uploaded.public_id,
          },
          type: mediaKind,
        }),
      });

      // These statuses match the API's pre-creation rejection paths.
      creationRejected = [400, 401, 403, 404].includes(response.status);

      if (response.ok) {
        createdRef.current = true;
        setCreationSucceeded(true);
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to create reel.");
      }

      toast.success(
        `${mediaKind === "audio" ? "Audio" : "Video"} reel uploaded successfully!`,
      );

      router.push("/reel");
      router.refresh();
    } catch (error) {
      // Do not delete media if creation may have succeeded.
      if (
        uploadedFile?.public_id &&
        !createdRef.current &&
        (!creationAttempted || creationRejected)
      ) {
        try {
          const result = await deleteMedia(uploadedFile.public_id);

          if (!result.success) {
            throw new Error("Unused media cleanup was not confirmed.");
          }
        } catch (cleanupError) {
          console.warn("Unused reel media cleanup failed:", cleanupError);
          toast.warning(
            "The reel was not created, but the unused upload could not be removed.",
          );
        }
      }

      if (createdRef.current) {
        toast.error(
          "Your reel was created. Use View reels below if navigation did not complete.",
        );
      } else if (creationAttempted && !creationRejected) {
        uncertainRef.current = true;
        setCreationUncertain(true);
        toast.error(
          "Creation could not be confirmed. Check the reel page before uploading again.",
        );
      } else {
        toast.error(error instanceof Error ? error.message : "Upload failed.");
      }
    } finally {
      operationRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

  const labelClass =
    "mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200";

  return (
    <form onSubmit={handleSubmit} className="min-w-0 space-y-7">
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Audio or Video
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Upload a short video or an audio recording.
            </p>
          </div>

          {mediaKind && (
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                mediaKind === "audio"
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
                  : "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300"
              }`}
            >
              {mediaKind}
            </span>
          )}
        </div>

        {!previewUrl ? (
          <button
            type="button"
            onClick={triggerFileSelect}
            disabled={busy}
            className="w-full rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-10 text-center transition hover:border-teal-500 hover:bg-teal-50/50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-teal-400 dark:hover:bg-teal-950/20"
          >
            <span aria-hidden="true" className="text-3xl">
              {validatingMedia ? "⏳" : "🎵"}
            </span>

            <span className="mt-3 block font-semibold text-slate-800 dark:text-slate-100">
              {validatingMedia
                ? "Checking media file..."
                : "Click to upload audio or video"}
            </span>

            <span className="mx-auto mt-2 block max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Video: maximum 200 MB and 5 minutes.
              <br />
              Audio: maximum 20 MB and 10 minutes.
            </span>
          </button>
        ) : (
          <div className="space-y-4">
            {mediaKind === "audio" ? (
              <div className="rounded-2xl bg-gradient-to-br from-teal-950 via-cyan-950 to-slate-950 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-500 text-lg"
                  >
                    🎵
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">
                      {file?.name}
                    </p>
                    <p className="text-xs text-slate-300">
                      {file ? formatFileSize(file.size) : ""}
                    </p>
                  </div>
                </div>

                <audio controls src={previewUrl} className="w-full" />
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl bg-slate-950">
                <video
                  controls
                  playsInline
                  src={previewUrl}
                  className="h-64 w-full object-contain sm:h-80"
                />

                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <p className="min-w-0 truncate text-sm text-slate-200">
                    {file?.name}
                  </p>
                  <p className="shrink-0 text-xs text-slate-400">
                    {file ? formatFileSize(file.size) : ""}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={triggerFileSelect}
                disabled={busy}
                className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                {validatingMedia ? "Checking File..." : "Replace File"}
              </button>

              <button
                type="button"
                onClick={clearMedia}
                disabled={busy}
                className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          aria-label="Select an audio or video file"
          accept="audio/*,video/*,.mp3,.wav,.m4a,.aac,.ogg,.oga,.flac,.mp4,.webm,.mov,.ogv,.avi"
          onChange={handleFileChange}
          disabled={busy}
          className="hidden"
        />
      </section>

      <div>
        <label htmlFor={`${formId}-caption`} className={labelClass}>
          Caption
        </label>
        <textarea
          id={`${formId}-caption`}
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          disabled={busy}
          rows={3}
          maxLength={2000}
          dir="auto"
          className={inputClass}
          placeholder="Write a caption for your reel..."
          required
        />
        <p className="mt-1 text-right text-xs text-slate-500 dark:text-slate-400">
          {caption.length}/2000
        </p>
      </div>

      <fieldset disabled={busy}>
        <legend className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Topics
          <span className="ml-2 text-xs font-normal text-slate-500">
            Optional
          </span>
        </legend>

        <div className="mb-3 mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            Choose topics that best describe your reel.
          </p>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {tags.length} / {MAX_TAGS} selected
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {AVAILABLE_TAGS.map((tag) => {
            const active = tags.includes(tag);

            return (
              <button
                type="button"
                key={tag}
                onClick={() => toggleTag(tag)}
                aria-pressed={active}
                disabled={busy || (!active && tags.length >= MAX_TAGS)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-slate-900 ${
                  active
                    ? "border-teal-600 bg-teal-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-teal-400 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-teal-950/30"
                }`}
              >
                {active && <span aria-hidden="true">✓ </span>}
                {formatTag(tag)}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${formId}-transcription`} className={labelClass}>
          Transcription
          <span className="ml-2 text-xs font-normal text-slate-500">
            Optional
          </span>
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
          placeholder="Write the spoken content in its original language..."
        />
      </div>

      <div>
        <label htmlFor={`${formId}-translation`} className={labelClass}>
          English Translation
          <span className="ml-2 text-xs font-normal text-slate-500">
            Optional
          </span>
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
          placeholder="Write an English translation..."
        />
      </div>

      <div ref={languageBoxRef}>
        <label htmlFor={`${formId}-language`} className={labelClass}>
          Language
        </label>

        <div className="relative">
          <input
            id={`${formId}-language`}
            type="text"
            value={language}
            disabled={busy}
            dir="auto"
            onChange={(event) => {
              setLanguage(event.target.value);
              setSelectedLanguageId(null);
              setShowDropdown(true);
            }}
            onFocus={() => {
              if (!busy) setShowDropdown(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setShowDropdown(false);
              if (
                event.key === "Enter" &&
                !selectedLanguageId &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
              }
            }}
            placeholder="Search available languages..."
            className={inputClass}
            required
          />

          {showDropdown && !busy && (
            <div className="absolute z-20 mt-2 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              {filteredLanguages.length > 0 ? (
                filteredLanguages.map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => {
                      setLanguage(item.name);
                      setSelectedLanguageId(item._id);
                      setShowDropdown(false);
                    }}
                    className={`w-full rounded-lg px-4 py-2.5 text-left text-sm transition hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500 dark:hover:bg-teal-950/30 ${
                      selectedLanguageId === item._id
                        ? "bg-teal-50 font-semibold text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"
                        : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <bdi>{item.name}</bdi>
                  </button>
                ))
              ) : (
                <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                  No matching language exists. Contact an administrator to add
                  it.
                </p>
              )}
            </div>
          )}
        </div>

        {!selectedLanguageId && language.trim() && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            Select a language from the dropdown before uploading.
          </p>
        )}
      </div>

      {(creationUncertain || creationSucceeded) && (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200"
        >
          <p>
            {creationSucceeded
              ? "Your reel was created. Opening the reel page..."
              : "The creation result could not be confirmed. Check the reel page before submitting again to avoid a duplicate."}
          </p>
          <button
            type="button"
            onClick={() => {
              router.push("/reel");
              router.refresh();
            }}
            className="mt-3 rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700"
          >
            View reels
          </button>
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-teal-500/20 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {creationSucceeded
          ? "Opening reels..."
          : creationUncertain
            ? "Check creation result"
            : loading
              ? "Uploading..."
              : validatingMedia
                ? "Checking media..."
                : mediaKind === "audio"
                  ? "Upload Audio Reel"
                  : "Upload Reel"}
      </button>
    </form>
  );
}
