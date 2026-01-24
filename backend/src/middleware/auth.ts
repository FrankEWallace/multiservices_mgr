import { Context, Next } from "hono";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-super-secret-jwt-key"
);

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  isAdmin: boolean;
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized - No token provided" }, 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    c.set("user", payload as unknown as AuthUser);
    await next();
  } catch (error) {
    return c.json({ error: "Unauthorized - Invalid token" }, 401);
  }
}

export async function optionalAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      c.set("user", payload as unknown as AuthUser);
    } catch {
      // Token invalid, continue without user
    }
  }

  await next();
}
