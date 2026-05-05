from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import cv2

app = Flask(__name__)
CORS(app)

@app.route("/upload", methods=["POST"])
def upload():
    file = request.files["image"]

    npimg = np.frombuffer(file.read(), np.uint8)
    img = cv2.imdecode(npimg, cv2.IMREAD_GRAYSCALE)

    colored = cv2.applyColorMap(img, cv2.COLORMAP_JET)

    _, buffer = cv2.imencode(".jpg", colored)

    return buffer.tobytes(), 200, {"Content-Type": "image/jpeg"}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)