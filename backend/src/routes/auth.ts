import { Hono } from "hono";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware, type AuthUser } from "../middleware/auth";

const auth = new Hono<{ Variables: { user: AuthUser } }>();

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-super-secret-jwt-key"
);

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  fullName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Register
auth.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const data = registerSchema.parse(body);

    // Check if user exists
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email));

    if (existingUsers.length > 0) {
      return c.json({ error: "User already exists" }, 400);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user
    const newUsers = await db
      .insert(users)
      .values({
        email: data.email,
        username: data.username,
        passwordHash,
        fullName: data.fullName,
      })
      .returning();

    const newUser = newUsers[0];

    // Generate token
    const token = await new SignJWT({
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      isAdmin: newUser.isAdmin,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(JWT_SECRET);

    return c.json({
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        fullName: newUser.fullName,
        isAdmin: newUser.isAdmin,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Validation error", details: error.errors }, 400);
    }
    throw error;
  }
});

// Login
auth.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const data = loginSchema.parse(body);

    // Find user
    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email));

    const user = foundUsers[0];

    if (!user) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    // Check password
    const validPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!validPassword) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    // Check if active
    if (!user.isActive) {
      return c.json({ error: "Account is disabled" }, 403);
    }

    // Generate token
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(JWT_SECRET);

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        isAdmin: user.isAdmin,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Validation error", details: error.errors }, 400);
    }
    throw error;
  }
});

// Get current user
auth.get("/me", authMiddleware, async (c) => {
  const authUser = c.get("user");

  const foundUsers = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id));

  const user = foundUsers[0];

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json({
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
  });
});

export default auth;
