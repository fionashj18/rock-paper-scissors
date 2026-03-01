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

## Two-player (optional)

Two-player mode uses Firebase Realtime Database. Set your config in `firebase-config.js` (see file comments). Create the Realtime Database in Firebase Console if you haven’t. Without Firebase, single-player and the countdown still work.
