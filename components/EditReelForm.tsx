"use client";

import { deleteMedia, uploadMedia } from "@/utils/files/requests";
import { useEffect, useRef, useState } from "react";
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

function getFileExtension(fileName: string) {
  const parts = fileName.toLowerCase().split(".");

  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function getMediaType(file: File): ReelMediaType | null {
  const mimeType = file.type.toLowerCase();
  const extension = getFileExtension(file.name);

  if (
    VIDEO_MIME_TYPES.includes(mimeType) ||
    VIDEO_EXTENSIONS.includes(extension)
  ) {
    return "video";
  }

  if (
    AUDIO_MIME_TYPES.includes(mimeType) ||
    AUDIO_EXTENSIONS.includes(extension)
  ) {
    return "audio";
  }

  return null;
}

function formatFileSize(bytes: number) {
  const megabytes = bytes / (1024 * 1024);

  return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const [caption, setCaption] = useState(initialCaption);
  const [tagsText, setTagsText] = useState(initialTags.join(", "));
  const [transcription, setTranscription] = useState(initialTranscription);
  const [translation, setTranslation] = useState(initialTranslation);
  const [languageId, setLanguageId] = useState(initialLanguageId);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<ReelMediaType>(initialType);

  const [captionError, setCaptionError] = useState("");
  const [languageError, setLanguageError] = useState("");
  const [mediaError, setMediaError] = useState("");

  const [saving, setSaving] = useState(false);
  const [validatingMedia, setValidatingMedia] = useState(false);

  const selectedLanguage = languages.find(
    (language) => language._id === languageId,
  );

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const validateMediaDuration = (
    selectedFile: File,
    selectedType: ReelMediaType,
    objectUrl: string,
  ) => {
    return new Promise<void>((resolve, reject) => {
      const mediaElement = document.createElement(
        selectedType === "audio" ? "audio" : "video",
      );

      mediaElement.preload = "metadata";
      mediaElement.src = objectUrl;

      const cleanup = () => {
        mediaElement.removeAttribute("src");
        mediaElement.load();
      };

      mediaElement.onloadedmetadata = () => {
        const duration = mediaElement.duration;

        cleanup();

        if (!Number.isFinite(duration) || duration <= 0) {
          reject(
            new Error(
              "Unable to read the selected file duration. Please choose another file.",
            ),
          );

          return;
        }

        const maximumDuration =
          selectedType === "audio" ? MAX_AUDIO_DURATION : MAX_VIDEO_DURATION;

        if (duration > maximumDuration) {
          reject(
            new Error(
              selectedType === "audio"
                ? "Audio cannot be longer than 10 minutes."
                : "Video cannot be longer than 5 minutes.",
            ),
          );

          return;
        }

        resolve();
      };

      mediaElement.onerror = () => {
        cleanup();

        reject(
          new Error(
            "Unable to read this media file. Try MP3, WAV, M4A, AAC, MP4, MOV, or WebM.",
          ),
        );
      };
    });
  };

  const setFilePreview = (
    nextFile: File,
    nextType: ReelMediaType,
    nextPreviewUrl: string,
  ) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    previewUrlRef.current = nextPreviewUrl;

    setFile(nextFile);
    setMediaType(nextType);
    setPreviewUrl(nextPreviewUrl);
    setMediaError("");
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const nextFile = event.target.files?.[0];

    if (!nextFile) return;

    const nextType = getMediaType(nextFile);

    if (!nextType) {
      const message =
        "Choose MP3, WAV, M4A, AAC, OGG, FLAC, MP4, MOV, or WebM.";

      setMediaError(message);
      toast.error(message);

      event.target.value = "";
      return;
    }

    if (nextType === "video" && nextFile.size > MAX_VIDEO_SIZE) {
      const message = "Video must be under 200 MB.";

      setMediaError(message);
      toast.error(message);

      event.target.value = "";
      return;
    }

    if (nextType === "audio" && nextFile.size > MAX_AUDIO_SIZE) {
      const message = "Audio must be under 20 MB.";

      setMediaError(message);
      toast.error(message);

      event.target.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(nextFile);

    setValidatingMedia(true);
    setMediaError("");

    try {
      await validateMediaDuration(nextFile, nextType, objectUrl);

      setFilePreview(nextFile, nextType, objectUrl);

      toast.success(
        `${nextType === "audio" ? "Audio" : "Video"} selected successfully.`,
      );
    } catch (error) {
      URL.revokeObjectURL(objectUrl);

      const message =
        error instanceof Error ? error.message : "Invalid media file.";

      setMediaError(message);
      toast.error(message);

      event.target.value = "";
    } finally {
      setValidatingMedia(false);
    }
  };

  const removeReplacement = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    previewUrlRef.current = null;

    setFile(null);
    setPreviewUrl(null);
    setMediaType(initialType);
    setMediaError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanedCaption = caption.trim();

    setCaptionError("");
    setLanguageError("");
    setMediaError("");

    if (!cleanedCaption) {
      setCaptionError("Caption is required.");
      return;
    }

    if (!languageId) {
      setLanguageError("Please select a language.");
      return;
    }

    setSaving(true);

    let uploadedMedia: ReelMedia | null = null;

    try {
      let mediaToSave = initialMedia;
      let typeToSave = initialType;

      if (file) {
        const uploadResult = await uploadMedia(file, "reels");
        const uploaded = uploadResult?.[0];

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

      const response = await fetch(`/api/reel/${reelId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update reel.");
      }

      if (
        uploadedMedia &&
        initialMedia.public_id &&
        initialMedia.public_id !== uploadedMedia.public_id
      ) {
        try {
          await deleteMedia(initialMedia.public_id);
        } catch {
          console.warn(
            "Reel updated, but previous media cleanup failed:",
            initialMedia.public_id,
          );
        }
      }

      toast.success("Reel updated successfully.");
      onSaved();
    } catch (error) {
      if (uploadedMedia?.public_id) {
        try {
          await deleteMedia(uploadedMedia.public_id);
        } catch {
          console.warn(
            "Failed to clean up replacement media:",
            uploadedMedia.public_id,
          );
        }
      }

      toast.error(
        error instanceof Error ? error.message : "Failed to update reel.",
      );
    } finally {
      setSaving(false);
    }
  };

  const displayedMediaUrl = previewUrl || initialMedia.image_url;
  const displayedType = previewUrl ? mediaType : initialType;

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 space-y-6 rounded-2xl border border-teal-200 bg-teal-50/40 p-5 dark:border-teal-900/60 dark:bg-teal-950/20"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
            Reel Editor
          </p>

          <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
            Edit Reel
          </h3>

          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Update reel details or replace the audio or video file.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Close
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between gap-3">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Audio or Video
          </label>

          <span
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
              displayedType === "audio"
                ? "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
                : "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300"
            }`}
          >
            {displayedType}
          </span>
        </div>

        {displayedType === "audio" ? (
          <div className="rounded-2xl bg-gradient-to-br from-teal-950 via-cyan-950 to-slate-950 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500 text-lg">
                🎵
              </div>

              <div className="min-w-0">
                <p className="truncate font-semibold text-white">
                  {file?.name || "Current audio reel"}
                </p>

                {file && (
                  <p className="text-xs text-slate-300">
                    {formatFileSize(file.size)}
                  </p>
                )}
              </div>
            </div>

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
            disabled={saving || validatingMedia}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
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
              disabled={saving || validatingMedia}
              className="rounded-xl bg-slate-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-600 disabled:opacity-50"
            >
              Keep Current Media
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,video/*,.mp3,.wav,.m4a,.aac,.ogg,.oga,.flac,.mp4,.webm,.mov,.ogv,.avi"
          onChange={handleFileChange}
          className="hidden"
        />

        <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Video: MP4, MOV, WebM — maximum 200 MB and 5 minutes.
          <br />
          Audio: MP3, WAV, M4A, AAC, OGG, FLAC — maximum 20 MB and 10 minutes.
        </p>

        {mediaError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {mediaError}
          </p>
        )}
      </section>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          Caption
        </label>

        <textarea
          value={caption}
          onChange={(event) => {
            setCaption(event.target.value);
            setCaptionError("");
          }}
          rows={3}
          maxLength={2000}
          placeholder="Write a caption..."
          className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-teal-500 dark:bg-slate-900 dark:text-white ${
            captionError
              ? "border-red-500"
              : "border-slate-300 dark:border-slate-700"
          }`}
        />

        {captionError && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {captionError}
          </p>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          Tags
          <span className="ml-2 text-xs font-normal text-slate-500">
            Comma separated
          </span>
        </label>

        <input
          value={tagsText}
          onChange={(event) => setTagsText(event.target.value)}
          placeholder="culture, music, vocabulary"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          Transcription
          <span className="ml-2 text-xs font-normal text-slate-500">
            Optional
          </span>
        </label>

        <textarea
          value={transcription}
          onChange={(event) => setTranscription(event.target.value)}
          rows={4}
          placeholder="Optional transcription..."
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          English Translation
          <span className="ml-2 text-xs font-normal text-slate-500">
            Optional
          </span>
        </label>

        <textarea
          value={translation}
          onChange={(event) => setTranslation(event.target.value)}
          rows={4}
          placeholder="Optional English translation..."
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          Language
        </label>

        <select
          value={languageId}
          onChange={(event) => {
            setLanguageId(event.target.value);
            setLanguageError("");
          }}
          className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-teal-500 dark:bg-slate-900 dark:text-white ${
            languageError
              ? "border-red-500"
              : "border-slate-300 dark:border-slate-700"
          }`}
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
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {languageError}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3 pt-1">
        <button
          type="submit"
          disabled={saving || validatingMedia}
          className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
