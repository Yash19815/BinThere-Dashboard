/**
 * @fileoverview Project Setup Script (setup.cjs)
 *
 * Automates the initial project configuration:
 * 1. Installs dependencies in all workspaces (root, server, client)
 * 2. Creates .env and config.h files from templates across all folders
 * 3. Generates a secure JWT_SECRET and shared DEVICE_API_KEY
 * 4. Verifies database state
 * 5. Sets up the Python virtual environment and dependencies if python is available
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const crypto = require("crypto");

const rootPath = path.resolve(__dirname, "..");

function log(msg) {
  console.log(`\x1b[36m[setup]\x1b[0m ${msg}`);
}

function error(msg) {
  console.error(`\x1b[31m[error]\x1b[0m ${msg}`);
}

function run(cmd, cwd = rootPath) {
  log(`Running: ${cmd} in ${path.relative(rootPath, cwd) || "."}`);
  try {
    execSync(cmd, { cwd, stdio: "inherit" });
  } catch (err) {
    error(`Command failed: ${cmd}`);
    process.exit(1);
  }
}

async function setup() {
  console.log(`
  \x1b[32m╔═══════════════════════════════════════╗
  ║    BinThere Project Configuration     ║
  ╚═══════════════════════════════════════╝\x1b[0m
  `);

  // 1. Install dependencies
  log("Installing root dependencies...");
  run("npm install");

  log("Installing server dependencies...");
  run("npm install", path.join(rootPath, "server"));

  log("Installing client dependencies...");
  run("npm install", path.join(rootPath, "client"));

  // 2. Resolve or generate shared API Key
  let sharedApiKey = null;
  const serverEnvPath = path.join(rootPath, "server", ".env");
  if (fs.existsSync(serverEnvPath)) {
    const serverEnv = fs.readFileSync(serverEnvPath, "utf8");
    const match = serverEnv.match(/DEVICE_API_KEY=([^\r\n]+)/);
    if (match) {
      sharedApiKey = match[1].trim();
    }
  }

  // 3. Setup Environment Variables and Configurations
  const envConfigs = [
    {
      dir: "server",
      example: ".env.example",
      target: ".env",
      onInit: (content) => {
        const secret = crypto.randomBytes(48).toString("hex");
        log("Generating secure JWT_SECRET...");
        if (content.includes("JWT_SECRET=")) {
          content = content.replace(/JWT_SECRET=.*/, `JWT_SECRET=${secret}`);
        } else {
          content = content + `\nJWT_SECRET=${secret}\n`;
        }

        if (!sharedApiKey) {
          sharedApiKey = crypto.randomBytes(32).toString("hex");
          log("Generating secure DEVICE_API_KEY...");
        }
        if (content.includes("DEVICE_API_KEY=")) {
          content = content.replace(/DEVICE_API_KEY=.*/, `DEVICE_API_KEY=${sharedApiKey}`);
        } else {
          content = content + `\nDEVICE_API_KEY=${sharedApiKey}\n`;
        }
        return content;
      },
    },
    {
      dir: "client",
      example: ".env.example",
      target: ".env",
    },
    {
      dir: "ESP32_Code",
      example: "config.h.example",
      target: "config.h",
      onInit: (content) => {
        if (sharedApiKey) {
          log("Injecting shared DEVICE_API_KEY into ESP32 config.h...");
          return content.replace(/"your-secure-device-api-key"/, `"${sharedApiKey}"`);
        }
        return content;
      },
    },
    {
      dir: "ota_check",
      example: "config.h.example",
      target: "config.h",
      onInit: (content) => {
        if (sharedApiKey) {
          log("Injecting shared DEVICE_API_KEY into ota_check config.h...");
          return content.replace(/"your-secure-device-api-key"/, `"${sharedApiKey}"`);
        }
        return content;
      },
    },
    {
      dir: "python_scripts",
      example: ".env.example",
      target: ".env",
      onInit: (content) => {
        if (sharedApiKey) {
          log("Injecting shared DEVICE_API_KEY into python_scripts/.env...");
          return content.replace(/your-secure-device-api-key/, sharedApiKey);
        }
        return content;
      },
    },
  ];

  for (const conf of envConfigs) {
    const dirPath = path.join(rootPath, conf.dir);
    const targetPath = path.join(dirPath, conf.target);
    const examplePath = path.join(dirPath, conf.example);

    if (!fs.existsSync(targetPath)) {
      if (fs.existsSync(examplePath)) {
        log(`Creating ${conf.dir}/${conf.target} from template...`);
        let content = fs.readFileSync(examplePath, "utf8");
        if (conf.onInit) {
          content = conf.onInit(content);
        }
        fs.writeFileSync(targetPath, content);
      } else {
        error(`Template missing: ${conf.dir}/${conf.example}`);
      }
    } else {
      log(`${conf.dir}/${conf.target} already exists. Skipping.`);
    }
  }

  // 4. Database Check
  const dbPath = path.join(rootPath, "server", "bins.db");
  if (!fs.existsSync(dbPath)) {
    log(
      'Database "bins.db" missing. It will be automatically initialized on first server start.',
    );
  } else {
    log('Database "bins.db" detected.');
  }

  // 5. Python Environment Setup
  const pythonScriptsDir = path.join(rootPath, "python_scripts");
  const requirementsPath = path.join(pythonScriptsDir, "requirements.txt");
  const venvPath = path.join(pythonScriptsDir, ".venv");

  if (fs.existsSync(requirementsPath)) {
    log("Checking Python environment...");
    let pythonCmd = null;
    try {
      execSync("python --version", { stdio: "ignore" });
      pythonCmd = "python";
    } catch (e) {
      try {
        execSync("python3 --version", { stdio: "ignore" });
        pythonCmd = "python3";
      } catch (e3) {
        log("Python not detected. Skipping Python virtual environment setup.");
      }
    }

    if (pythonCmd) {
      if (!fs.existsSync(venvPath)) {
        log("Creating Python virtual environment (.venv)...");
        try {
          execSync(`${pythonCmd} -m venv .venv`, { cwd: pythonScriptsDir, stdio: "inherit" });
        } catch (err) {
          error("Failed to create virtual environment. Skipping dependencies installation.");
          pythonCmd = null;
        }
      } else {
        log("Python virtual environment (.venv) already exists.");
      }

      if (pythonCmd) {
        log("Installing Python dependencies...");
        const isWindows = process.platform === "win32";
        const pythonBin = isWindows
          ? path.join(venvPath, "Scripts", "python.exe")
          : path.join(venvPath, "bin", "python");

        try {
          execSync(`"${pythonBin}" -m pip install -r requirements.txt`, { cwd: pythonScriptsDir, stdio: "inherit" });
          log("Python dependencies installed successfully.");
        } catch (err) {
          error("Failed to install Python dependencies. Please run manually.");
        }
      }
    }
  }

  console.log(`
  \x1b[32m✨ Setup Complete!\x1b[0m
  
  You can now start the project by running:
  \x1b[33m  npm run dev\x1b[0m
  
  Default Credentials:
  - Username: \x1b[1madmin\x1b[0m
  - Password: \x1b[1madmin123\x1b[0m
  
  \x1b[36mNote:\x1b[0m Dustbins are now managed dynamically from the dashboard.
  Once logged in, use the "➕ Add Dustbin" button to register your units.
  `);
}

setup().catch((err) => {
  error(err.message);
  process.exit(1);
});
