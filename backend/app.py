"""EmoTunes emotion service: webcam frame -> DeepFace emotion -> Deezer/iTunes tracks."""
import base64
import binascii
import random
import cv2
import numpy as np
import requests
from deepface import DeepFace
from flask import Flask, jsonify, request
from flask_cors import CORS

MATCH_MOOD = {
    "happy": ["happy upbeat pop", "feel good hits", "sunny day"],
    "sad": ["sad acoustic", "melancholy indie", "heartbreak ballads"],
    "angry": ["rock workout", "metal energy", "angry rap"],
    "fear": ["dark ambient", "cinematic suspense", "eerie instrumental"],
    "surprise": ["electronic dance", "party hits", "upbeat funk"],
    "disgust": ["grunge", "punk rock", "alternative rock"],
    "neutral": ["lofi chill", "focus instrumental", "indie chill"],
}
LIFT_MOOD = {
    "happy": ["happy upbeat pop", "dance party", "feel good hits"],
    "sad": ["feel good hits", "uplifting pop", "happy acoustic"],
    "angry": ["calm acoustic", "relaxing piano", "chill vibes"],
    "fear": ["calming music", "soft acoustic", "peaceful piano"],
    "surprise": ["feel good hits", "pop hits", "upbeat indie"],
    "disgust": ["feel good classics", "soul uplifting", "chill pop"],
    "neutral": ["upbeat pop", "good vibes", "feel good indie"],
}
app = Flask(__name__)
CORS(app, resources={r"/analyze": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}})
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024


def decode_image(data_url):
    if not isinstance(data_url, str) or not data_url.strip():
        raise ValueError("Image data is missing.")
    encoded = data_url.split(",", 1)[1] if "," in data_url else data_url
    try:
        raw = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("Image data is invalid.") from exc
    image = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode the webcam image.")
    return image


def search_deezer(query):
    response = requests.get("https://api.deezer.com/search", params={"q": query, "limit": 50}, timeout=10)
    response.raise_for_status()
    payload = response.json()
    if "error" in payload:
        raise RuntimeError(str(payload["error"]))
    return [{"id": str(t["id"]), "name": t["title"], "artists": t["artist"]["name"],
             "url": t.get("link"), "image": t.get("album", {}).get("cover_small"), "preview": t.get("preview")}
            for t in payload.get("data", [])]


def search_itunes(query):
    response = requests.get("https://itunes.apple.com/search", params={"term": query, "media": "music", "entity": "song", "limit": 50}, timeout=10)
    response.raise_for_status()
    return [{"id": str(t["trackId"]), "name": t["trackName"], "artists": t["artistName"],
             "url": t.get("trackViewUrl"), "image": t.get("artworkUrl60"), "preview": t.get("previewUrl")}
            for t in response.json().get("results", []) if t.get("trackId") and t.get("trackName")]


def find_tracks(query):
    errors = []
    for source, search_fn in (("Deezer", search_deezer), ("iTunes", search_itunes)):
        try:
            tracks = search_fn(query)
            if tracks:
                random.shuffle(tracks)
                return tracks[:15], source
            errors.append(f"{source}: no results")
        except Exception as exc:
            errors.append(f"{source}: {exc}")
    raise RuntimeError("; ".join(errors))


@app.get("/health")
def health():
    return jsonify(status="ok", service="EmoTunes emotion service")


@app.post("/analyze")
def analyze():
    body = request.get_json(silent=True) or {}
    try:
        frame = decode_image(body.get("image"))
    except ValueError as exc:
        return jsonify(error=str(exc)), 400
    mode = body.get("mode", "match")
    if mode not in ("match", "lift"):
        mode = "match"
    try:
        result = DeepFace.analyze(frame, actions=["emotion"], enforce_detection=True)
        if isinstance(result, list):
            result = result[0]
        emotion = result.get("dominant_emotion", "neutral")
    except ValueError:
        return jsonify(error="No face detected. Make sure your face is visible and try again."), 422
    except Exception:
        app.logger.exception("Emotion detection failed")
        return jsonify(error="Emotion detection failed. Please try again."), 500
    table = MATCH_MOOD if mode == "match" else LIFT_MOOD
    query = random.choice(table.get(emotion, table["neutral"]))
    try:
        tracks, source = find_tracks(query)
    except Exception:
        app.logger.exception("Music search failed for query %s", query)
        return jsonify(error=f"Music search failed for '{query}'. Check your internet connection and try again."), 502
    return jsonify(emotion=emotion, query=query, source=source, tracks=tracks)


if __name__ == "__main__":
    import os
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5001)),
        debug=False
    )