// app/api/table/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/utils/db";
import User from "@/models/User";
import { getSession } from "@/lib/server";
import { UserType } from "@/utils/types";
import Table from "@/models/Table";

export async function GET() {
  try {
    await db.connect();

    const tableDocs = await Table.find()
      .sort({ createdAt: 1 })
      .lean();

      console.log("📌 RAW TABLE DOCS:", JSON.stringify(tableDocs, null, 2));


    const rows = tableDocs.map((doc: any) => {
      const languageId = Array.isArray(doc.language) ? doc.language[0] : doc.language;

      return {
        _id: doc._id.toString(),
        english: doc.text || "",
        translationId: doc._id.toString(),
        translations: {
          [languageId?.toString()]: {
            value: doc.translation || "",
            rowId: doc._id.toString(),
          },
        },
        textType: doc.textType,
      };
    });

     console.log("📌 TRANSFORMED ROWS:", JSON.stringify(rows, null, 2));
         console.log(`📌 TOTAL ROWS RETURNED: ${rows.length}`);


    return NextResponse.json({ rows }, { status: 200 });
  } catch (error: any) {
    console.error(" TABLE GET ERROR:", error);
    return NextResponse.json(
      { message: error.message || "Failed to fetch table content" },
      { status: 500 }
    );
  } 
}

export async function POST(request: NextRequest) {
  try {
    await db.connect();

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as typeof session.user & UserType;
    const { text, translation, language, textType } = await request.json();

    if (!text || !translation || !language) {
      return NextResponse.json(
        { message: "Missing required fields." },
        { status: 400 }
      );
    }

    const mongoUser = await User.findOne({ email: user.email });
    if (!mongoUser) {
      return NextResponse.json(
        { message: "User not found in database" },
        { status: 404 }
      );
    }

    const newRow = new Table({
      text,
      translation,
      language,
      textType,
      createdBy: mongoUser._id,
    });

    await newRow.save();

    return NextResponse.json(
      { message: "Row added successfully." },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to create row" },
      { status: 500 }
    );
  } 
}