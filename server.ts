import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { initDb } from "./src/db.js";
import authRoutes from "./src/routes/auth.js";
import projectRoutes from "./src/routes/projects.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

  // Initialize Database
  await initDb();

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/projects", projectRoutes);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
