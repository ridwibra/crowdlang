"use client";

import { deleteMedia } from "@/utils/files/requests";
import EditReelForm from "./EditReelForm";
import { FrontendComment, ReelCardType } from "@/utils/types";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type UserRole = "user" | "staff" | "admin" | "root";

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
      aria-controls={id.replace("-toggle-", "-panel-")}
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
      <span aria-hidden="true" className={open ? "rotate-180" : ""}>
        ↓
      </span>
    </button>
  );
}

export default function ReelCard({
  reel,
  currentUserId,
  currentUserRole = "user",
  languages,
}: {
  reel: ReelCardType;
  currentUserId: string | null;
  currentUserRole?: UserRole;
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
  const [deletingReel, setDeletingReel] = useState(false);
  const [reelDeleted, setReelDeleted] = useState(false);
  const [likingReel, setLikingReel] = useState(false);
  const [commentBusyId, setCommentBusyId] = useState<string | null>(null);

  const reelDeletedRef = useRef(false);
  const pendingMediaIdRef = useRef<string | null>(null);
  const deletingRef = useRef(false);
  const likingRef = useRef(false);
  const postingRef = useRef(false);
  const commentBusyRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isOwner = Boolean(currentUserId && reel.author?._id === currentUserId);

  const canManageReel =
    Boolean(currentUserId) &&
    (isOwner || currentUserRole === "admin" || currentUserRole === "root");

  const hasTranscription = Boolean(reel.transcription?.trim());
  const hasTranslation = Boolean(reel.translation?.trim());

  useEffect(() => {
    setLikes(reel.likes.length);
    setHasLiked(reel.hasLiked ?? false);
    setComments(reel.comments ?? []);
  }, [reel]);

  useEffect(() => {
    if (editingReel || reelDeleted) return;

    const media = reel.type === "audio" ? audioRef.current : videoRef.current;

    if (!media) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            media.pause();
            return;
          }

          document
            .querySelectorAll<HTMLMediaElement>(
              "video[data-reel-media='true'], audio[data-reel-media='true']",
            )
            .forEach((other) => {
              if (other !== media) other.pause();
            });

          void media.play().catch(() => {});
        });
      },
      { threshold: 0.6 },
    );

    observer.observe(media);

    return () => {
      observer.disconnect();
      media.pause();
    };
  }, [editingReel, reelDeleted, reel.type, reel.media.image_url]);

  function requireSignIn() {
    if (currentUserId) return true;
    toast.error("Please sign in to continue.");
    return false;
  }

  const handleLikeToggle = async () => {
    if (!requireSignIn() || likingRef.current || reelDeletedRef.current) return;

    likingRef.current = true;
    setLikingReel(true);
    const previouslyLiked = hasLiked;

    try {
      const response = await fetch(`/api/reel/${reel._id}/like`, {
        method: previouslyLiked ? "DELETE" : "POST",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to update like.");
      }

      setHasLiked(!previouslyLiked);
      setLikes((previous) =>
        Math.max(0, previous + (previouslyLiked ? -1 : 1)),
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update like.",
      );
    } finally {
      likingRef.current = false;
      setLikingReel(false);
    }
  };

  const handleComment = async () => {
    if (
      !requireSignIn() ||
      postingRef.current ||
      reelDeletedRef.current ||
      !commentText.trim()
    ) {
      return;
    }

    postingRef.current = true;
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/reel/${reel._id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: commentText.trim() }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to add comment.");
      }

      if (Array.isArray(data.comments)) setComments(data.comments);
      setCommentText("");
      setShowComments(true);
      toast.success("Comment added.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add comment.",
      );
    } finally {
      postingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleCommentLikeToggle = async (commentId: string, liked: boolean) => {
    if (!requireSignIn() || commentBusyRef.current || reelDeletedRef.current) {
      return;
    }

    commentBusyRef.current = true;
    setCommentBusyId(commentId);

    try {
      const response = await fetch(
        `/api/reel/${reel._id}/comments/${commentId}/like`,
        { method: liked ? "DELETE" : "POST" },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to update comment like.");
      }

      setComments((previous) =>
        previous.map((comment) =>
          comment._id === commentId
            ? {
                ...comment,
                likes: liked
                  ? comment.likes.filter((id) => id !== currentUserId)
                  : [...new Set([...comment.likes, currentUserId!])],
              }
            : comment,
        ),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update comment like.",
      );
    } finally {
      commentBusyRef.current = false;
      setCommentBusyId(null);
    }
  };

  const startEditComment = (comment: FrontendComment) => {
    setEditingCommentId(comment._id);
    setEditingCommentText(comment.text);
  };

  const saveCommentEdit = async (commentId: string) => {
    if (
      !editingCommentText.trim() ||
      commentBusyRef.current ||
      reelDeletedRef.current
    ) {
      return;
    }

    commentBusyRef.current = true;
    setCommentBusyId(commentId);
    const nextText = editingCommentText.trim();

    try {
      const response = await fetch(
        `/api/reel/${reel._id}/comments/${commentId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: nextText }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to update comment.");
      }

      setComments((previous) =>
        previous.map((comment) =>
          comment._id === commentId ? { ...comment, text: nextText } : comment,
        ),
      );
      setEditingCommentId(null);
      setEditingCommentText("");
      toast.success("Comment updated.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update comment.",
      );
    } finally {
      commentBusyRef.current = false;
      setCommentBusyId(null);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (
      commentBusyRef.current ||
      reelDeletedRef.current ||
      !window.confirm("Delete this comment?")
    ) {
      return;
    }

    commentBusyRef.current = true;
    setCommentBusyId(commentId);

    try {
      const response = await fetch(
        `/api/reel/${reel._id}/comments/${commentId}`,
        { method: "DELETE" },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete comment.");
      }

      setComments((previous) =>
        previous.filter((comment) => comment._id !== commentId),
      );
      toast.success("Comment deleted.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete comment.",
      );
    } finally {
      commentBusyRef.current = false;
      setCommentBusyId(null);
    }
  };

  const deleteReel = async () => {
    if (deletingRef.current) return;

    if (
      !reelDeletedRef.current &&
      !window.confirm(
        "Delete this reel permanently? Its media, comments, likes, and dislikes will also be removed.",
      )
    ) {
      return;
    }

    deletingRef.current = true;
    setDeletingReel(true);

    try {
      if (!reelDeletedRef.current) {
        const response = await fetch(`/api/reel/${reel._id}`, {
          method: "DELETE",
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Failed to delete reel.");
        }

        pendingMediaIdRef.current =
          data.deletedMediaPublicId || reel.media.public_id || null;
        reelDeletedRef.current = true;
        setReelDeleted(true);
      }

      if (pendingMediaIdRef.current) {
        const result = await deleteMedia(pendingMediaIdRef.current);

        if (!result.success) {
          throw new Error("Media cleanup was not confirmed.");
        }

        pendingMediaIdRef.current = null;
      }

      toast.success("Reel and its media deleted.");
      router.refresh();
    } catch (error) {
      toast.error(
        reelDeletedRef.current
          ? "The reel was deleted, but its media could not be removed. Retry media cleanup."
          : error instanceof Error
            ? error.message
            : "Failed to delete reel.",
      );
    } finally {
      deletingRef.current = false;
      setDeletingReel(false);
    }
  };

  if (reelDeleted) {
    return (
      <article className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-semibold text-slate-900 dark:text-white">
          Reel deleted
        </h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Its comments and reactions have been removed.
          {pendingMediaIdRef.current && " Media cleanup is still pending."}
        </p>
        {pendingMediaIdRef.current && (
          <button
            type="button"
            onClick={deleteReel}
            disabled={deletingReel}
            className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {deletingReel ? "Cleaning up..." : "Retry media cleanup"}
          </button>
        )}
      </article>
    );
  }

  return (
    <article className="group min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
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
                  data-reel-media="true"
                  data-reel-audio="true"
                  controls
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
                data-reel-media="true"
                src={reel.media.image_url}
                controls
                playsInline
                preload="metadata"
                className="mb-5 h-64 w-full rounded-2xl bg-slate-950 object-cover shadow-sm sm:h-72 lg:h-80"
              />
            )}

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {reel.author?.avatar ? (
                  <Image
                    src={reel.author.avatar}
                    alt={reel.author.name}
                    width={42}
                    height={42}
                    className="h-11 w-11 shrink-0 rounded-full border-2 border-teal-100 object-cover dark:border-teal-950"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 text-sm font-bold text-white">
                    {(reel.author?.name || "U").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="break-words font-semibold text-slate-900 dark:text-white">
                    <bdi>{reel.author?.name || "Unknown contributor"}</bdi>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Community contributor
                  </p>
                </div>
              </div>

              {canManageReel && (
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={deletingReel}
                    onClick={() => setEditingReel(true)}
                    className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={deletingReel}
                    onClick={deleteReel}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deletingReel ? "Deleting..." : "Delete"}
                  </button>
                </div>
              )}
            </div>

            {reel.caption && (
              <p
                dir="auto"
                className="mb-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-200"
              >
                {reel.caption}
              </p>
            )}

            {reel.tags.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {reel.tags.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="max-w-full break-words rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"
                  >
                    <bdi>#{tag}</bdi>
                  </span>
                ))}
              </div>
            )}

            <div className="mb-5">
              <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                Language: <bdi className="ml-1">{reel.language}</bdi>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleLikeToggle}
                disabled={likingReel || deletingReel}
                aria-pressed={hasLiked}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
                  hasLiked
                    ? "bg-slate-800 hover:bg-slate-700 dark:bg-slate-700"
                    : "bg-teal-600 hover:bg-teal-700"
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
                aria-labelledby={`transcription-toggle-${reel._id}`}
                className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4 dark:border-cyan-900/60 dark:bg-cyan-950/20"
              >
                <h2 className="text-sm font-bold text-cyan-900 dark:text-cyan-200">
                  Transcription
                </h2>
                <p
                  dir="auto"
                  className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-200"
                >
                  {reel.transcription}
                </p>
              </section>
            )}

            {showTranslation && hasTranslation && (
              <section
                id={`translation-panel-${reel._id}`}
                aria-labelledby={`translation-toggle-${reel._id}`}
                className="mt-4 rounded-2xl border border-purple-100 bg-purple-50/70 p-4 dark:border-purple-900/60 dark:bg-purple-950/20"
              >
                <h2 className="text-sm font-bold text-purple-900 dark:text-purple-200">
                  English Translation
                </h2>
                <p
                  lang="en"
                  dir="ltr"
                  className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-200"
                >
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
                    if (
                      event.key === "Enter" &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      void handleComment();
                    }
                  }}
                  aria-label="Add a comment"
                  dir="auto"
                  disabled={isSubmitting || deletingReel}
                  placeholder="Add a thoughtful comment..."
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleComment}
                  disabled={isSubmitting || deletingReel || !commentText.trim()}
                  className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
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
                    const canManageComment =
                      Boolean(currentUserId) &&
                      (currentUserId === comment.user._id ||
                        currentUserRole === "admin" ||
                        currentUserRole === "root");
                    const likedByMe = currentUserId
                      ? comment.likes.includes(currentUserId)
                      : false;
                    const isEditing = editingCommentId === comment._id;
                    const busy = commentBusyId !== null || deletingReel;

                    return (
                      <div
                        key={comment._id}
                        className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              <bdi>{comment.user.name}</bdi>
                            </p>
                            {isEditing ? (
                              <input
                                value={editingCommentText}
                                onChange={(event) =>
                                  setEditingCommentText(event.target.value)
                                }
                                aria-label="Edit comment"
                                dir="auto"
                                disabled={busy}
                                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              />
                            ) : (
                              <p
                                dir="auto"
                                className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-slate-600 dark:text-slate-300"
                              >
                                {comment.text}
                              </p>
                            )}
                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                handleCommentLikeToggle(comment._id, likedByMe)
                              }
                              aria-pressed={likedByMe}
                              aria-label={`${likedByMe ? "Unlike" : "Like"} comment`}
                              className={`rounded-lg px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${
                                likedByMe
                                  ? "bg-teal-600 text-white"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                              }`}
                            >
                              {likedByMe ? "♥" : "♡"} {comment.likes.length}
                            </button>

                            {canManageComment && !isEditing && (
                              <>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => startEditComment(comment)}
                                  className="rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => deleteComment(comment._id)}
                                  className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
                                >
                                  Delete
                                </button>
                              </>
                            )}

                            {isEditing && (
                              <>
                                <button
                                  type="button"
                                  disabled={busy || !editingCommentText.trim()}
                                  onClick={() => saveCommentEdit(comment._id)}
                                  className="rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
                                >
                                  {commentBusyId === comment._id
                                    ? "Saving..."
                                    : "Save"}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => {
                                    setEditingCommentId(null);
                                    setEditingCommentText("");
                                  }}
                                  className="rounded-lg bg-slate-500 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
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
