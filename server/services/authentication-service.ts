import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { env } from "@/env";

const SESSION_TAG = env.SESSION_TAG;
const SESSION_DURATION_SECONDS = env.SESSION_DURATION; // Now a number in seconds
const ADMIN_USERNAME = env.ADMIN_USERNAME;
const ADMIN_PASSWORD = env.ADMIN_PASSWORD;

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD must be set");
}

// Create a secret key for JWT signing
const secretKey = new TextEncoder().encode(env.JWT_SECRET); // Use env.JWT_SECRET

// Rate limiting configuration
const MAX_FAILED_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes in milliseconds
const BLOCK_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Store login attempts in memory
// In production, you might want to use Redis or a database
interface LoginAttempt {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}

const loginAttempts = new Map<string, LoginAttempt>();

// Clean up old entries periodically
setInterval(
  () => {
    const now = Date.now();
    for (const [ip, attempt] of loginAttempts.entries()) {
      if (attempt.blockedUntil && attempt.blockedUntil < now) {
        loginAttempts.delete(ip);
      } else if (!attempt.blockedUntil && now - attempt.firstAttempt > RATE_LIMIT_WINDOW) {
        loginAttempts.delete(ip);
      }
    }
  },
  5 * 60 * 1000
); // Clean up every 5 minutes

// Rate limiting functions
function isIPBlocked(ip: string): boolean {
  const attempt = loginAttempts.get(ip);
  if (!attempt) return false;

  if (attempt.blockedUntil && attempt.blockedUntil > Date.now()) {
    return true;
  }

  if (attempt.blockedUntil && attempt.blockedUntil <= Date.now()) {
    loginAttempts.delete(ip);
    return false;
  }

  return false;
}

function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  if (!attempt) {
    loginAttempts.set(ip, {
      count: 1,
      firstAttempt: now,
    });
    return;
  }

  // Reset count if outside window
  if (now - attempt.firstAttempt > RATE_LIMIT_WINDOW) {
    loginAttempts.set(ip, {
      count: 1,
      firstAttempt: now,
    });
    return;
  }

  // Increment count and block if necessary
  attempt.count++;
  if (attempt.count >= MAX_FAILED_ATTEMPTS) {
    attempt.blockedUntil = now + BLOCK_DURATION;
  }
}

function resetAttempts(ip: string) {
  loginAttempts.delete(ip);
}

export async function login(username: string, password: string, ip: string) {
  // Check if IP is blocked
  if (isIPBlocked(ip)) {
    throw new Error("IP is temporarily blocked due to too many failed attempts");
  }

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    recordFailedAttempt(ip);
    return false;
  }

  const token = await new SignJWT({ username, tag: SESSION_TAG })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`) // Pass duration as string like '3600s'
    .sign(secretKey);

  const cookieStore = await cookies();
  cookieStore.set("auth_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS, // Use seconds directly
  });

  // Reset attempts on successful login
  resetAttempts(ip);
  return true;
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_session");
}

export async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_session");
  if (!token) return null;

  try {
    const verified = await jwtVerify(token.value, secretKey);
    const payload = verified.payload as { username: string; tag: string };

    // Verify session tag
    if (payload.tag !== SESSION_TAG) {
      return null;
    }

    return { username: payload.username };
  } catch {
    return null;
  }
}

export async function isAuthenticated() {
  return (await getUser()) !== null;
}
