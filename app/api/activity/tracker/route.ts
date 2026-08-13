// app/api/tracker/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Tracker from "@/models/Tracker";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const data = await req.json();
  
  await Tracker.create({
    userId: session.user.id,
    ...data
  });

  return NextResponse.json({ success: true });
}