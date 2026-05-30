# BinThere - Master Brain (Python Edge AI)

This directory contains the Python scripts forming the "Master Brain" of the BinThere project. Typically deployed on an Edge device (like a Raspberry Pi Zero 2W or a local PC sandbox), this component acts as the intelligence layer, integrating OpenCV for image capture and AWS Bedrock for advanced waste classification.

## Capabilities

- **Computer Vision:** Captures image bursts using USB or Pi cameras when triggered by motion.
- **AI Classification:** Communicates with AWS Bedrock (Claude models) to classify waste types (e.g., Recyclable vs. Organic) with high accuracy.
- **Telemetry Routing:** Acts as a bridge, sending classification results and operational telemetry back to the Node.js Express backend via REST/MQTT.

## Setup & Requirements

> [!IMPORTANT]
> A Python Virtual Environment (`venv`) is strictly required to isolate dependencies and prevent system-wide conflicts.

1. **Create and Activate a Virtual Environment:**

   ```bash
   # Windows
   python -m venv .venv
   .\.venv\Scripts\activate

   # Linux/macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. **Install Dependencies:**

   First install core packages via requirements:
   ```bash
   pip install -r requirements.txt
   ```

   > [!IMPORTANT]
   > **Hardware & Driver Packages**: Depending on your host platform (e.g. Raspberry Pi Zero 2W vs. a dev PC), you must manually install platform packages:
   > - **Camera Support**: `pip install opencv-python` (required by `cv2` imports)
   > - **Serial communication**: `pip install pyserial` (required by `serial` imports)
   > - **GPIO Access (Raspberry Pi only)**: `pip install RPi.GPIO` (required by `RPi.GPIO` imports)

3. **Cloud Endpoint Configuration:**
   Create a `.env` file in this directory and populate:
   ```env
   CLOUD_API_URL=http://<server-ip>:8000/analyze
   ```
   If testing with external Cloud API, ensure valid credentials are configured on your host (e.g. via `aws configure` if your API delegates to AWS Bedrock).

## Scripts Overview

- `binthere_master.py`: The core edge pipeline running on the Raspberry Pi. Reads motion on BCM GPIO 17, commands ESP32 over UART, triggers OpenCV for camera burst, and pushes images to `CLOUD_API_URL` for waste classification.
- `local_server.py`: A local FastAPI mock server. Simulates classification endpoints. Note: For local testing with `binthere_master.py`, ensure data schemas match (e.g., parameter `moisture_data` vs `soil_moisture`, and returned JSON containing `classification`).
- `send_images.py`: A multithreaded testing utility to manually upload local images in the script directory to the ML classifier endpoint for calibration.
