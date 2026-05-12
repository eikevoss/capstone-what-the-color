from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import numpy as np
import cv2
import io
import torch
from huggingface_hub import PyTorchModelHubMixin
from ddcolor import DDColor, ColorizationPipeline

app = Flask(__name__)
CORS(app, origins="http://localhost:4200")

INPUT_SIZE = 512
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

class DDColorHF(DDColor, PyTorchModelHubMixin):
    def __init__(self, config=None, **kwargs):
        if isinstance(config, dict):
            kwargs = {**config, **kwargs}
        super().__init__(**kwargs)

print(f"⏳ Loading DDColor model on {device}...")
model = DDColorHF.from_pretrained("piddnad/ddcolor_modelscope").to(device).eval()
colorizer = ColorizationPipeline(model, input_size=INPUT_SIZE, device=device)
print("✅ DDColor model loaded!")


@app.route("/")
def home():
    return jsonify({
        "status": "running",
        "model": "DDColor (ddcolor_modelscope)",
        "device": str(device)
    })


@app.route("/upload", methods=["POST"])
def upload():
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    file = request.files["image"]
    npimg = np.frombuffer(file.read(), np.uint8)

    # Als BGR laden (wie cv2.imread)
    img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
    if img is None:
        return jsonify({"error": "Invalid image format"}), 400

    try:
        colored = colorizer.process(img)
    except Exception as e:
        return jsonify({"error": f"Colorization failed: {str(e)}"}), 500

    _, buffer = cv2.imencode(".jpg", colored)
    return send_file(io.BytesIO(buffer), mimetype="image/jpeg")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)