// app/api/tracker/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Tracker from "@/models/Tracker";
import db from "@/utils/db";

export async function POST(req: Request) {
   await db.connect(); 
  const session = await auth.api.getSession({ headers: req.headers });
  const data = await req.json();

  await Tracker.create({
    sessionId: data.sessionId,            // always required
    userId: session?.user?.id || null,    // optional
    isAuthenticated: !!session,           // true or false
    ...data                               // all other fields (reels, maps, resources, device info)
  });

  return NextResponse.json({ success: true });
}
