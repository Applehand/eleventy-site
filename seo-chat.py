# pi_proxy.py
# Minimal Flask proxy for your Eleventy site to talk to your Mac's FastAPI.
# Uses your MacBook's LAN IP 192.168.0.198:8000 by default.
# Run: python3 pi_proxy.py  (listens on port 5077)

from flask import Flask, request, Response, jsonify
import requests
import os

# Change if your Mac's IP changes, or set env MAC_API=http://<ip>:<port>
MAC_API = os.getenv("MAC_API", "http://192.168.0.198:8000")

app = Flask(__name__)

@app.get("/api/healthz")
def healthz():
	try:
		r = requests.get(f"{MAC_API}/healthz", timeout=3)
		r.raise_for_status()
		return jsonify({"ok": True, "mac": r.json()})
	except Exception as e:
		return jsonify({"ok": False, "error": str(e)}), 503

@app.post("/api/chat_once")
def chat_once():
	data = request.get_json(force=True) or {}
	q = (data.get("question") or "").strip()
	if not q:
		return jsonify({"error": "missing question"}), 400
	try:
		r = requests.post(f"{MAC_API}/chat_once", json={"question": q}, timeout=600)
		return (r.content, r.status_code, {"Content-Type": r.headers.get("Content-Type", "application/json; charset=utf-8")})
	except requests.RequestException as e:
		return jsonify({"error": str(e)}), 502

@app.post("/api/chat")
def chat():
	data = request.get_json(force=True) or {}
	q = (data.get("question") or "").strip()
	if not q:
		return jsonify({"error": "missing question"}), 400
	try:
		up = requests.post(f"{MAC_API}/chat", json={"question": q}, stream=True, timeout=600)
		def generate():
			for chunk in up.iter_content(chunk_size=1024):
				if chunk:
					yield chunk
		return Response(generate(), status=up.status_code, content_type=up.headers.get("Content-Type", "text/plain; charset=utf-8"))
	except requests.RequestException as e:
		return jsonify({"error": str(e)}), 502

# quick manual test page
@app.get("/")
def index():
	return """<!doctype html>
<meta charset="utf-8">
<style>
body{font:16px system-ui, sans-serif; max-width:740px; margin:2rem auto; line-height:1.4}
textarea,input,button{font:inherit}
#out{white-space:pre-wrap; border:1px solid #ddd; padding:12px; border-radius:8px; min-height:120px}
</style>
<h1>Pi → Mac RAG proxy</h1>
<form id="f">
	<textarea id="q" rows="3" style="width:100%" placeholder="Ask...">What does my collection say about dense embeddings?</textarea>
	<p><button>Ask (stream)</button>
	<button type="button" id="once">Ask (non-stream)</button></p>
</form>
<div id="out"></div>
<script>
const out = document.getElementById('out');
const f = document.getElementById('f');
const onceBtn = document.getElementById('once');

f.addEventListener('submit', async (e) => {
	e.preventDefault();
	out.textContent = '';
	const q = document.getElementById('q').value;
	const res = await fetch('/api/chat', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({question:q})});
	if(!res.ok){ out.textContent = 'Error: ' + (await res.text()); return; }
	const reader = res.body.getReader(); const dec = new TextDecoder();
	for(;;){ const {value, done} = await reader.read(); if(done) break; out.textContent += dec.decode(value, {stream:true}); }
});

onceBtn.addEventListener('click', async () => {
	out.textContent = '';
	const q = document.getElementById('q').value;
	const res = await fetch('/api/chat_once', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({question:q})});
	out.textContent = await res.text();
});
</script>
"""

if __name__ == "__main__":
	app.run(host="0.0.0.0", port=5077, threaded=True)
