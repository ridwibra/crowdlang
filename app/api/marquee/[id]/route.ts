import { NextResponse } from "next/server";
import Marquee from "@/models/Marquee";
import db from "@/utils/db";


type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    await db.connect()

    const { id } = await params;
    const body = await request.json();

    if (!body.text?.trim()) {
      return NextResponse.json(
        { message: "Marquee text is required." },
        { status: 400 },
      );
    }

    const marquee = await Marquee.findByIdAndUpdate(
      id,
      {
        text: body.text.trim(),
        link: body.link?.trim() || "",
        isActive: Boolean(body.isActive),
        speed: Number(body.speed) || 25,
        backgroundColor: body.backgroundColor || "#0f766e",
        textColor: body.textColor || "#ffffff",
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!marquee) {
      return NextResponse.json(
        { message: "Marquee message not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ marquee }, { status: 200 });
  } catch (error) {
    console.error("Failed to update marquee:", error);

    return NextResponse.json(
      { message: "Failed to update marquee message." },
      { status: 500 },
    );
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    await db.connect()

    const { id } = await params;

    const marquee = await Marquee.findByIdAndDelete(id);

    if (!marquee) {
      return NextResponse.json(
        { message: "Marquee message not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Marquee message deleted." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to delete marquee:", error);

    return NextResponse.json(
      { message: "Failed to delete marquee message." },
      { status: 500 },
    );
  }
}