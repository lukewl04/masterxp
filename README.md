Master XP

<img width="1053" height="905" alt="image" src="https://github.com/user-attachments/assets/8dcd570e-bb75-4dd1-adba-745f436d6a3c" />

Master XP is a gamified daily task manager that helps build consistency by turning small tasks into experience points. Complete tasks, earn XP, and level up over time.
The app is built with React on the frontend, an Express API on the backend, Auth0 for authentication, and Supabase for persistent storage.

Features

Daily task list
XP system (1 task completed = 1 XP)
Automatic leveling (every 100 XP)
Secure authentication with Auth0
Persistent storage with Supabase
Daily completion progress tracking
Clear completed tasks

Tech Stack

Frontend
React (Vite)
Auth0 React SDK
Bootstrap 5

Backend
Node.js
Express
Auth0 JWT validation
Supabase (PostgreSQL)
Authentication Flow
User logs in via Auth0
Auth0 issues an access token

Frontend sends the token in the Authorization header

Backend verifies the token (issuer, audience, signature)

The Auth0 user ID is used to scope all data securely


