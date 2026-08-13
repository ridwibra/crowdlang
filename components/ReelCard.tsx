"use client";

import EditReelForm from "./EditReelForm";
import { FrontendComment, ReelCardType } from "@/utils/types";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

function ToggleButton({
  id,
  label,
  icon,
  open,
  onClick,
  count,
  activeClass,
}: {
  id: string;
  label: string;
  icon: string;
  open: boolean;
  onClick: () => void;
  count?: number;
  activeClass: string;
}) {
  return (
    <button
      id={id}
      type="button"
      aria-expanded={open}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
        open
          ? activeClass
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      }`}
    >
      <span aria-hidden="true">{icon}</span>

      {open ? `Hide ${label}` : label}

      {typeof count === "number" && (
        <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200">
          {count}
        </span>
      )}

      <span
        aria-hidden="true"
        className={`transition-transform ${open ? "rotate-180" : ""}`}
      >
        ↓
      </span>
    </button>
  );
}

export default function ReelCard({
  reel,
  currentUserId,
  languages,
}: {
  reel: ReelCardType;
  currentUserId: string | null;
  languages: { _id: string; name: string }[];
}) {
  const router = useRouter();

  const [likes, setLikes] = useState(reel.likes.length);
  const [hasLiked, setHasLiked] = useState(reel.hasLiked ?? false);

  const [comments, setComments] = useState<FrontendComment[]>(
    reel.comments ?? [],
  );

  const [showComments, setShowComments] = useState(false);
  const [showTranscription, setShowTranscription] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);

  const [editingCommentText, setEditingCommentText] = useState("");

  const [editingReel, setEditingReel] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isOwner = currentUserId && reel.author?._id === currentUserId;

  const hasTranscription = Boolean(reel.transcription?.trim());
  const hasTranslation = Boolean(reel.translation?.trim());

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            document.querySelectorAll("video").forEach((otherVideo) => {
              if (otherVideo !== video) {
                otherVideo.pause();
              }
            });

            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      {
        threshold: 0.6,
      },
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, []);
  useEffect(() => {
    if (reel.type !== "audio") {
      return;
    }

    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            document
              .querySelectorAll<HTMLAudioElement>(
                "audio[data-reel-audio='true']",
              )
              .forEach((otherAudio) => {
                if (otherAudio !== audio) {
                  otherAudio.pause();
                }
              });

            void audio.play().catch(() => {
              /*
               * Some browsers block autoplay with sound until
               * the user has interacted with the page.
               */
            });

            return;
          }

          audio.pause();
        });
      },
      {
        threshold: 0.6,
      },
    );

    observer.observe(audio);

    return () => {
      observer.disconnect();
    };
  }, [reel.type]);

  const handleLikeToggle = async () => {
    const response = await fetch(`/api/reel/${reel._id}/like`, {
      method: hasLiked ? "DELETE" : "POST",
    });

    if (response.ok) {
      setHasLiked((previous) => !previous);
      setLikes((previous) => (hasLiked ? previous - 1 : previous + 1));
      return;
    }

    const data = await response.json().catch(() => null);

    toast.error(data?.message || "Failed to update like.");
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/reel/${reel._id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: commentText.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        throw new Error(data?.message || "Failed to add comment.");
      }

      const data = await response.json();

      setComments(data.comments ?? comments);
      setCommentText("");
      setShowComments(true);

      toast.success("Comment added.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add comment.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentLikeToggle = async (commentId: string, liked: boolean) => {
    const response = await fetch(
      `/api/reel/${reel._id}/comments/${commentId}/like`,
      {
        method: liked ? "DELETE" : "POST",
      },
    );

    if (response.ok) {
      setComments((previousComments) =>
        previousComments.map((comment) =>
          comment._id === commentId
            ? {
                ...comment,
                likes: liked
                  ? comment.likes.filter((id) => id !== currentUserId)
                  : [...comment.likes, String(currentUserId)],
              }
            : comment,
        ),
      );

      return;
    }

    const data = await response.json().catch(() => null);

    toast.error(data?.message || "Failed to update comment like.");
  };

  const startEditComment = (comment: FrontendComment) => {
    setEditingCommentId(comment._id);
    setEditingCommentText(comment.text);
  };

  const saveCommentEdit = async (commentId: string) => {
    if (!editingCommentText.trim()) return;

    const response = await fetch(
      `/api/reel/${reel._id}/comments/${commentId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: editingCommentText.trim(),
        }),
      },
    );

    if (response.ok) {
      setComments((previousComments) =>
        previousComments.map((comment) =>
          comment._id === commentId
            ? {
                ...comment,
                text: editingCommentText.trim(),
              }
            : comment,
        ),
      );

      setEditingCommentId(null);
      setEditingCommentText("");

      toast.success("Comment updated.");
      return;
    }

    const data = await response.json().catch(() => null);

    toast.error(data?.message || "Failed to update comment.");
  };

  const deleteComment = async (commentId: string) => {
    if (!window.confirm("Delete this comment?")) return;

    const response = await fetch(
      `/api/reel/${reel._id}/comments/${commentId}`,
      {
        method: "DELETE",
      },
    );

    if (response.ok) {
      setComments((previousComments) =>
        previousComments.filter((comment) => comment._id !== commentId),
      );

      toast.success("Comment deleted.");
      return;
    }

    const data = await response.json().catch(() => null);

    toast.error(data?.message || "Failed to delete comment.");
  };

  const deleteReel = async () => {
    if (
      !window.confirm("Delete this reel permanently? This cannot be undone.")
    ) {
      return;
    }

    const response = await fetch(`/api/reel/${reel._id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      toast.success("Reel deleted.");
      router.refresh();
      return;
    }

    const data = await response.json().catch(() => null);

    toast.error(data?.message || "Failed to delete reel.");
  };

  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
      {editingReel ? (
        <div className="p-4 sm:p-5">
          <EditReelForm
            reelId={reel._id}
            initialCaption={reel.caption}
            initialTags={reel.tags}
            initialTranscription={reel.transcription}
            initialTranslation={reel.translation}
            initialLanguageId={reel.languageId}
            initialMedia={reel.media}
            initialType={reel.type}
            languages={languages}
            onCancel={() => setEditingReel(false)}
            onSaved={() => {
              setEditingReel(false);
              router.refresh();
            }}
          />
        </div>
      ) : (
        <>
          <div className="p-4 sm:p-5">
            {reel.type === "audio" ? (
              <div className="mb-5 overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 via-cyan-50 to-slate-100 p-5 dark:border-teal-900/50 dark:from-teal-950/40 dark:via-cyan-950/30 dark:to-slate-900">
                <div className="relative flex min-h-64 flex-col items-center justify-center overflow-hidden rounded-xl bg-slate-900 px-5 py-8 shadow-inner">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.22),transparent_55%)]" />

                  <div className="absolute h-56 w-56 rounded-full border border-teal-300/20" />

                  <div
                    className={`absolute h-44 w-44 rounded-full border border-cyan-300/30 ${
                      isAudioPlaying
                        ? "motion-safe:animate-[spin_18s_linear_infinite]"
                        : ""
                    }`}
                  />

                  <div
                    className={`relative flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 p-2 shadow-[0_0_45px_rgba(45,212,191,0.45)] ${
                      isAudioPlaying
                        ? "motion-safe:animate-[spin_18s_linear_infinite]"
                        : ""
                    }`}
                  >
                    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-white/30 bg-white shadow-xl dark:bg-slate-950">
                      <Image
                        src="/images/logo.png"
                        alt="Audio reel logo"
                        width={250}
                        height={250}
                        className="h-full w-full scale-125 object-contain"
                      />
                    </div>
                  </div>

                  <div className="relative mt-6 text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-teal-300">
                      Audio Reel
                    </p>

                    <p className="mt-2 text-xs text-slate-300">
                      {isAudioPlaying ? "Now playing" : "Press play to listen"}
                    </p>
                  </div>
                </div>

                <audio
                  ref={audioRef}
                  data-reel-audio="true"
                  controls
                  autoPlay
                  preload="metadata"
                  src={reel.media.image_url}
                  onPlay={() => setIsAudioPlaying(true)}
                  onPause={() => setIsAudioPlaying(false)}
                  onEnded={() => setIsAudioPlaying(false)}
                  className="mt-4 w-full"
                />
              </div>
            ) : (
              <video
                ref={videoRef}
                src={reel.media.image_url}
                controls
                playsInline
                className="mb-5 h-64 w-full rounded-2xl bg-slate-950 object-cover shadow-sm sm:h-72 lg:h-80"
              />
            )}

            {reel.author && (
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {reel.author.avatar ? (
                    <Image
                      src={reel.author.avatar}
                      alt={reel.author.name}
                      width={42}
                      height={42}
                      className="h-11 w-11 shrink-0 rounded-full border-2 border-teal-100 object-cover dark:border-teal-950"
                    />
                  ) : (
                    <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500" />
                  )}

                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">
                      {reel.author.name}
                    </p>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Community contributor
                    </p>
                  </div>
                </div>

                {isOwner && (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingReel(true)}
                      className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={deleteReel}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}

            {reel.caption && (
              <p className="mb-4 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
                {reel.caption}
              </p>
            )}

            {reel.tags.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {reel.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mb-5">
              <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                Language: {reel.language}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleLikeToggle}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                  hasLiked
                    ? "bg-slate-800 text-white hover:bg-slate-700 focus:ring-slate-500 dark:bg-slate-700"
                    : "bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500"
                }`}
              >
                <span aria-hidden="true">{hasLiked ? "♥" : "♡"}</span>

                {hasLiked ? "Liked" : "Like"}

                <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-xs">
                  {likes}
                </span>
              </button>

              {hasTranscription && (
                <ToggleButton
                  id={`transcription-toggle-${reel._id}`}
                  label="Transcript"
                  icon="📝"
                  open={showTranscription}
                  onClick={() => setShowTranscription((previous) => !previous)}
                  activeClass="border-cyan-600 bg-cyan-50 text-cyan-700 dark:border-cyan-400 dark:bg-cyan-950/40 dark:text-cyan-300"
                />
              )}

              {hasTranslation && (
                <ToggleButton
                  id={`translation-toggle-${reel._id}`}
                  label="Translation"
                  icon="🌐"
                  open={showTranslation}
                  onClick={() => setShowTranslation((previous) => !previous)}
                  activeClass="border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-400 dark:bg-purple-950/40 dark:text-purple-300"
                />
              )}

              <ToggleButton
                id={`comments-toggle-${reel._id}`}
                label="Comments"
                icon="💬"
                open={showComments}
                onClick={() => setShowComments((previous) => !previous)}
                count={comments.length}
                activeClass="border-teal-600 bg-teal-50 text-teal-700 dark:border-teal-400 dark:bg-teal-950/40 dark:text-teal-300"
              />
            </div>

            {showTranscription && hasTranscription && (
              <section
                id={`transcription-panel-${reel._id}`}
                role="region"
                aria-labelledby={`transcription-toggle-${reel._id}`}
                className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4 dark:border-cyan-900/60 dark:bg-cyan-950/20"
              >
                <div className="flex items-center gap-2">
                  <span aria-hidden="true">📝</span>

                  <h2 className="text-sm font-bold text-cyan-900 dark:text-cyan-200">
                    Transcription
                  </h2>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
                  {reel.transcription}
                </p>
              </section>
            )}

            {showTranslation && hasTranslation && (
              <section
                id={`translation-panel-${reel._id}`}
                role="region"
                aria-labelledby={`translation-toggle-${reel._id}`}
                className="mt-4 rounded-2xl border border-purple-100 bg-purple-50/70 p-4 dark:border-purple-900/60 dark:bg-purple-950/20"
              >
                <div className="flex items-center gap-2">
                  <span aria-hidden="true">🌐</span>

                  <h2 className="text-sm font-bold text-purple-900 dark:text-purple-200">
                    English Translation
                  </h2>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
                  {reel.translation}
                </p>
              </section>
            )}
          </div>

          {showComments && (
            <div
              id={`comments-panel-${reel._id}`}
              role="region"
              aria-labelledby={`comments-toggle-${reel._id}`}
              className="border-t border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30 sm:p-5"
            >
              <p className="mb-3 text-sm font-bold text-slate-900 dark:text-white">
                Comments
                <span className="ml-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {comments.length}
                </span>
              </p>

              <div className="flex gap-2">
                <input
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleComment();
                    }
                  }}
                  placeholder="Add a thoughtful comment..."
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />

                <button
                  type="button"
                  onClick={handleComment}
                  disabled={isSubmitting || !commentText.trim()}
                  className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Posting..." : "Post"}
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {comments.length === 0 ? (
                  <p className="py-2 text-sm text-slate-500 dark:text-slate-400">
                    No comments yet. Start the conversation.
                  </p>
                ) : (
                  comments.map((comment) => {
                    const isCommentOwner = currentUserId === comment.user._id;

                    const likedByMe = currentUserId
                      ? comment.likes.includes(currentUserId)
                      : false;

                    const isEditing = editingCommentId === comment._id;

                    return (
                      <div
                        key={comment._id}
                        className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              {comment.user.name}
                            </p>

                            {isEditing ? (
                              <input
                                value={editingCommentText}
                                onChange={(event) =>
                                  setEditingCommentText(event.target.value)
                                }
                                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              />
                            ) : (
                              <p className="mt-1 break-words text-sm leading-5 text-slate-600 dark:text-slate-300">
                                {comment.text}
                              </p>
                            )}
                          </div>

                          <div className="flex shrink-0 flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleCommentLikeToggle(comment._id, likedByMe)
                              }
                              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                likedByMe
                                  ? "bg-teal-600 text-white"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                              }`}
                            >
                              {likedByMe ? "♥" : "♡"} {comment.likes.length}
                            </button>

                            {isCommentOwner && !isEditing && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEditComment(comment)}
                                  className="rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-amber-600"
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() => deleteComment(comment._id)}
                                  className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-red-700"
                                >
                                  Delete
                                </button>
                              </>
                            )}

                            {isEditing && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => saveCommentEdit(comment._id)}
                                  className="rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-teal-700"
                                >
                                  Save
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCommentId(null);
                                    setEditingCommentText("");
                                  }}
                                  className="rounded-lg bg-slate-500 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-slate-600"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </>
      )}
    </article>
  );
}
