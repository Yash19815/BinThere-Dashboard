# Contributing to BinThere Dashboard

Thank you for your interest in contributing to **BinThere** — a real-time IoT smart bin monitoring dashboard! Contributions of all kinds are welcome: bug fixes, new features, documentation improvements, and hardware/firmware enhancements.

---

## 📁 Project Structure

```
BinThere-Dashboard/
├── client/          # React frontend (dashboard UI)
├── server/          # Node.js backend (REST API + WebSocket)
├── ESP32_Code/      # Arduino/ESP32 firmware
├── python_scripts/  # Python utilities and data scripts
├── serial_monitor/  # Serial communication monitor
├── ota_check/       # OTA update check scripts
└── scripts/         # Misc helper scripts
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ and npm
- **Python** 3.8+
- **Arduino IDE** or PlatformIO (for ESP32 firmware)
- Git

### Local Setup

1. **Fork** the repository and clone your fork:
   ```bash
   git clone https://github.com/<your-username>/BinThere-Dashboard.git
   cd BinThere-Dashboard
   ```

2. **Install dependencies:**
   ```bash
   npm install          # root dependencies
   cd client && npm install
   cd ../server && npm install
   ```

3. **Set up environment variables:**
   - Copy `.env.example` to `.env` in both `client/` and `server/` directories
   - Fill in your Firebase / MQTT / database credentials

4. **Run the development servers:**
   ```bash
   # From root
   npm run dev
   ```

---

## 🛠️ Ways to Contribute

### 🐛 Bug Reports
- Search [existing issues](https://github.com/Yash19815/BinThere-Dashboard/issues) before opening a new one.
- Include: OS, Node/Python version, steps to reproduce, expected vs. actual behavior, and screenshots/logs if possible.

### ✨ Feature Requests
- Open an issue with the label `enhancement`.
- Clearly describe the use case and why it benefits the project.

### 🔌 ESP32 Firmware
- Keep firmware code in `ESP32_Code/`.
- Test on actual hardware (ESP32 + HC-SR04 / IR sensors) before submitting.
- Follow the existing code style and comment sensor pin mappings clearly.

### 🖥️ Frontend (React)
- All UI code lives in `client/src/`.
- Use functional components and React hooks.
- Keep components small and reusable.
- Follow existing naming conventions (PascalCase for components, camelCase for variables).

### 🔧 Backend (Node.js)
- API routes go in `server/routes/`, controllers in `server/controllers/`.
- Validate all incoming data before processing.
- Avoid committing secrets — use environment variables.

### 🐍 Python Scripts
- Scripts in `python_scripts/` should be standalone and well-documented.
- Use `argparse` for CLI arguments where applicable.
- Prefer `requirements.txt` entries for any new dependencies.

---

## 🔀 Pull Request Process

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```

2. **Make your changes**, keeping commits small and descriptive:
   ```
   feat: add real-time fill level alerts
   fix: correct HC-SR04 distance calculation
   docs: update ESP32 wiring diagram
   ```

3. **Test your changes** thoroughly (frontend, backend, or firmware as applicable).

4. **Push and open a Pull Request** against the `main` branch:
   - Reference any related issue: `Closes #42`
   - Describe what changed and why
   - Add screenshots for UI changes

5. Wait for review. A maintainer will review and may request changes.

---

## ✅ Code Style Guidelines

| Area | Convention |
|------|-----------|
| JavaScript/React | ESLint + Prettier (run `npm run lint`) |
| Python | PEP 8 (use `black` or `flake8`) |
| C++ (ESP32) | Google C++ style, 2-space indent |
| Commits | [Conventional Commits](https://www.conventionalcommits.org/) |

---

## 🔐 Security

Do **not** commit API keys, Firebase credentials, Wi-Fi passwords, or any secrets. Use `.env` files (already in `.gitignore`). If you discover a security vulnerability, please email the maintainer privately instead of opening a public issue.

---

## 📜 License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE) that covers this project.

---

## 🙌 Thank You!

Every contribution, big or small, helps make BinThere better. Whether you're fixing a typo or adding a full new sensor integration — it's appreciated! 💚
```
