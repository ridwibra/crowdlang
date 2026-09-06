// app/api/crowdrag/chat/route.ts
import { NextResponse } from "next/server";
import CrowdRAGItem from "@/models/CrowdRAGItem";
import db from "@/utils/db";
import { generateAnswer } from "@/utils/local-llm";
import { normalizeQuery } from "@/utils/query-normalizer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_MESSAGE_LENGTH = 1000;
const MAX_CONTEXT_ITEMS = 6;
const MAX_ITEM_TEXT_LENGTH = 900;
const EMBEDDING_DIMENSION = 384;

function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0);
  const normA = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0));
  const normB = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0));

  return dot / (normA * normB + 1e-8);
}

function keywordScore(query: string, text: string) {
  const uniqueWords = [
    ...new Set(
      query
        .toLowerCase()
        .split(/\s+/)
        .map((word) => word.replace(/[^a-z0-9]/g, ""))
        .filter((word) => word.length >= 3),
    ),
  ];

  const normalizedText = text.toLowerCase();

  return uniqueWords.reduce(
    (score, word) => score + (normalizedText.includes(word) ? 1 : 0),
    0,
  );
}

function sanitizeContextText(value: string) {
  return value
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_ITEM_TEXT_LENGTH);
}

export async function POST(request: Request) {
  try {
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

    const cleanedQuery = normalizeQuery(message);

    if (!cleanedQuery) {
      return NextResponse.json(
        { message: "Please enter a valid question." },
        { status: 400 },
      );
    }

    const queryEmbedding = body?.embedding;

    if (
      !Array.isArray(queryEmbedding) ||
      queryEmbedding.length !== EMBEDDING_DIMENSION ||
      !queryEmbedding.every((value: unknown) => typeof value === "number")
    ) {
      return NextResponse.json(
        { message: "A valid query embedding is required." },
        { status: 400 },
      );
    }

    await db.connect();

    const items = await CrowdRAGItem.find({})
      .select("sourceType sourceId text language embedding")
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
          item.embedding.length === queryEmbedding.length &&
          typeof item.text === "string" &&
          item.text.trim().length > 0,
      )
      .map((item: any) => {
        const semanticScore = cosineSimilarity(
          queryEmbedding,
          item.embedding,
        );

        const lexicalScore = keywordScore(cleanedQuery, item.text);

        return {
          item,
          semanticScore,
          lexicalScore,
          score: semanticScore * 0.75 + lexicalScore * 0.25,
        };
      })
      .sort((first, second) => second.score - first.score)
      .slice(0, MAX_CONTEXT_ITEMS);

    if (scoredItems.length === 0) {
      return NextResponse.json({
        answer: "No information available.",
        sources: [],
      });
    }

    const context = scoredItems
      .map(
        ({ item }) =>
          `[SOURCE TYPE: ${item.sourceType}]\n${sanitizeContextText(item.text)}`,
      )
      .join("\n\n");

    const answer = await generateAnswer({
      question: message,
      context,
    });

    return NextResponse.json({
      answer,
      sources: scoredItems.map(({ item }) => ({
        type: item.sourceType,
        language: item.language || null,
      })),
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