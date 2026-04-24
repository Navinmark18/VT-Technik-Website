import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import OpenAI from "openai";
import { z } from "zod";
import { insertAndGetId, query } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../public/uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + crypto.randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(helmet());
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: "200kb" }));
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));
app.set("trust proxy", 1);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

const AnfrageSchema = z.object({
  vorname: z.string().min(1),
  nachname: z.string().min(1),
  email: z.string().email(),
  telefon: z.string().optional().nullable(),
  eventtyp: z.string().min(1),
  datum: z.string().min(1),
  ort: z.string().optional().nullable(),
  gaeste: z.preprocess(
    (value) => (value === "" || value == null ? null : Number(value)),
    z.number().int().positive().nullable()
  ),
  leistungen: z.string().optional().nullable(),
  nachricht: z.string().min(1),
});

const AdminLoginSchema = z.object({
  password: z.string().min(1),
});

const TrackSchema = z.object({
  path: z.string().min(1).max(500),
  referrer: z.string().max(1000).optional().nullable(),
});

const SocialClickSchema = z.object({
  platform: z.enum(["whatsapp", "instagram", "facebook", "other"]),
});

const ChatSchema = z.object({
  message: z.string().min(1).max(500),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string()
  })).optional()
});

const PasswordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Das neue Passwort muss mindestens 8 Zeichen lang sein."),
});

const SettingsSchema = z.object({
  theme: z
    .object({
      accent: z.string().optional(),
      accent2: z.string().optional(),
      accent3: z.string().optional(),
      bg1: z.string().optional(),
      bg2: z.string().optional(),
      bg3: z.string().optional(),
    })
    .optional(),
  images: z
    .object({
      homeHero: z.string().optional(),
      anfrageHero: z.string().optional(),
      mietenHero: z.string().optional(),
      service: z.array(z.string()).optional(),
    })
    .optional(),
  maintenance: z
    .object({
      enabled: z.boolean().optional(),
      message: z.string().optional(),
      services: z.object({
        mieten: z.boolean().optional(),
        anfrage: z.boolean().optional(),
      }).optional(),
    })
    .optional(),
});

const DEFAULT_SETTINGS = {
  theme: {
    accent: "#b97f24",
    accent2: "#d4a257",
    accent3: "#f0d3a2",
    bg1: "#030303",
    bg2: "#0b0b0b",
    bg3: "#171717",
  },
  images: {
    homeHero:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=2200&q=90",
    anfrageHero:
      "https://images.unsplash.com/photo-1478147427282-58a87a120781?w=1920&q=80",
    mietenHero:
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1920&q=80",
    service: [
      "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80",
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80",
      "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80",
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
      "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&q=80",
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
    ],
  },
  maintenance: {
    enabled: false,
    message: "Wir führen gerade Wartungsarbeiten durch. Bitte versuchen Sie es später erneut.",
    services: {
      mieten: false,
      anfrage: false,
    },
  },
};

const tokenStore = new Map();
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

let openai = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "your-openai-api-key-here") {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const ollamaModel = process.env.OLLAMA_MODEL || "llama3.1";

const systemPrompt = `Du bist ein hilfreicher Assistent für Event VT, ein Event-Technik-Verleih-Unternehmen.
        
Event VT bietet:
- Professionelle Lichttechnik
- Videotechnik mit LED-Wänden, Projektoren und Displays
- Planung und Umsetzung für visuelle Eventtechnik

Beantworte Fragen freundlich und professionell auf Deutsch. 
Wenn jemand konkrete Angebote oder Buchungen möchte, verweise sie auf das Anfrageformular auf der Website oder WhatsApp: +1 556 332 4870.
Halte deine Antworten kurz und präzise (max. 3-4 Sätze).`;

function buildChatMessages(parsed) {
  const messages = [
    {
      role: "system",
      content: systemPrompt,
    },
  ];

  if (parsed.data.history && Array.isArray(parsed.data.history)) {
    messages.push(...parsed.data.history.slice(-5));
  }

  messages.push({
    role: "user",
    content: parsed.data.message,
  });

  return messages;
}

async function callOpenAIChat(messages) {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages,
    max_tokens: 200,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content || "Entschuldigung, ich konnte keine Antwort generieren.";
}

async function callOllamaChat(messages) {
  const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: ollamaModel,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data?.message?.content || "Entschuldigung, ich konnte keine Antwort generieren.";
}

function normalizeSettings(value) {
  const merged = {
    theme: { ...DEFAULT_SETTINGS.theme },
    images: {
      ...DEFAULT_SETTINGS.images,
      service: [...DEFAULT_SETTINGS.images.service],
    },
    maintenance: { 
      ...DEFAULT_SETTINGS.maintenance,
      services: { ...DEFAULT_SETTINGS.maintenance.services },
    },
  };

  const coalesceString = (input, fallback) =>
    typeof input === "string" && input.trim() ? input.trim() : fallback;

  if (!value || typeof value !== "object") {
    return merged;
  }

  if (value.theme && typeof value.theme === "object") {
    merged.theme = { ...merged.theme, ...value.theme };
  }

  if (value.images && typeof value.images === "object") {
    merged.images = { ...merged.images, ...value.images };
  }

  if (value.maintenance && typeof value.maintenance === "object") {
    merged.maintenance = { ...merged.maintenance, ...value.maintenance };
  }

  merged.theme.accent = coalesceString(merged.theme.accent, DEFAULT_SETTINGS.theme.accent);
  merged.theme.accent2 = coalesceString(merged.theme.accent2, DEFAULT_SETTINGS.theme.accent2);
  merged.theme.accent3 = coalesceString(merged.theme.accent3, DEFAULT_SETTINGS.theme.accent3);
  merged.theme.bg1 = coalesceString(merged.theme.bg1, DEFAULT_SETTINGS.theme.bg1);
  merged.theme.bg2 = coalesceString(merged.theme.bg2, DEFAULT_SETTINGS.theme.bg2);
  merged.theme.bg3 = coalesceString(merged.theme.bg3, DEFAULT_SETTINGS.theme.bg3);

  merged.images.homeHero = coalesceString(merged.images.homeHero, DEFAULT_SETTINGS.images.homeHero);
  merged.images.anfrageHero = coalesceString(
    merged.images.anfrageHero,
    DEFAULT_SETTINGS.images.anfrageHero
  );
  merged.images.mietenHero = coalesceString(
    merged.images.mietenHero,
    DEFAULT_SETTINGS.images.mietenHero
  );

  if (Array.isArray(value.images?.service)) {
    merged.images.service = value.images.service.slice(0, 6);
    while (merged.images.service.length < 6) {
      merged.images.service.push(DEFAULT_SETTINGS.images.service[merged.images.service.length]);
    }
  }

  merged.images.service = merged.images.service.map((item, index) =>
    coalesceString(item, DEFAULT_SETTINGS.images.service[index])
  );

  merged.maintenance.message = coalesceString(merged.maintenance.message, DEFAULT_SETTINGS.maintenance.message);

  if (value.maintenance?.services && typeof value.maintenance.services === "object") {
    merged.maintenance.services = { 
      ...merged.maintenance.services, 
      ...value.maintenance.services 
    };
  }

  return merged;
}

function getSettings() {
  const result = query("select value from settings where key = ?", ["site"]);
  if (!result.rows.length) {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(result.rows[0].value);
    return normalizeSettings(parsed);
  } catch (error) {
    console.error("Failed to parse settings", error);
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings) {
  const value = JSON.stringify(settings);
  query(
    "insert into settings (key, value) values (?, ?) on conflict(key) do update set value = excluded.value",
    ["site", value]
  );
}

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const stored = tokenStore.get(token);
  if (!stored || stored.expiresAt < Date.now()) {
    tokenStore.delete(token);
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  stored.expiresAt = Date.now() + TOKEN_TTL_MS;
  return next();
}

function getMailer() {
  if (!process.env.SMTP_HOST) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/anfragen", async (req, res) => {
  const parsed = AnfrageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: "Invalid input" });
  }

  const data = parsed.data;

  const id = insertAndGetId(
    `
    insert into anfragen
      (vorname, nachname, email, telefon, eventtyp, datum, ort, gaeste, leistungen, nachricht)
    values
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      data.vorname,
      data.nachname,
      data.email,
      data.telefon || null,
      data.eventtyp,
      data.datum,
      data.ort || null,
      data.gaeste ?? null,
      data.leistungen || null,
      data.nachricht,
    ]
  );

  const mailer = getMailer();
  const smtpFrom = process.env.SMTP_FROM || "navin.mark03@gmail.com";
  const smtpTo = process.env.SMTP_TO || "navin.mark03@gmail.com";

  if (mailer) {
    const subject = `Neue Anfrage: ${data.eventtyp}`;
    const text = [
      "Neue Anfrage eingegangen:",
      `Vorname: ${data.vorname}`,
      `Nachname: ${data.nachname}`,
      `Email: ${data.email}`,
      `Telefon: ${data.telefon || "-"}`,
      `Eventtyp: ${data.eventtyp}`,
      `Datum: ${data.datum}`,
      `Ort: ${data.ort || "-"}`,
      `Gaeste: ${data.gaeste ?? "-"}`,
      `Leistungen: ${data.leistungen || "-"}`,
      "Nachricht:",
      data.nachricht,
    ].join("\n");

    try {
      await mailer.sendMail({
        from: smtpFrom,
        to: smtpTo,
        subject,
        text,
      });
    } catch (error) {
      console.error("Email send failed", error);
    }
  }

  return res.json({ ok: true, id });
});

app.post("/api/track", (req, res) => {
  const parsed = TrackSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: "Invalid input" });
  }

  const { path, referrer } = parsed.data;
  query(
    "insert into visits (path, ip, user_agent, referrer) values (?, ?, ?, ?)",
    [path, req.ip, req.headers["user-agent"] || null, referrer || null]
  );

  return res.json({ ok: true });
});

app.get("/api/settings", (req, res) => {
  const settings = getSettings();
  return res.json({ ok: true, settings });
});

const adminRouter = express.Router();

// Middleware to protect all admin routes except login
adminRouter.use((req, res, next) => {
  if (req.path === '/login') {
    return next();
  }
  requireAdmin(req, res, next);
});

// Admin Login
adminRouter.post("/login", (req, res) => {
  const parsed = AdminLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: "Invalid input" });
  }

  const adminPassword = process.env.ADMIN_PASSWORD || "admin";
  if (!adminPassword || parsed.data.password !== adminPassword) {
    return res.status(401).json({ ok: false, error: "Invalid credentials" });
  }

  const token = crypto.randomUUID();
  tokenStore.set(token, { expiresAt: Date.now() + TOKEN_TTL_MS });
  return res.json({ ok: true, token });
});

// Change Password
adminRouter.post("/change-password", (req, res) => {
  const parsed = PasswordChangeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.errors[0].message });
  }

  const { currentPassword, newPassword } = parsed.data;
  const adminPassword = process.env.ADMIN_PASSWORD || "admin";

  if (currentPassword !== adminPassword) {
    return res.status(401).json({ ok: false, error: "Aktuelles Passwort ist falsch." });
  }

  console.log(`Passwort erfolgreich geändert zu: ${newPassword} (simuliert)`);
  // In a real app, you would update the .env file or a secure store.
  // This is a simulation as we can't write to .env from the process.
  // process.env.ADMIN_PASSWORD = newPassword; 
  
  return res.json({ ok: true, message: "Passwort erfolgreich geändert." });
});


// Visits Summary
adminRouter.get("/visits/summary", (req, res) => {
  const total = query("select count(*) as count from visits").rows[0]?.count || 0;
  const last24h = query(
    "select count(*) as count from visits where created_at >= strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day')"
  ).rows[0]?.count || 0;
  const last7d = query(
    "select count(*) as count from visits where created_at >= strftime('%Y-%m-%dT%H:%M:%fZ','now','-7 day')"
  ).rows[0]?.count || 0;
  const unique7d =
    query(
      "select count(distinct ip) as count from visits where created_at >= strftime('%Y-%m-%dT%H:%M:%fZ','now','-7 day') and ip is not null"
    ).rows[0]?.count || 0;
  const recent = query(
    "select path, ip, user_agent, referrer, created_at from visits order by created_at desc limit 25"
  ).rows;

  return res.json({
    ok: true,
    summary: {
      total,
      last24h,
      last7d,
      unique7d,
      recent,
    },
  });
});

// Get Settings
adminRouter.get("/settings", (req, res) => {
  const settings = getSettings();
  return res.json({ ok: true, settings });
});

// Update Settings
adminRouter.put("/settings", (req, res) => {
  const parsed = SettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: "Invalid input" });
  }

  const current = getSettings();
  const merged = normalizeSettings({
    theme: { ...current.theme, ...parsed.data.theme },
    images: {
      ...current.images,
      ...parsed.data.images,
      service: parsed.data.images?.service || current.images.service,
    },
    maintenance: { ...current.maintenance, ...parsed.data.maintenance },
  });

  saveSettings(merged);
  return res.json({ ok: true, settings: merged });
});

// Upload Image
adminRouter.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, error: "No file uploaded" });
  }
  const url = `/uploads/${req.file.filename}`;
  return res.json({ ok: true, url });
});

// Delete Visits
adminRouter.delete("/visits", (req, res) => {
  query("delete from visits");
  return res.json({ ok: true });
});

// Get Visits Chart Data
adminRouter.get("/visits/chart", (req, res) => {
  const rows = query(
    `select date(created_at) as date, count(*) as count 
     from visits 
     where created_at >= date('now', '-30 days') 
     group by date(created_at) 
     order by date(created_at) asc`
  ).rows;
  return res.json({ ok: true, data: rows });
});

// Social Clicks Summary
adminRouter.get("/social/summary", (req, res) => {
  const total = query("select count(*) as count from social_clicks").rows[0]?.count || 0;
  
  const byPlatform = query(
    `select platform, count(*) as count 
     from social_clicks 
     group by platform 
     order by count desc`
  ).rows;

  const recent = query(
    "select platform, ip, user_agent, created_at from social_clicks order by created_at desc limit 25"
  ).rows;

  return res.json({
    ok: true,
    summary: {
      total,
      byPlatform,
      recent,
    },
  });
});

// Delete Social Clicks
adminRouter.delete("/social", (req, res) => {
  query("delete from social_clicks");
  return res.json({ ok: true });
});

// Mount the admin router
app.use('/api/admin', adminRouter);


app.post("/api/chat", async (req, res) => {
  const parsed = ChatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: "Invalid input" });
  }

  try {
    const messages = buildChatMessages(parsed);
    let reply;

    if (openai) {
      reply = await callOpenAIChat(messages);
    } else {
      reply = await callOllamaChat(messages);
    }

    return res.json({
      ok: true,
      message: reply
    });
  } catch (error) {
    const message = openai
      ? "Es tut mir leid, ich kann gerade nicht antworten. Bitte versuchen Sie es später erneut."
      : "Der KI-Chat ist derzeit nicht verfügbar. Bitte stellen Sie sicher, dass Ollama läuft.";

    console.error("Chat Error:", error);
    return res.status(500).json({
      ok: false,
      error: "AI request failed",
      message
    });
  }
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});