import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import net from "net";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("vpn.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    ip TEXT NOT NULL,
    port INTEGER NOT NULL,
    password TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'chacha20-ietf-poly1305'
  );

  CREATE TABLE IF NOT EXISTS access_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    access_key TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (server_id) REFERENCES servers(id)
  );
`);

async function checkPort(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 2000;

    socket.setTimeout(timeout);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/servers", (req, res) => {
    const servers = db.prepare("SELECT * FROM servers").all();
    res.json(servers);
  });

  app.get("/api/servers/:id/status", async (req, res) => {
    const server: any = db.prepare("SELECT * FROM servers WHERE id = ?").get(req.params.id);
    if (!server) return res.status(404).json({ error: "Not found" });
    
    const isOnline = await checkPort(server.ip, server.port);
    res.json({ status: isOnline ? 'online' : 'offline' });
  });

  app.post("/api/servers", (req, res) => {
    const { name, ip, port, password, method } = req.body;
    const info = db.prepare(
      "INSERT INTO servers (name, ip, port, password, method) VALUES (?, ?, ?, ?, ?)"
    ).run(name, ip, port, password, method || 'chacha20-ietf-poly1305');
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/servers/:id", (req, res) => {
    db.prepare("DELETE FROM access_keys WHERE server_id = ?").run(req.params.id);
    db.prepare("DELETE FROM servers WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/digitalocean/droplets", async (req, res) => {
    const token = process.env.DIGITALOCEAN_TOKEN;
    if (!token) return res.status(400).json({ error: "DigitalOcean Token not configured" });

    try {
      const response = await fetch("https://api.digitalocean.com/v2/droplets", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch droplets" });
    }
  });

  app.get("/api/keys", (req, res) => {
    const keys = db.prepare(`
      SELECT ak.*, s.name as server_name, s.ip as server_ip 
      FROM access_keys ak 
      JOIN servers s ON ak.server_id = s.id
    `).all();
    res.json(keys);
  });

  app.post("/api/keys", (req, res) => {
    const { server_id, name } = req.body;
    const server: any = db.prepare("SELECT * FROM servers WHERE id = ?").get(server_id);
    
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    // Generate Shadowsocks URI: ss://BASE64(method:password)@ip:port#name
    const credentials = Buffer.from(`${server.method}:${server.password}`).toString('base64');
    const access_key = `ss://${credentials}@${server.ip}:${server.port}#${encodeURIComponent(name)}`;

    const info = db.prepare(
      "INSERT INTO access_keys (server_id, name, access_key) VALUES (?, ?, ?)"
    ).run(server_id, name, access_key);

    res.json({ id: info.lastInsertRowid, access_key });
  });

  app.delete("/api/keys/:id", (req, res) => {
    db.prepare("DELETE FROM access_keys WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
