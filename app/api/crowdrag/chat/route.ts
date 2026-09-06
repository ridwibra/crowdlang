// app/api/crowdrag/chat/route.ts
import { NextResponse } from "next/server";
import CrowdRAGItem from "@/models/CrowdRAGItem";
import Language from "@/models/Language";
import db from "@/utils/db";
import { generateAnswer } from "@/utils/local-llm";
import { normalizeQuery } from "@/utils/query-normalizer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_MESSAGE_LENGTH = 1000;
const MAX_CONTEXT_ITEMS = 6;
const MAX_ITEM_TEXT_LENGTH = 1_100;
const EMBEDDING_DIMENSION = 384;
const MIN_RELEVANCE_SCORE = 0.26;

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 12;

const requestCounts = new Map<string, number[]>();

type SafeSource = {
  type: string;
  title: string | null;
  language: string | null;
  category: string | null;
};

function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  const dot = a.reduce(
    (sum, value, index) => sum + value * b[index],
    0,
  );

  const normA = Math.sqrt(
    a.reduce((sum, value) => sum + value * value, 0),
  );

  const normB = Math.sqrt(
    b.reduce((sum, value) => sum + value * value, 0),
  );

  return dot / (normA * normB + 1e-8);
}

function getClientIdentifier(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(request: Request) {
  const client = getClientIdentifier(request);
  const now = Date.now();

  const recentRequests = (requestCounts.get(client) || []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );

  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    requestCounts.set(client, recentRequests);
    return true;
  }

  recentRequests.push(now);
  requestCounts.set(client, recentRequests);

  return false;
}

function looksLikePromptInjection(value: string) {
  const patterns = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /ignore\s+the\s+above/i,
    /system\s*:/i,
    /developer\s*:/i,
    /reveal\s+(your\s+)?prompt/i,
    /show\s+(your\s+)?instructions/i,
    /print\s+(your\s+)?system/i,
    /act\s+as\s+/i,
    /you\s+are\s+now/i,
    /jailbreak/i,
    /disregard\s+(all\s+)?instructions/i,
  ];

  return patterns.some((pattern) => pattern.test(value));
}

function getQueryWords(query: string): string[] {
  const ignoredWords = new Set([
    "about",
    "also",
    "and",
    "are",
    "can",
    "could",
    "do",
    "for",
    "from",
    "give",
    "how",
    "i",
    "is",
    "language",
    "languages",
    "me",
    "of",
    "please",
    "tell",
    "the",
    "to",
    "what",
    "where",
    "which",
    "with",
  ]);

  return [
    ...new Set(
      query
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, " ")
        .split(/\s+/)
        .map((word) => word.trim())
        .filter(
          (word) =>
            word.length >= 2 &&
            !ignoredWords.has(word),
        ),
    ),
  ];
}

function keywordScore(
  queryWords: string[],
  item: {
    text?: string;
    title?: string;
    language?: string;
    keywords?: string[];
    category?: string;
    domain?: string;
  },
) {
  const title = (item.title || "").toLowerCase();
  const language = (item.language || "").toLowerCase();
  const text = (item.text || "").toLowerCase();
  const category = (item.category || "").toLowerCase();
  const domain = (item.domain || "").toLowerCase();

  const keywords = Array.isArray(item.keywords)
    ? item.keywords.map((keyword) => keyword.toLowerCase())
    : [];

  return queryWords.reduce((score, word) => {
    let nextScore = score;

    if (title.includes(word)) nextScore += 2.5;
    if (language === word) nextScore += 3.5;
    if (language.includes(word)) nextScore += 1.5;
    if (keywords.some((keyword) => keyword === word)) nextScore += 2;
    if (keywords.some((keyword) => keyword.includes(word))) {
      nextScore += 1;
    }
    if (category.includes(word)) nextScore += 0.8;
    if (domain.includes(word)) nextScore += 0.8;
    if (text.includes(word)) nextScore += 0.5;

    return nextScore;
  }, 0);
}

function sanitizeContextText(value: string) {
  return value
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_ITEM_TEXT_LENGTH);
}

function isValidEmbedding(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === EMBEDDING_DIMENSION &&
    value.every(
      (number) =>
        typeof number === "number" && Number.isFinite(number),
    )
  );
}

function getBuiltInAnswer(query: string): string | null {
  const normalized = query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  const identityQuestions = [
    "who are you",
    "what are you",
    "what is parrot",
    "tell me about yourself",
    "what can you do",
    "how can you help",
  ];

  if (identityQuestions.some((question) => normalized.includes(question))) {
    return "I’m Parrot, CrowdLang’s assistant. I can help you explore CrowdLang languages, alphabets, essays, reels, translations, tables, maps, and other public language-learning content.";
  }

  if (
    normalized.includes("what is crowdlang") ||
    normalized.includes("about crowdlang")
  ) {
    return "CrowdLang is a platform for exploring and sharing public language-learning content, including languages, alphabets, essays, reels, translations, tables, and maps.";
  }

  return null;
}

function isLanguageListQuestion(query: string) {
  const normalized = query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  const languageTerms =
    normalized.includes("language") || normalized.includes("languages");

  if (!languageTerms) {
    return false;
  }

  const listTerms = [
    "which",
    "what",
    "list",
    "show",
    "all",
    "available",
    "have",
    "offer",
    "provide",
    "supported",
    "support",
  ];

  return listTerms.some((term) => normalized.includes(term));
}

function isLanguageCountQuestion(query: string) {
  const normalized = query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  return (
    (normalized.includes("how many") ||
      normalized.includes("number of") ||
      normalized.includes("count")) &&
    (normalized.includes("language") ||
      normalized.includes("languages"))
  );
}

async function getAllActiveLanguagesAnswer() {
  const languages = await Language.find({ status: "active" })
    .select("name countries")
    .sort({ name: 1 })
    .lean();

  if (languages.length === 0) {
    return {
      answer: "No public languages are available yet.",
      sources: [] as SafeSource[],
    };
  }

  const names = languages
    .map((language: any) =>
      typeof language.name === "string" ? language.name.trim() : "",
    )
    .filter(Boolean);

  const answer =
    names.length === 1
      ? `CrowdLang currently has 1 public language available: ${names[0]}.`
      : `CrowdLang currently has ${names.length} public languages available:\n\n${names
          .map((name) => `- ${name}`)
          .join("\n")}`;

  const sources: SafeSource[] = languages.map((language: any) => ({
    type: "language",
    title:
      typeof language.name === "string" ? language.name.trim() : null,
    language:
      typeof language.name === "string" ? language.name.trim() : null,
    category: "language",
  }));

  return { answer, sources };
}

function createSafeSources(items: Array<{ item: any }>): SafeSource[] {
  const seen = new Set<string>();

  return items
    .map(({ item }) => ({
      type: typeof item.sourceType === "string" ? item.sourceType : "content",
      title: typeof item.title === "string" ? item.title : null,
      language: typeof item.language === "string" ? item.language : null,
      category: typeof item.category === "string" ? item.category : null,
    }))
    .filter((source) => {
      const key = [
        source.language || "",
        source.title || "",
        source.category || "",
        source.type,
      ]
        .join("|")
        .toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

export async function POST(request: Request) {
  try {
    if (isRateLimited(request)) {
      return NextResponse.json(
        {
          message:
            "Parrot is receiving too many requests from this connection. Please wait a few minutes and try again.",
        },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => null);

    const rawMessage =
      typeof body?.message === "string" ? body.message : "";

    const message = rawMessage.trim();

    if (!message) {
      return NextResponse.json(
        { message: "Please enter a question." },
        { status: 400 },
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        {
          message: `Questions must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
        },
        { status: 400 },
      );
    }

    if (looksLikePromptInjection(message)) {
      return NextResponse.json({
        answer:
          "I can help with public CrowdLang language content, but I cannot provide internal instructions or private information.",
        sources: [],
      });
    }

    const cleanedQuery = normalizeQuery(message);

    if (!cleanedQuery) {
      return NextResponse.json(
        { message: "Please enter a valid question." },
        { status: 400 },
      );
    }

    const builtInAnswer = getBuiltInAnswer(cleanedQuery);

    if (builtInAnswer) {
      return NextResponse.json({
        answer: builtInAnswer,
        sources: [],
      });
    }

    await db.connect();

    // Structured database route:
    // Never use top-k RAG retrieval for questions asking for a complete language list.
    if (isLanguageCountQuestion(cleanedQuery)) {
      const languages = await Language.find({ status: "active" })
        .select("name")
        .lean();

      return NextResponse.json({
        answer: `CrowdLang currently has ${languages.length} public ${
          languages.length === 1 ? "language" : "languages"
        } available.`,
        sources: [],
      });
    }

    if (isLanguageListQuestion(cleanedQuery)) {
      const result = await getAllActiveLanguagesAnswer();

      return NextResponse.json(result);
    }

    if (!isValidEmbedding(body?.embedding)) {
      return NextResponse.json(
        {
          message:
            "A valid browser-generated query embedding is required.",
        },
        { status: 400 },
      );
    }

    const queryEmbedding = body.embedding;
    const queryWords = getQueryWords(cleanedQuery);
    const normalizedQuery = cleanedQuery.toLowerCase();

    const items = await CrowdRAGItem.find({})
      .select(
        "sourceType sourceId text language title keywords category level domain embedding",
      )
      .lean();

    if (items.length === 0) {
      return NextResponse.json({
        answer:
          "No information is available yet. CrowdLang content needs to be indexed before Parrot can answer questions.",
        sources: [],
      });
    }

    const scoredItems = items
      .filter(
        (item: any) =>
          Array.isArray(item.embedding) &&
          item.embedding.length === EMBEDDING_DIMENSION &&
          typeof item.text === "string" &&
          item.text.trim().length > 0 &&
          !looksLikePromptInjection(item.text),
      )
      .map((item: any) => {
        const semanticScore = cosineSimilarity(
          queryEmbedding,
          item.embedding,
        );

        const lexicalScore = keywordScore(queryWords, item);

        const title = (item.title || "").toLowerCase().trim();
        const language = (item.language || "").toLowerCase().trim();
        const text = item.text.toLowerCase();

        const exactQueryBonus =
          normalizedQuery.length >= 3 &&
          (title.includes(normalizedQuery) ||
            text.includes(normalizedQuery))
            ? 2.5
            : 0;

        const exactTitleBonus =
          title.length >= 2 && title === normalizedQuery ? 8 : 0;

        const partialTitleBonus =
          title.length >= 2 && normalizedQuery.includes(title) ? 3 : 0;

        const languageNameBonus =
          language.length >= 2 && normalizedQuery.includes(language)
            ? 3.5
            : 0;

        const translationBonus =
          (item.sourceType === "table" ||
            item.sourceType === "table-reverse") &&
          (title === normalizedQuery ||
            text.includes(`original: ${normalizedQuery}`))
            ? 4
            : 0;

        return {
          item,
          semanticScore,
          lexicalScore,
          score:
            semanticScore * 0.65 +
            lexicalScore * 0.8 +
            exactQueryBonus +
            exactTitleBonus +
            partialTitleBonus +
            languageNameBonus +
            translationBonus,
        };
      })
      .sort((first, second) => second.score - first.score)
      .filter((result) => result.score >= MIN_RELEVANCE_SCORE)
      .slice(0, MAX_CONTEXT_ITEMS);

    if (scoredItems.length === 0) {
      return NextResponse.json({
        answer: "No information available.",
        sources: [],
      });
    }

    console.info("Parrot retrieval", {
      query: cleanedQuery,
      candidates: scoredItems.map(
        ({ item, semanticScore, lexicalScore, score }) => ({
          sourceType: item.sourceType,
          title: item.title || null,
          language: item.language || null,
          semanticScore: Number(semanticScore.toFixed(4)),
          lexicalScore,
          score: Number(score.toFixed(4)),
        }),
      ),
    });

    const context = scoredItems
      .map(
        ({ item }, index) =>
          [
            `[SOURCE ${index + 1}]`,
            `Type: ${item.sourceType}`,
            item.title ? `Title: ${item.title}` : "",
            item.language ? `Language: ${item.language}` : "",
            item.category ? `Category: ${item.category}` : "",
            item.level ? `Level: ${item.level}` : "",
            item.domain ? `Domain: ${item.domain}` : "",
            Array.isArray(item.keywords) && item.keywords.length
              ? `Keywords: ${item.keywords.join(", ")}`
              : "",
            "Content:",
            sanitizeContextText(item.text),
          ]
            .filter(Boolean)
            .join("\n"),
      )
      .join("\n\n---\n\n");

    const answer = await generateAnswer({
      question: message,
      context,
    });

    return NextResponse.json({
      answer,
      sources: createSafeSources(scoredItems),
    });
  } catch (error) {
    console.error("CrowdLang chat error:", error);

    return NextResponse.json(
      {
        message: "Parrot could not answer right now. Please try again.",
      },
      { status: 500 },
    );
  }
}