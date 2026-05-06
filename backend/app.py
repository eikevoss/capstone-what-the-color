from flask import Flask, request, send_file
from flask_cors import CORS
import numpy as np
import cv2
import io

app = Flask(__name__)
CORS(app, origins="http://localhost:4200")
@app.route("/")
def home():
    return "Backend is running 🚀"
@app.route("/upload", methods=["POST"])
def upload():
    file = request.files["image"]

    npimg = np.frombuffer(file.read(), np.uint8)
    img = cv2.imdecode(npimg, cv2.IMREAD_GRAYSCALE)

    colored = cv2.applyColorMap(img, cv2.COLORMAP_JET)

    _, buffer = cv2.imencode(".jpg", colored)
    io_buf = io.BytesIO(buffer)

    return send_file(io_buf, mimetype="image/jpeg")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)