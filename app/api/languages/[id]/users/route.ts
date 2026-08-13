// app/api/languages/[id]/users/route.ts
import "@/models/User";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import db from "@/utils/db";
import User from "@/models/User";
import Language from "@/models/Language";

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await db.connect();

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (
      !session?.user ||
      (session.user.role !== "admin" && session.user.role !== "staff")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    const language = await Language.findById(id);

    if (!language) {
      return NextResponse.json(
        { error: "Language not found" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);

    const query = searchParams.get("q")?.trim() || "";
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 20, 1),
      100,
    );

    const filter = query
      ? {
          $or: [
            {
              name: {
                $regex: escapeRegex(query),
                $options: "i",
              },
            },
            {
              email: {
                $regex: escapeRegex(query),
                $options: "i",
              },
            },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("_id name email image role emailVerified languageRoles")
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      User.countDocuments(filter),
    ]);

    const normalizedUsers = users.map((user: any) => ({
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      image: user.image,
      globalRole: user.role,
      languageRole:
        user.languageRoles?.[language.name] ??
        user.languageRoles?.get?.(language.name) ??
        "user",
      emailVerified: user.emailVerified,
    }));

    return NextResponse.json({
      users: normalizedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/languages/[id]/users error:", error);

    return NextResponse.json(
      { error: "Failed to fetch language users" },
      { status: 500 },
    );
  }
}