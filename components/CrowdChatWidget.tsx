"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { embedText } from "@/utils/embeddings";

type ChatSource = {
  type: string;
  title: string | null;
  language: string | null;
  category: string | null;
};

type ChatMessage = {
  id: string;
  sender: "user" | "parrot";
  text: string;
  sources?: ChatSource[];
};

function getSourceLabel(source: ChatSource) {
  if (source.language?.trim()) {
    return source.language.trim();
  }

  if (source.title?.trim()) {
    return source.title.trim();
  }

  if (source.category?.trim()) {
    return source.category.trim();
  }

  return source.type;
}

function getUniqueSources(sources: ChatSource[] = []) {
  const seen = new Set<string>();

  return sources.filter((source) => {
    const label = getSourceLabel(source)
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    if (!label || seen.has(label)) {
      return false;
    }

    seen.add(label);
    return true;
  });
}

export default function ParrotChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = useMemo(
    () => [
      "Who are you?",
      "What is CrowdLang?",
      "How do I explore language maps?",
      "Where can I find translations?",
    ],
    [],
  );

  const sendMessage = async (messageToSend?: string) => {
    const trimmedMessage = (messageToSend ?? message).trim();

    if (!trimmedMessage || loading) {
      return;
    }

    setMessages((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        sender: "user",
        text: trimmedMessage,
      },
    ]);

    if (!messageToSend) {
      setMessage("");
    }

    setLoading(true);

    try {
      const embedding = await embedText(trimmedMessage);

      const response = await fetch("/api/crowdrag/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmedMessage,
          embedding,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Unable to get a response right now.");
      }

      const sources = Array.isArray(data?.sources)
        ? (data.sources as ChatSource[])
        : [];

      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          sender: "parrot",
          text: data?.answer || "I could not find an answer right now.",
          sources: getUniqueSources(sources),
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
          sources: [],
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
          className="group fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 shadow-lg shadow-teal-600/30 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-teal-600/40"
        >
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white/95 shadow-sm">
            <Image
              src="/images/logo.png"
              alt=""
              width={40}
              height={40}
              className="h-full w-full object-contain p-1"
            />
          </div>
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby="parrot-chat-title"
          className="fixed bottom-3 right-3 z-50 flex h-[min(680px,calc(100vh-1.5rem))] w-[calc(100vw-1.5rem)] max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        >
          <header className="border-b border-teal-100 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-700 px-5 py-4">
            <div className="relative flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg">
                  <Image
                    src="/images/logo.png"
                    alt="CrowdLang logo"
                    width={44}
                    height={44}
                    className="h-full w-full object-contain p-1"
                  />
                </div>

                <div>
                  <h2 id="parrot-chat-title" className="font-black text-white">
                    Parrot Assistant
                  </h2>

                  <p className="text-xs text-cyan-100">
                    CrowdLang language guide
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close Parrot assistant"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-lg text-white transition hover:bg-white/20"
              >
                ✕
              </button>
            </div>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-5"
          >
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-teal-100 to-cyan-100 shadow-sm">
                  <Image
                    src="/images/logo.png"
                    alt=""
                    width={56}
                    height={56}
                    className="h-full w-full object-contain p-2"
                  />
                </div>

                <h3 className="mt-5 text-lg font-black text-slate-900">
                  Hello, I&apos;m Parrot
                </h3>

                <p className="mt-2 max-w-xs text-sm text-slate-500">
                  Ask me about public CrowdLang languages, alphabets, essays,
                  reels, translations, tables, maps, or how to navigate the
                  platform.
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {suggestedQuestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setMessage(suggestion)}
                      className="rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-700 transition hover:border-teal-300 hover:bg-teal-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((chatMessage) => {
              const uniqueSources = getUniqueSources(chatMessage.sources);

              return (
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
                    className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      chatMessage.sender === "user"
                        ? "rounded-br-md bg-gradient-to-br from-teal-500 to-cyan-600 text-white"
                        : "rounded-bl-md border border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {chatMessage.text}

                    {chatMessage.sender === "parrot" &&
                      uniqueSources.length > 0 && (
                        <div className="mt-3 border-t border-slate-100 pt-2">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                            Sources used
                          </p>

                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {uniqueSources.map((source, index) => (
                              <span
                                key={`${getSourceLabel(source)}-${index}`}
                                className="rounded-full bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-700"
                              >
                                {getSourceLabel(source)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    {chatMessage.sender === "parrot" &&
                      (chatMessage.text.includes("Unable to") ||
                        chatMessage.text.includes(
                          "could not answer right now",
                        )) && (
                        <button
                          type="button"
                          onClick={retryLastQuestion}
                          disabled={loading}
                          className="mt-2 block text-xs font-bold text-teal-600 hover:underline disabled:opacity-50"
                        >
                          Try again
                        </button>
                      )}
                  </div>
                </div>
              );
            })}

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

                <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
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
              void sendMessage();
            }}
            className="border-t border-slate-200 bg-white p-3"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-slate-50 p-2">
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Ask Parrot anything..."
                disabled={loading}
                maxLength={1000}
                className="min-h-10 flex-1 bg-transparent px-2 text-sm text-slate-900 outline-none"
              />

              <button
                type="submit"
                disabled={!message.trim() || loading}
                aria-label="Send message"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-lg font-bold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ↑
              </button>
            </div>

            <p className="mt-2 px-2 text-center text-[11px] text-slate-400">
              Parrot answers from public CrowdLang content. Verify important
              language information.
            </p>
          </form>
        </section>
      )}
    </>
  );
}
