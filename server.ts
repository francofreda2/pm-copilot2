import express from "express";
import cors from "cors";
import { initDb } from "./src/db.js";
import authRoutes from "./src/routes/auth.js";
import projectRoutes from "./src/routes/projects.js";
import incidentRoutes from "./src/routes/incidents.js";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

  // Initialize Database
  await initDb();

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/incidents", incidentRoutes);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Gemini proxy — keeps API key server-side
  const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  app.post("/api/gemini/chat", async (req: any, res: any) => {
    if (!geminiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
    try {
      const { systemInstruction, history, message, temperature } = req.body;
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const chat = ai.chats.create({
        model: "gemini-2.5-flash",
        config: { systemInstruction, temperature: temperature ?? 0.7, thinkingConfig: { thinkingBudget: 2048 }, httpOptions: { timeout: 120000 } },
        history: history || undefined,
      });
      const response = await chat.sendMessage({ message });
      res.json({ text: response.text || "" });
    } catch (err: any) {
      console.error("Gemini proxy error:", err?.message);
      res.status(500).json({ error: err?.message || "Gemini error" });
    }
  });

  app.post("/api/gemini/generate", async (req: any, res: any) => {
    if (!geminiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
    try {
      const { prompt, temperature, responseSchema } = req.body;
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const config: any = {
        temperature: temperature ?? 0.3,
        thinkingConfig: { thinkingBudget: 4096 },
        httpOptions: { timeout: 120000 },
      };
      if (responseSchema) {
        config.responseMimeType = "application/json";
        config.responseSchema = responseSchema;
      }
      const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config });
      res.json({ text: response.text || "" });
    } catch (err: any) {
      console.error("Gemini generate error:", err?.message);
      res.status(500).json({ error: err?.message || "Gemini error" });
    }
  });

  // Vite middleware for development, static files for production
  if (process.env.NODE_ENV === "production") {
    const { default: path } = await import('path');
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('{*path}', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  const PORT = parseInt(process.env.PORT || '3000');
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
