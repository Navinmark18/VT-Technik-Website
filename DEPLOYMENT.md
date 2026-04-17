git add .
git commit -m "Fix: Update für netcup"
git push origin main# Event VT - Deployment Guide

## 🎯 STEP 1: GitHub Repo erstellen (2 Min)
```bash
# Geh zu https://github.com/new und erstelle:
# - Repository name: event-vt
# - Public
# - KEINE .gitignore / license
```

Nach Erstellung → kopier den Command und führnull aus:
```bash
git remote add origin https://github.com/DEINUSERNAME/event-vt.git
git branch -M main
git push -u origin main
```

---

## 🚀 STEP 2: Railway Backend deployen (5 Min)

1. Geh zu https://railway.app → **Sign up with GitHub**
2. **New Project** → **GitHub Repo** → wähle `event-vt`
3. Railway erkennt `backend` folder automatisch
4. Klick **Deploy** 
5. Wart kurz (build dauert ~2 min)
6. Nach Deploy: Geh zu **Environment** tab
7. Setze diese Variablen:
   ```
   ADMIN_PASSWORD=1234!
   OPENAI_API_KEY=sk-dein-openai-key
   PORT=4000
   ```
8. **Copy die Railway URL** von Public Domain (z.B. `https://event-vt-production.up.railway.app`)

---

## 🌐 STEP 3: Vercel Frontend deployen (5 Min)

1. Geh zu https://vercel.com → **Sign up with GitHub**
2. **New Project** → GitHub → select `event-vt`
3. **Root Directory:** setze zu `Website VT`
4. **Framework Preset:** Vite
5. **Environment Variables** → Neu hinzufügen:
   ```
   VITE_API_URL=https://deine-railway-url.railway.app
   ```
   (Nutze die URL von STEP 2!)
6. **Deploy** → Warten
7. Get deine Vercel URL (z.B. `https://event-vt.vercel.app`)

---

## ✅ STEP 4: CORS konfigurieren (2 Min)

Geh back zu **Railway** → **Environment**:
```
CORS_ORIGIN=https://deine-vercel-url.vercel.app
```

---

## 🎉 FERTIG! 
- Frontend: `https://deine-vercel-url.vercel.app`
- Admin: `https://deine-vercel-url.vercel.app/admin.html` (PW: 1234!)
- AI Chat: funktioniert überall
- Social Tracking: funktioniert
- Handy: einfach QR-Code scannen oder URL eingeben ✅

---

## 🔧 Falls was nicht funktioniert:

**404 auf Admin?**
- Railway URL in Vercel VITE_API_URL checken

**Chat antwortet nicht?**
- OpenAI API Key in Railway checken (Settings → Environment)

**Handy: "Verbindung zurückgewiesen"?**
- Railway URL öffentlich? Check: `curl https://railway-url/api/settings`

