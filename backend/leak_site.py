import base64
from flask import Flask, request, render_template_string, jsonify, Response
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Stores an actual image in memory so the Aegis crawler can download & hash it
leaked_state = {
    "status": "LEAKED",
    "image_bytes": None,
    "content_type": "image/png"
}

# Generate a default 100x100 gradient test image in case you haven't uploaded one yet
from PIL import Image
import io

img = Image.new('RGB', (120, 120))
for x in range(120):
    for y in range(120):
        img.putpixel((x, y), (x * 2, y * 2, 150))
buf = io.BytesIO()
img.save(buf, format='PNG')
leaked_state["image_bytes"] = buf.getvalue()

HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Shadow Leaks Forum</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-950 text-white min-h-screen p-8 flex flex-col items-center justify-center">
    <div class="max-w-xl w-full">
        <div class="flex justify-between items-center mb-6">
            <div>
                <h1 class="text-3xl font-bold text-red-500">🏴‍☠️ Shadow Leaks Forum</h1>
                <p class="text-gray-400 text-sm">Anonymous uploads. Unindexed. Offshore hosting.</p>
            </div>
            <!-- Quick uploader to plant the same image you registered in Aegis -->
            <form action="/upload-leak" method="post" enctype="multipart/form-data" class="flex gap-2">
                <input type="file" name="file" accept="image/*" class="text-xs text-gray-400 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-red-900/40 file:text-red-300 cursor-pointer" required>
                <button type="submit" class="bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded text-xs font-bold">Post Leak</button>
            </form>
        </div>

        <div id="forumCard" class="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-2xl">
            <h2 class="text-lg font-semibold mb-4 text-gray-200">Thread #999 - Anonymous Drop</h2>
            {% if status == "LEAKED" %}
                <img src="/leaked_image.png" class="w-full max-h-80 object-contain rounded border border-gray-700 mb-4 bg-black">
                <p class="text-xs text-gray-500 font-mono">Posted by User_X99 | Direct Image Route: /leaked_image.png</p>
            {% elif status == "TAKEDOWN" %}
                <div class="p-8 border-2 border-dashed border-red-500 text-center bg-red-950/30 text-red-400 rounded-lg">
                    <h3 class="font-bold text-xl mb-2">⚠️ CONTENT REMOVED BY HOST</h3>
                    <p class="text-sm">This media was purged following an automated DMCA & NCII cryptographic match notice.</p>
                </div>
            {% endif %}
        </div>
    </div>
    <script>
        // Poll status every 2 seconds so takedown happens live without jarring full-page reloads
        setInterval(() => {
            fetch('/status').then(r => r.json()).then(d => {
                if (d.status === 'TAKEDOWN' && !document.body.innerHTML.includes('CONTENT REMOVED')) {
                    location.reload();
                }
            });
        }, 1500);
    </script>
</body>
</html>
"""


@app.route('/')
def home():
    return render_template_string(HTML, status=leaked_state["status"])


@app.route('/status')
def status():
    return jsonify({"status": leaked_state["status"]})


@app.route('/leaked_image.png')
def serve_leaked_image():
    if leaked_state["status"] != "LEAKED" or not leaked_state["image_bytes"]:
        return "Removed", 404
    return Response(leaked_state["image_bytes"], mimetype=leaked_state["content_type"])


@app.route('/upload-leak', methods=['POST'])
def upload_leak():
    file = request.files.get('file')
    if file:
        leaked_state["image_bytes"] = file.read()
        leaked_state["content_type"] = file.mimetype
        leaked_state["status"] = "LEAKED"
    return '<script>window.location.href="/";</script>'


@app.route('/takedown', methods=['POST'])
def takedown():
    leaked_state["status"] = "TAKEDOWN"
    leaked_state["image_bytes"] = None
    return jsonify({"status": "SUCCESS", "message": "Content purged from host."})


if __name__ == '__main__':
    app.run(port=5001, debug=True)