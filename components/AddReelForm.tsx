"use client";

import { uploadMedia } from "@/utils/files/requests";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type MediaKind = "audio" | "video" | null;

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
  "audio/aac",
  "audio/ogg",
  "audio/webm",
  "audio/flac",
];

const MAX_VIDEO_SIZE = 200 * 1024 * 1024;
const MAX_AUDIO_SIZE = 20 * 1024 * 1024;

const MAX_VIDEO_DURATION = 5 * 60;
const MAX_AUDIO_DURATION = 10 * 60;

function getFileExtension(fileName: string) {
  const parts = fileName.toLowerCase().split(".");

  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function getMediaKind(file: File): MediaKind {
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

export default function AddReelForm({
  languages,
}: {
  languages: { _id: string; name: string }[];
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
  const [mediaKind, setMediaKind] = useState<MediaKind>(null);

  const [loading, setLoading] = useState(false);
  const [validatingMedia, setValidatingMedia] = useState(false);

  const availableTags = [
    "history",
    "religion",
    "culture",
    "music",
    "food",
    "people",
  ];

  const filteredLanguages = languages.filter((item) =>
    item.name.toLowerCase().includes(language.toLowerCase()),
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (!target.closest(".language-combobox")) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const clearMedia = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(null);
    setPreviewUrl(null);
    setMediaKind(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateMediaDuration = (
    selectedFile: File,
    kind: "audio" | "video",
    objectUrl: string,
  ) => {
    return new Promise<void>((resolve, reject) => {
      const mediaElement = document.createElement(
        kind === "audio" ? "audio" : "video",
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
              "Unable to read this file's duration. Please choose another file.",
            ),
          );

          return;
        }

        const maximumDuration =
          kind === "audio" ? MAX_AUDIO_DURATION : MAX_VIDEO_DURATION;

        if (duration > maximumDuration) {
          reject(
            new Error(
              kind === "audio"
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
            "This media file could not be read. Try MP3, WAV, M4A, AAC, MP4, MOV, or WebM.",
          ),
        );
      };
    });
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    const kind = getMediaKind(selectedFile);

    if (!kind) {
      toast.error(
        "Unsupported file. Choose MP3, WAV, M4A, AAC, OGG, FLAC, MP4, MOV, or WebM.",
      );

      event.target.value = "";
      return;
    }

    if (kind === "video" && selectedFile.size > MAX_VIDEO_SIZE) {
      toast.error("Video must be under 200 MB.");

      event.target.value = "";
      return;
    }

    if (kind === "audio" && selectedFile.size > MAX_AUDIO_SIZE) {
      toast.error("Audio must be under 20 MB.");

      event.target.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);

    setValidatingMedia(true);

    try {
      await validateMediaDuration(selectedFile, kind, objectUrl);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setFile(selectedFile);
      setPreviewUrl(objectUrl);
      setMediaKind(kind);

      toast.success(
        `${kind === "audio" ? "Audio" : "Video"} selected successfully.`,
      );
    } catch (error) {
      URL.revokeObjectURL(objectUrl);

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to validate the selected media.",
      );

      event.target.value = "";
    } finally {
      setValidatingMedia(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const toggleTag = (tag: string) => {
    setTags((previousTags) =>
      previousTags.includes(tag)
        ? previousTags.filter((item) => item !== tag)
        : [...previousTags, tag],
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!file || !mediaKind) {
      toast.error("Please upload a valid audio or video file.");
      return;
    }

    if (!caption.trim()) {
      toast.error("Please enter a caption.");
      return;
    }

    if (!selectedLanguageId) {
      toast.error("Please select a language from the available list.");
      return;
    }

    setLoading(true);

    try {
      const uploadResponse = await uploadMedia(file, "reels");
      const uploadedFile = uploadResponse?.[0];

      if (!uploadedFile?.url || !uploadedFile?.public_id) {
        throw new Error("Media upload did not return a valid file.");
      }

      const response = await fetch("/api/reel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caption: caption.trim(),
          tags,
          transcription: transcription.trim(),
          translation: translation.trim(),
          language: selectedLanguageId,
          media: {
            image_url: uploadedFile.url,
            public_id: uploadedFile.public_id,
          },
          type: mediaKind,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create reel.");
      }

      toast.success(
        `${mediaKind === "audio" ? "Audio" : "Video"} reel uploaded successfully!`,
      );

      setCaption("");
      setTags([]);
      setTranscription("");
      setTranslation("");
      setLanguage("");
      setSelectedLanguageId(null);
      clearMedia();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/50">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Audio or Video
            </h2>

            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Upload a short video or an audio recording.
            </p>
          </div>

          {mediaKind && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
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
            disabled={validatingMedia}
            className="w-full rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-10 text-center transition hover:border-teal-500 hover:bg-teal-50/50 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-teal-400 dark:hover:bg-teal-950/20"
          >
            <span className="text-3xl">{validatingMedia ? "⏳" : "🎵"}</span>

            <p className="mt-3 font-semibold text-slate-800 dark:text-slate-100">
              {validatingMedia
                ? "Checking media file..."
                : "Click to upload audio or video"}
            </p>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Video: MP4, MOV, WebM — maximum 200 MB and 5 minutes.
              <br />
              Audio: MP3, WAV, M4A, AAC, OGG, FLAC — maximum 20 MB and 10
              minutes.
            </p>
          </button>
        ) : (
          <div className="space-y-4">
            {mediaKind === "audio" ? (
              <div className="rounded-2xl bg-gradient-to-br from-teal-950 via-cyan-950 to-slate-950 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500 text-lg">
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
                  src={previewUrl}
                  className="h-64 w-full object-contain sm:h-80"
                />

                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <p className="truncate text-sm text-slate-200">
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
                className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                Replace File
              </button>

              <button
                type="button"
                onClick={clearMedia}
                className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          id="fileInput"
          type="file"
          accept="audio/*,video/*,.mp3,.wav,.m4a,.aac,.ogg,.oga,.flac,.mp4,.webm,.mov,.ogv,.avi"
          onChange={handleFileChange}
          className="hidden"
        />
      </section>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          Caption
        </label>

        <textarea
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          rows={3}
          maxLength={2000}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          placeholder="Write a caption for your reel..."
          required
        />

        <p className="mt-1 text-right text-xs text-slate-500 dark:text-slate-400">
          {caption.length}/2000
        </p>
      </div>

      <div>
        <label className="mb-3 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          Tags
        </label>

        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => {
            const active = tags.includes(tag);

            return (
              <button
                type="button"
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "border-teal-600 bg-teal-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-teal-400 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-teal-950/30"
                }`}
              >
                {active ? "✓ " : ""}
                {tag}
              </button>
            );
          })}
        </div>
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
          maxLength={5000}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          placeholder="Write the spoken content in its original language..."
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
          maxLength={5000}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          placeholder="Write an English translation..."
        />
      </div>

      <div className="language-combobox">
        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          Language
        </label>

        <div className="relative">
          <input
            type="text"
            value={language}
            onChange={(event) => {
              setLanguage(event.target.value);
              setSelectedLanguageId(null);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search available languages..."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            required
          />

          {showDropdown && (
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
                    className={`w-full rounded-lg px-4 py-2.5 text-left text-sm transition hover:bg-teal-50 dark:hover:bg-teal-950/30 ${
                      selectedLanguageId === item._id
                        ? "bg-teal-50 font-semibold text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"
                        : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {item.name}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                  No matching language exists. Contact an administrator to add
                  it.
                </div>
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

      <button
        type="submit"
        disabled={loading || validatingMedia}
        className="w-full rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-teal-500/20 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {loading
          ? "Uploading..."
          : mediaKind === "audio"
            ? "Upload Audio Reel"
            : "Upload Reel"}
      </button>
    </form>
  );
}
