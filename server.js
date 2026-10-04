import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT) || 3e3;
const distPath = path.resolve(__dirname, "dist");
const indexPath = path.join(distPath, "index.html");
app.use(express.json());
app.get(["/healthz", "/health", "/_health"], (req, res) => {
  res.status(200).send("OK");
});
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}
app.get("*", (req, res) => {
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error("Error sending index.html:", err);
        res.status(200).send('<!DOCTYPE html><html><head><title>Skyblock Value Calculator</title></head><body><div id="root">Loading Skyblock Value Calculator...</div></body></html>');
      }
    });
  } else {
    res.status(200).send('<!DOCTYPE html><html><head><title>Skyblock Value Calculator</title></head><body><div id="root">Loading Skyblock Value Calculator...</div></body></html>');
  }
});
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT} (0.0.0.0:${PORT})`);
});
process.on("SIGTERM", () => {
  console.log("SIGTERM received, closing HTTP server...");
  server.close(() => {
    console.log("HTTP server closed");
  });
});
