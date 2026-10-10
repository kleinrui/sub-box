import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { login } from "@/server/services/authentication-service";

function getClientIP(headersList: Headers): string {
  // Try to get IP from various headers
  const forwardedFor = headersList.get("x-forwarded-for");
  const firstIP = forwardedFor?.split(",")[0]?.trim();
  if (firstIP) {
    return firstIP;
  }

  const realIP = headersList.get("x-real-ip");
  if (realIP?.length) {
    return realIP;
  }

  // Fallback to a default value
  return "unknown";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body as { username: string; password: string };
    const headersList = await headers();
    const clientIP = getClientIP(headersList);

    if (!username || !password) {
      return new NextResponse("Missing username or password", { status: 400 });
    }

    try {
      const success = await login(username, password, clientIP);
      if (!success) {
        return new NextResponse("Invalid credentials", { status: 401 });
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("blocked")) {
        return new NextResponse(error.message, { status: 429 });
      }
      throw error;
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("[LOGIN]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
