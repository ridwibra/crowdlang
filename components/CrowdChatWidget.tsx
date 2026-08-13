"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  sender: "user" | "parrot";
  text: string;
};

export default function ParrotChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMessage = async (messageToSend?: string) => {
    const trimmedMessage = (messageToSend ?? message).trim();

    if (!trimmedMessage || loading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      text: trimmedMessage,
    };

    setMessages((previous) => [...previous, userMessage]);

    if (!messageToSend) {
      setMessage("");
    }

    setLoading(true);

    try {
      const response = await fetch("/api/crowdrag/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmedMessage,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Unable to get a response right now.");
      }

      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          sender: "parrot",
          text:
            data?.answer ||
            "I could not find an answer right now. Please try again.",
        },
      ]);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          sender: "parrot",
          text:
            error instanceof Error
              ? error.message
              : "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);
  const retryLastQuestion = () => {
    const lastUserMessage = [...messages]
      .reverse()
      .find((chatMessage) => chatMessage.sender === "user");

    if (lastUserMessage) {
      void sendMessage(lastUserMessage.text);
    }
  };
  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Parrot assistant"
          className="group fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 shadow-lg shadow-teal-600/30 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-teal-600/40 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 sm:bottom-6 sm:right-6"
        >
          <span className="absolute -right-1 -top-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-300 opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-teal-400" />
          </span>

          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white/95 shadow-sm transition group-hover:scale-105 dark:bg-slate-950">
            <Image
              src="/images/logo.png"
              alt=""
              width={40}
              height={40}
              className="h-full w-full object-contain p-1 dark:invert"
            />
          </div>
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby="parrot-chat-title"
          className="fixed bottom-3 right-3 z-50 flex h-[min(680px,calc(100vh-1.5rem))] w-[calc(100vw-1.5rem)] max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/25 animate-[fadeIn_0.2s_ease] dark:border-slate-700 dark:bg-slate-900 sm:bottom-6 sm:right-6 sm:h-[620px] sm:w-96"
        >
          <header className="relative overflow-hidden border-b border-teal-100 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-700 px-5 py-4 dark:border-teal-500/20">
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-12 left-8 h-24 w-24 rounded-full bg-cyan-300/20 blur-2xl" />

            <div className="relative flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg">
                  <Image
                    src="/images/logo.png"
                    alt="CrowdLang logo"
                    width={44}
                    height={44}
                    className="h-full w-full object-contain p-1"
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2
                      id="parrot-chat-title"
                      className="truncate font-black text-white"
                    >
                      Parrot Assistant
                    </h2>

                    <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.95)]" />
                  </div>

                  <p className="mt-0.5 text-xs text-cyan-100">
                    CrowdLang language guide
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close Parrot assistant"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
              >
                ✕
              </button>
            </div>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-5 dark:bg-slate-950/50"
          >
            {messages.length === 0 && !loading && (
              <div className="flex min-h-full flex-col items-center justify-center px-4 py-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-teal-100 to-cyan-100 shadow-sm dark:from-teal-950/60 dark:to-cyan-950/40">
                  <Image
                    src="/images/logo.png"
                    alt=""
                    width={56}
                    height={56}
                    className="h-full w-full object-contain p-2 dark:invert"
                  />
                </div>

                <h3 className="mt-5 text-lg font-black text-slate-900 dark:text-white">
                  Hello, I&apos;m Parrot
                </h3>

                <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Ask me about languages, CrowdLang features, reels, maps, or
                  how to navigate the platform.
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {[
                    "How do I explore language maps?",
                    "How do I add a reel?",
                    "Where can I find translations?",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setMessage(suggestion)}
                      className="rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-700 transition hover:border-teal-400 hover:bg-teal-50 dark:border-teal-500/20 dark:bg-slate-900 dark:text-teal-300 dark:hover:bg-teal-950/30"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((chatMessage) => (
              <div
                key={chatMessage.id}
                className={`flex gap-2 ${
                  chatMessage.sender === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                {chatMessage.sender === "parrot" && (
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500">
                    <Image
                      src="/images/logo.png"
                      alt=""
                      width={28}
                      height={28}
                      className="h-full w-full object-contain p-0.5"
                    />
                  </div>
                )}

                <div
                  className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                    chatMessage.sender === "user"
                      ? "rounded-br-md bg-gradient-to-br from-teal-500 to-cyan-600 text-white"
                      : "rounded-bl-md border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  }`}
                >
                  {chatMessage.text}

                  {chatMessage.sender === "parrot" &&
                    chatMessage.text !== "No information available." &&
                    chatMessage.text.includes("Unable to") && (
                      <button
                        type="button"
                        onClick={retryLastQuestion}
                        disabled={loading}
                        className="mt-2 block text-xs font-bold text-teal-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-teal-300"
                      >
                        Try again
                      </button>
                    )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-start gap-2">
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500">
                  <Image
                    src="/images/logo.png"
                    alt=""
                    width={28}
                    height={28}
                    className="h-full w-full object-contain p-0.5"
                  />
                </div>

                <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-teal-500 [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-teal-500 [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-teal-500" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
            className="border-t border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-slate-50 p-2 transition focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-800">
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Ask Parrot anything..."
                disabled={loading}
                maxLength={1000}
                className="min-h-10 min-w-0 flex-1 bg-transparent px-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60 dark:text-white dark:placeholder:text-slate-500"
              />

              <button
                type="submit"
                disabled={!message.trim() || loading}
                aria-label="Send message"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-lg font-bold text-white shadow-sm transition hover:from-teal-600 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ↑
              </button>
            </div>

            <p className="mt-2 px-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
              Parrot may make mistakes. Verify important language information.
            </p>
          </form>
        </section>
      )}
    </>
  );
}
