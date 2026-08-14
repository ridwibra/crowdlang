import { NextResponse } from "next/server";
import Marquee from "@/models/Marquee";
import db from "@/utils/db";


export async function GET() {
  try {
    await db.connect()

    const marquees = await Marquee.find()
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ marquees }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch marquees:", error);

    return NextResponse.json(
      { message: "Failed to fetch marquee messages." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await db.connect()

    const body = await request.json();

    if (!body.text?.trim()) {
      return NextResponse.json(
        { message: "Marquee text is required." },
        { status: 400 },
      );
    }

    const marquee = await Marquee.create({
      text: body.text.trim(),
      link: body.link?.trim() || "",
      isActive: body.isActive ?? true,
      speed: Number(body.speed) || 25,
      backgroundColor: body.backgroundColor || "#0f766e",
      textColor: body.textColor || "#ffffff",
    });

    return NextResponse.json({ marquee }, { status: 201 });
  } catch (error) {
    console.error("Failed to create marquee:", error);

    return NextResponse.json(
      { message: "Failed to create marquee message." },
      { status: 500 },
    );
  }
}