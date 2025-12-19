// server/index.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { checkJwt } from "./auth.js";
import {
  findUserByAuth0Id,
  createUser,
  updateUserXP,
  listTodosByDate,
  createTodo,
  updateTodo,
  deleteTodo,
} from "./db.js";

const app = express();

const FRONTEND_ORIGIN = "http://localhost:5173";

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

// All /api routes require a valid Auth0 access token
app.use("/api", checkJwt);

// Helper to ensure user exists in DB
async function ensureUser(auth0Id) {
  let user = await findUserByAuth0Id(auth0Id);
  if (!user) {
    user = await createUser({ auth0Id, xp: 0, level: 1 });
  }
  return user;
}

// GET /api/me – get current user's XP + level
app.get("/api/me", async (req, res) => {
  try {
    const auth0Id = req.auth.payload.sub;
    const user = await ensureUser(auth0Id);

    res.json({ auth0Id: user.auth0_id, xp: user.xp, level: user.level });
  } catch (e) {
    res.status(500).json({ error: e.message || "Server error" });
  }
});

// POST /api/xp/add – add XP to current user
app.post("/api/xp/add", async (req, res) => {
  try {
    const auth0Id = req.auth.payload.sub;
    const { amount } = req.body;

    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "amount must be a positive number" });
    }

    const user = await ensureUser(auth0Id);

    const newXp = user.xp + amount;
    const newLevel = Math.floor(newXp / 100) + 1;

    const updatedUser = await updateUserXP(auth0Id, newXp, newLevel);

    res.json({ auth0Id: updatedUser.auth0_id, xp: updatedUser.xp, level: updatedUser.level });
  } catch (e) {
    res.status(500).json({ error: e.message || "Server error" });
  }
});

// ---------------- TODOS ----------------

// GET /api/todos?date=YYYY-MM-DD
app.get("/api/todos", async (req, res) => {
  try {
    const auth0Id = req.auth.payload.sub;
    await ensureUser(auth0Id);

    const date = req.query.date;
    if (!date) return res.status(400).json({ error: "Missing ?date=YYYY-MM-DD" });

    const todos = await listTodosByDate(auth0Id, date);
    res.json(todos);
  } catch (e) {
    res.status(500).json({ error: e.message || "Server error" });
  }
});

// POST /api/todos { text, date }
app.post("/api/todos", async (req, res) => {
  try {
    const auth0Id = req.auth.payload.sub;
    await ensureUser(auth0Id);

    const { text, date } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "text is required" });
    if (!date) return res.status(400).json({ error: "date is required (YYYY-MM-DD)" });

    const todo = await createTodo(auth0Id, { text: text.trim(), date });
    res.json(todo);
  } catch (e) {
    res.status(500).json({ error: e.message || "Server error" });
  }
});

// PATCH /api/todos/:id { completed?, xp_awarded?, text? }
app.patch("/api/todos/:id", async (req, res) => {
  try {
    const auth0Id = req.auth.payload.sub;
    await ensureUser(auth0Id);

    const { id } = req.params;

    // whitelist fields so clients can't patch random columns
    const patch = {};
    if (typeof req.body.completed === "boolean") patch.completed = req.body.completed;
    if (typeof req.body.xp_awarded === "boolean") patch.xp_awarded = req.body.xp_awarded;
    if (typeof req.body.text === "string") patch.text = req.body.text.trim();

    const updated = await updateTodo(auth0Id, id, patch);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message || "Server error" });
  }
});

// DELETE /api/todos/:id
app.delete("/api/todos/:id", async (req, res) => {
  try {
    const auth0Id = req.auth.payload.sub;
    await ensureUser(auth0Id);

    const { id } = req.params;
    await deleteTodo(auth0Id, id);

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message || "Server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
