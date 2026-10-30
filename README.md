# EmoTunes — full-stack emotion-based music player

Stack: React/Vite frontend, Node/Express + MongoDB authentication, and a Python/Flask + DeepFace emotion service. Music search tries Deezer first and iTunes as a fallback; no music API keys are required.

## Requirements
- Node.js 20+
- Python 3.10–3.12 recommended for DeepFace/TensorFlow compatibility
- MongoDB Atlas or local MongoDB

## 1. Start the Node authentication backend
Open a terminal in `backend`:

```bash
npm install
```

Copy `backend/.env.example` to `backend/.env` and set `MONGODB_URI`, a private `JWT_SECRET` (at least 32 characters), and `CLIENT_URL=http://localhost:5173`. Then run:

```bash
npm run dev
```

Node API runs at `http://localhost:5000`.

## 2. Start the Flask emotion service
Open a second terminal in the `backend` folder (where `app.py` is):

```bash
python -m venv .venv
```

Activate it on Windows PowerShell with `.venv\Scripts\Activate.ps1`, or macOS/Linux with `source .venv/bin/activate`. Then:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
python app.py
```

Flask runs at `http://localhost:5001`. DeepFace may download model files the first time. If TensorFlow installation fails with your Python version, use Python 3.10–3.12.

## 3. Start React
Open a third terminal at the project root:

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Optional root `.env` values are shown in `.env.example`; defaults already point to local services.

## Use
1. Sign up or log in. Successful authentication opens the music player.
2. Allow browser camera access.
3. Choose **Match my current mood** or **Lift my mood**.
4. Click **Detect emotion & find music**. Detected emotion and recommendations appear in the page. Available previews can be played; use Open to visit the music provider.
5. Click **Log out** to clear the local token.

## Endpoints
- Node: `GET /api/health`, `POST /api/auth/signup`, `POST /api/auth/login`
- Flask: `GET /health`, `POST /analyze` with `{ "image": "<data URL>", "mode": "match" | "lift" }`

Camera access normally requires localhost or HTTPS. The captured frame is sent to the Flask service and is not saved by this app. Keep `backend/.env` private; do not commit database credentials or JWT secrets.
