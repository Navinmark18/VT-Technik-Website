import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import { z } from "zod";
import { insertAndGetId } from "./db.js";

const app = express();
const port = Number(process.env.PORT || 4000);

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : "*";

app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "200kb" }));
app.set("trust proxy", 1);
app.use(
  rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 100,
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
  if (mailer && process.env.SMTP_FROM && process.env.SMTP_TO) {
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
        from: process.env.SMTP_FROM,
        to: process.env.SMTP_TO,
        subject,
        text,
      });
    } catch (error) {
      console.error("Email send failed", error);
    }
  }

  return res.json({ ok: true, id });
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});



//npm install
//npm run dev