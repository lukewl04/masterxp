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
} from "./db.js";

const app = express();

// Change this to match your frontend dev URL
const FRONTEND_ORIGIN = "http://localhost:5173";

app.use(cors({
  origin: FRONTEND_ORIGIN,
}));
app.use(express.json());

// All /api routes require a valid Auth0 access token
app.use("/api", checkJwt);

// Helper to ensure user exists in DB
function ensureUser(auth0Id) {
  let user = findUserByAuth0Id(auth0Id);
  if (!user) {
    user = createUser({ auth0Id, xp: 0, level: 1 });
  }
  return user;
}

// GET /api/me – get current user's XP + level
app.get("/api/me", (req, res) => {
  const auth0Id = req.auth.payload.sub; // Auth0 user ID

  const user = ensureUser(auth0Id);

  res.json({
    auth0Id: user.auth0_id,
    xp: user.xp,
    level: user.level,
  });
});

// POST /api/xp/add – add XP to current user
app.post("/api/xp/add", (req, res) => {
  const auth0Id = req.auth.payload.sub;
  const { amount } = req.body;

  if (typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }

  const user = ensureUser(auth0Id);

  const newXp = user.xp + amount;

  // Example level formula: level 1 + one level per 100 xp
  const newLevel = Math.floor(newXp / 100) + 1;

  const updatedUser = updateUserXP(auth0Id, newXp, newLevel);

  res.json({
    auth0Id: updatedUser.auth0_id,
    xp: updatedUser.xp,
    level: updatedUser.level,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
