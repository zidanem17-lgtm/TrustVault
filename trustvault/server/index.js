import express from "express";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "10mb" }));

// ── Anthropic API proxy ──────────────────────────────────────────────────────
// Keeps ANTHROPIC_API_KEY on the server — never exposed to the browser.
app.post("/api/claude", async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: { message: "ANTHROPIC_API_KEY is not set. Add it to your .env file." },
    });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error("[TrustVault] Proxy error:", err);
    res.status(500).json({ error: { message: `Proxy error: ${err.message}` } });
  }
});

// ── Serve built frontend in production ───────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "../dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`TrustVault server running on http://localhost:${PORT}`);
  if (process.env.NODE_ENV !== "production") {
    console.log("  Frontend dev server: http://localhost:5173");
  }
});
