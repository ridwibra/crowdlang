//app/api/users/[id]/role/route.ts
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import User from "@/models/User";
import db from "@/utils/db";

const ALLOWED_ROLES = ["user", "staff", "admin"] as const;
type UserRole = (typeof ALLOWED_ROLES)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    await db.connect();

    const { role } = await req.json();

    if (!role || !ALLOWED_ROLES.includes(role as UserRole)) {
      return NextResponse.json(
        { error: "Invalid or missing role" },
        { status: 400 },
      );
    }

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 },
      );
    }

    if (session.user.id === id && role !== "admin") {
      return NextResponse.json(
        { error: "Admins cannot change their own role to a non-admin role." },
        { status: 400 },
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role },
      { returnDocument: "after", runValidators: true },
    ).select("_id name email image role createdAt emailVerified");

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "User role updated successfully",
      user: {
        _id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        image: updatedUser.image,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt,
        emailVerified: updatedUser.emailVerified,
      },
    });
  } catch (error) {
    console.error("PATCH /api/users/[id]/role error:", error);
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 },
    );
  }
}