import dotenv from "dotenv";
dotenv.config(); // Load environment variables first

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import apiRouter from "./server/routes.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Global parse middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API endpoints routing
  app.use("/api", apiRouter);

  // Health endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Sarathi AI Full Stack Service" });
  });

  // Vite static/middleware service block
  if (process.env.NODE_ENV !== "production") {
    console.log("🛠️ Starting Sarathi AI server in Development mode with active Vite routing...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("🚀 Starting Sarathi AI server in standalone Production container...");
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve static compiled UI files
    app.use(express.static(distPath));
    
    // Fallback any client routes straight back to index.html for React SPA
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🏭 Sarathi AI server successfully online and routing!`);
    console.log(`📡 Access endpoints directly at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("💥 FAILED TO START SARATHI CORE MONOLITH:", err);
});
