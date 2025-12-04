# Vibe Tournament Organization

A modern tournament organization platform built for speed and flexibility.

> This project was made by **Google Antigravity** using **AI Vibe Coding** with **Gemini 3 Pro** + **Claude 4.5**.

## 🛠️ Tech Stack

### Backend
![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white)
![ElysiaJS](https://img.shields.io/badge/ElysiaJS-23c45e?style=for-the-badge&logo=elysia&logoColor=white)
![SQLite](https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/drizzle-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)

*   **Runtime**: Bun
*   **Framework**: ElysiaJS
*   **Database**: SQLite (LibSQL)
*   **ORM**: Drizzle ORM

### Frontend
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)

*   **Framework**: React
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS
*   **Language**: TypeScript

## 📂 Structure

```
vibe-tournament-organization/
├── packages/
│   ├── backend/    # ElysiaJS API server, Database schema & migrations
│   └── frontend/   # React + Vite application
├── docker-compose.yml
└── README.md
```

## 🚀 Getting Started

### Backend

1.  **Navigate to the backend directory:**
    ```bash
    cd packages/backend
    ```

2.  **Install dependencies:**
    ```bash
    bun install
    ```

3.  **Set up the database:**
    ```bash
    bun run generate
    bun run migrate
    ```

4.  **Start the server:**
    ```bash
    bun run dev
    ```
    The API will be available at `http://localhost:3000`.

### Frontend

1.  **Navigate to the frontend directory:**
    ```bash
    cd packages/frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or if you have bun installed
    bun install
    ```

3.  **Start the development server:**
    ```bash
    npm run dev
    # or
    bun run dev
    ```
    The application will be available at `http://localhost:5173`.
