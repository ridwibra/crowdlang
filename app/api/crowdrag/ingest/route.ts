// app/api/crowdrag/ingest/route.ts
import { NextResponse } from "next/server";

import Alphabet from "@/models/Alphabet";
import Essay from "@/models/Essay";
import Language from "@/models/Language";
import Reel from "@/models/Reel";
import Table from "@/models/Table";

import db from "@/utils/db";
import { getSession } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedRoles = ["admin", "staff"];

type SourceType =
  | "alphabet"
  | "essay"
  | "language"
  | "language-fallback"
  | "reel"
  | "table"
  | "table-reverse";

type RAGDocument = {
  sourceType: SourceType;
  sourceId: string;
  text: string;
  language: string;
};

export async function POST() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          message: "You must be signed in.",
        },
        {
          status: 401,
        },
      );
    }

    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        {
          message:
            "You do not have permission to rebuild the chatbot index.",
        },
        {
          status: 403,
        },
      );
    }

    await db.connect();

    const [
      alphabets,
      essays,
      languages,
      reels,
      tables,
    ] = await Promise.all([
      Alphabet.find({}).lean(),
      Essay.find({}).lean(),
      Language.find({}).lean(),
      Reel.find({}).lean(),
      Table.find({}).lean(),
    ]);

    const documents: RAGDocument[] = [];

    /*
     * ALPHABETS
     */
    for (const alphabet of alphabets as any[]) {
      const letters = Array.isArray(alphabet.letters)
        ? alphabet.letters
            .map(
              (letter: { character?: string }) =>
                letter.character,
            )
            .filter(Boolean)
            .join(", ")
        : "";

      documents.push({
        sourceType: "alphabet",
        sourceId: alphabet._id.toString(),
        text: `Alphabet (${alphabet.name ?? "Untitled"}): ${letters}`,
        language: alphabet.language?.toString() ?? "",
      });
    }

    /*
     * ESSAYS
     */
    for (const essay of essays as any[]) {
      documents.push({
        sourceType: "essay",
        sourceId: essay._id.toString(),
        text: `Essay: ${essay.title ?? "Untitled"}. ${
          essay.body ?? ""
        }`,
        language: essay.language?.toString() ?? "",
      });
    }

    /*
     * LANGUAGES
     */
    for (const language of languages as any[]) {
      const countries = Array.isArray(language.countries)
        ? language.countries
            .filter(Boolean)
            .join(", ")
        : "";

      documents.push({
        sourceType: "language",
        sourceId: language._id.toString(),
        text: `Language: ${
          language.name ?? "Unnamed language"
        }. Countries: ${countries}`,
        language: language.name ?? "",
      });
    }

    /*
     * REELS
     */
    for (const reel of reels as any[]) {
      documents.push({
        sourceType: "reel",
        sourceId: reel._id.toString(),
        text: `Reel (${reel.language ?? ""}): ${
          reel.caption ?? ""
        }. Transcription: ${reel.transcription ?? ""}`,
        language: reel.language?.toString() ?? "",
      });
    }

    /*
     * TABLES
     */
    for (const table of tables as any[]) {
      documents.push({
        sourceType: "table",
        sourceId: table._id.toString(),
        text: `Table (${table.textType ?? "entry"}): ${
          table.text ?? ""
        } => ${table.translation ?? ""}`,
        language: table.language?.toString() ?? "",
      });

      /*
       * Reverse translation
       */
      if (table.text && table.translation) {
        documents.push({
          sourceType: "table-reverse",
          sourceId: table._id.toString(),
          text: `Reverse (${table.textType ?? "entry"}): ${
            table.translation
          } => ${table.text}`,
          language: table.language?.toString() ?? "",
        });
      }
    }

    /*
     * LANGUAGES WITHOUT OTHER CONTENT
     *
     * Give them a fallback document so the chatbot
     * can still answer basic questions about the language.
     */
    for (const language of languages as any[]) {
      const languageId = language._id.toString();

      const hasContent =
        alphabets.some(
          (alphabet: any) =>
            alphabet.language?.toString() === languageId,
        ) ||
        essays.some(
          (essay: any) =>
            essay.language?.toString() === languageId,
        ) ||
        reels.some(
          (reel: any) =>
            reel.language?.toString() === languageId,
        ) ||
        tables.some(
          (table: any) =>
            table.language?.toString() === languageId,
        );

      if (!hasContent) {
        const countries = Array.isArray(language.countries)
          ? language.countries
              .filter(Boolean)
              .join(", ")
          : "";

        documents.push({
          sourceType: "language-fallback",
          sourceId: languageId,
          text: `Basic information about ${
            language.name ?? "this language"
          }. Countries or territories: ${countries}.`,
          language: language.name ?? "",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      documents,
      count: documents.length,
    });
  } catch (error) {
    console.error(
      "Could not prepare RAG documents:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unknown server error.";

    return NextResponse.json(
      {
        message: `Could not prepare RAG documents: ${message}`,
      },
      {
        status: 500,
      },
    );
  }
}
