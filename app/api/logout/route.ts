import { NextResponse } from "next/server";
import { logout } from "@/server/services/authentication-service";

export async function POST() {
  try {
    await logout();
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("[LOGOUT]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
