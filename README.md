# Rock–Paper–Scissors (gesture + two-player)

Gesture-based Rock–Paper–Scissors in the browser: webcam + 3‑2‑1 countdown, and two-player mode with another device.

## How to run the website

1. **Open a terminal** in this folder (`rock-paper-scissors`).

2. **Start the server** (required — the camera does not work when you open the HTML file directly):
   ```bash
   python3 -m http.server 8080
   ```
   If port 8080 is in use, try `8000` or `3000` instead.

3. **Open in your browser:**  
   **http://localhost:8080**  
   Use Chrome or Edge and allow camera access when asked.

4. Click **Start Camera**, then **Start round** for the countdown. In **Two player** mode, create a room and share the link or code.

## If the site doesn’t load

- Make sure the server is running (you should see “Serving HTTP on…” in the terminal).
- Use **http://localhost:8080** (or the port you chose), not `file:///...`.
- If you see “Address already in use”, use a different port, e.g. `python3 -m http.server 3000`, then open http://localhost:3000.

## Deploy to Vercel (recommended — HTTPS, shareable link, camera works)

1. **Push this project to GitHub** (if you haven’t already):
   ```bash
   git add .
   git commit -m "Add Vercel config"
   git push origin main
   ```

2. **Go to [vercel.com](https://vercel.com)** and sign in (GitHub is easiest).

3. **Import the repo:**  
   Click **Add New… → Project**, choose your **rock-paper-scissors** repo, then **Import**.

4. **Deploy:**  
   Leave all settings as-is (no build command; root is the output). Click **Deploy**.

5. **Use your live URL** (e.g. `https://rock-paper-scissors-xxx.vercel.app`).  
   It’s HTTPS, so the camera works and you can share the link for two-player. After creating a room, click **Copy link** and send that URL to your friend.

**Optional — deploy from the terminal:**
```bash
npx vercel
```
Follow the prompts and use the same repo or link the project in the Vercel dashboard.

---

## Two-player (optional)

Two-player mode uses Firebase Realtime Database. Set your config in `firebase-config.js` (see file comments). Create the Realtime Database in Firebase Console if you haven’t. Without Firebase, single-player and the countdown still work.
