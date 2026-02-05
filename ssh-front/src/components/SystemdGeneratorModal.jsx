import { useState, useEffect } from "react";
import { X, ChevronDown, ChevronUp, Play, Loader2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

// Extract folder name from path
function getFolderName(path) {
  if (!path) return "app";
  const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "app";
}

// Generate systemd service file content
function generateServiceFile(config) {
  const lines = [
    "[Unit]",
    `Description=${config.description || config.serviceName}`,
    "After=network-online.target",
    "Wants=network-online.target",
    "",
    "[Service]",
    `Type=${config.type || "simple"}`,
  ];

  if (config.user) {
    lines.push(`User=${config.user}`);
    lines.push(`Group=${config.user}`);
  }

  if (config.workingDirectory) {
    lines.push(`WorkingDirectory=${config.workingDirectory}`);
  }

  // Environment - just NODE_ENV by default, dotenv handles the rest
  if (config.appType === "nodejs") {
    lines.push("Environment=NODE_ENV=production");
  }

  if (config.execStart) {
    lines.push(`ExecStart=${config.execStart}`);
  }

  lines.push(`Restart=${config.restart || "on-failure"}`);
  lines.push("RestartSec=3");

  // Useful for network apps (many connections)
  lines.push("LimitNOFILE=65535");

  // Graceful shutdown
  lines.push("KillSignal=SIGINT");
  lines.push("TimeoutStopSec=15");

  // Basic security hardening
  lines.push("NoNewPrivileges=true");

  lines.push("");
  lines.push("[Install]");
  lines.push("WantedBy=multi-user.target");
  lines.push("");

  return lines.join("\n");
}

// Parse npm start script to extract command
function parseStartScript(script, workDir) {
  if (!script) return null;

  const trimmed = script.trim();

  if (trimmed.startsWith("node ")) {
    const args = trimmed.slice(5).trim();
    return `/usr/bin/node ${args}`;
  }

  if (trimmed.startsWith("nodemon ")) {
    const args = trimmed.slice(8).trim();
    return `/usr/bin/node ${args}`;
  }

  if (trimmed.startsWith("ts-node ")) {
    return null;
  }

  if (trimmed.startsWith("python ") || trimmed.startsWith("python3 ")) {
    return trimmed.replace(/^python3?\s/, "/usr/bin/python3 ");
  }

  return `/usr/bin/env ${trimmed}`;
}

export default function SystemdGeneratorModal({
  open,
  folderPath,
  onClose,
  onReadFile,
  onWriteFile,
  onRunCommand,
  currentUser,
}) {
  const [loading, setLoading] = useState(true);
  const [appType, setAppType] = useState("unknown");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installStep, setInstallStep] = useState("");

  // Config state
  const [serviceName, setServiceName] = useState("");
  const [description, setDescription] = useState("");
  const [execStart, setExecStart] = useState("");
  const [user, setUser] = useState("");
  const [restart, setRestart] = useState("on-failure");

  // Detect app type on open
  useEffect(() => {
    if (!open || !folderPath) return;

    const detect = async () => {
      setLoading(true);
      setAppType("unknown");

      const folderName = getFolderName(folderPath);
      let detectedType = "unknown";
      let startCommand = null;

      // Try to read package.json (Node.js app)
      try {
        const pkgResult = await onReadFile(`${folderPath}/package.json`);
        if (pkgResult?.content) {
          const pkg = JSON.parse(pkgResult.content);
          detectedType = "nodejs";

          // Try to get start script
          if (pkg.scripts?.start) {
            startCommand = parseStartScript(pkg.scripts.start, folderPath);
          } else if (pkg.main) {
            startCommand = `/usr/bin/node ${pkg.main}`;
          } else {
            startCommand = "/usr/bin/node index.js";
          }

          // Use package name if available
          if (pkg.name) {
            setServiceName(pkg.name.replace(/[^a-zA-Z0-9-_]/g, "-"));
            setDescription(pkg.description || `${pkg.name} (Node.js)`);
          } else {
            setServiceName(folderName);
            setDescription(`${folderName} (Node.js)`);
          }
        }
      } catch {
        // Not a Node.js app
      }

      // Try Python
      if (detectedType === "unknown") {
        try {
          await onReadFile(`${folderPath}/requirements.txt`);
          detectedType = "python";
          try {
            await onReadFile(`${folderPath}/main.py`);
            startCommand = "/usr/bin/python3 main.py";
          } catch {
            try {
              await onReadFile(`${folderPath}/app.py`);
              startCommand = "/usr/bin/python3 app.py";
            } catch {
              startCommand = "/usr/bin/python3 main.py";
            }
          }
          setServiceName(folderName);
          setDescription(`${folderName} (Python)`);
        } catch {
          // Not Python
        }
      }

      // Fallback
      if (detectedType === "unknown") {
        setServiceName(folderName);
        setDescription(folderName);
        startCommand = "";
      }

      setAppType(detectedType);
      setExecStart(startCommand || "");
      setUser(currentUser || "");
      setLoading(false);
    };

    detect();
  }, [open, folderPath, onReadFile, currentUser]);

  const handleInstall = async () => {
    if (!serviceName.trim() || !execStart.trim()) {
      toast.error("Service name and start command are required");
      return;
    }

    const config = {
      serviceName: serviceName.trim(),
      description: description.trim() || serviceName.trim(),
      workingDirectory: folderPath,
      execStart: execStart.trim(),
      user: user.trim() || undefined,
      restart,
      appType,
    };

    const serviceContent = generateServiceFile(config);
    const servicePath = `/etc/systemd/system/${config.serviceName}.service`;

    setInstalling(true);

    try {
      // Step 1: Write service file
      setInstallStep("Writing service file...");
      await onWriteFile(servicePath, serviceContent);

      // Step 2: Reload systemd
      setInstallStep("Reloading systemd...");
      await onRunCommand("sudo systemctl daemon-reload");

      // Step 3: Enable service
      setInstallStep("Enabling service...");
      await onRunCommand(`sudo systemctl enable ${config.serviceName}`);

      // Step 4: Start service
      setInstallStep("Starting service...");
      await onRunCommand(`sudo systemctl start ${config.serviceName}`);

      toast.success(`Service "${config.serviceName}" installed and started!`);
      onClose();
    } catch (err) {
      toast.error(err?.message || "Installation failed");
    } finally {
      setInstalling(false);
      setInstallStep("");
    }
  };

  // Preview content
  const previewConfig = {
    serviceName: serviceName.trim() || "app",
    description: description.trim() || serviceName.trim() || "app",
    workingDirectory: folderPath,
    execStart: execStart.trim() || "/usr/bin/node index.js",
    user: user.trim() || undefined,
    restart,
    appType,
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close modal"
      />

      <div className="absolute inset-0 flex items-start justify-center p-4 md:p-8 overflow-auto">
        <div className="w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col my-4">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 bg-slate-800/60">
            <div className="text-sm font-semibold text-slate-200">
              Create Systemd Service
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={installing}
              className="p-2 hover:bg-slate-700 rounded-md transition-colors text-slate-400 hover:text-slate-200 disabled:opacity-50"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-3 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Detecting application type...</span>
              </div>
            ) : (
              <>
                {/* Detection result */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700">
                  {appType === "nodejs" ? (
                    <span className="text-emerald-400 text-sm">Node.js app detected (dotenv will load .env at runtime)</span>
                  ) : appType === "python" ? (
                    <span className="text-blue-400 text-sm">Python app detected</span>
                  ) : (
                    <span className="text-amber-400 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Could not auto-detect - please fill in start command
                    </span>
                  )}
                </div>

                {/* Basic fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                      Service Name
                    </label>
                    <input
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-200"
                      placeholder="my-app"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                      Start Command
                    </label>
                    <input
                      value={execStart}
                      onChange={(e) => setExecStart(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-200 font-mono"
                      placeholder="/usr/bin/node index.js"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Working directory: {folderPath}
                    </p>
                  </div>
                </div>

                {/* Advanced section */}
                <div className="border border-slate-700 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/40 hover:bg-slate-800/60 transition-colors text-sm text-slate-300"
                  >
                    <span>Advanced Options</span>
                    {showAdvanced ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {showAdvanced && (
                    <div className="p-4 space-y-4 border-t border-slate-700">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1.5">
                          Description
                        </label>
                        <input
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-200"
                          placeholder="My application"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1.5">
                          Run as User
                        </label>
                        <input
                          value={user}
                          onChange={(e) => setUser(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-200"
                          placeholder={currentUser || "ubuntu"}
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1.5">
                          Restart Policy
                        </label>
                        <select
                          value={restart}
                          onChange={(e) => setRestart(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-200"
                        >
                          <option value="on-failure">on-failure (restart on crash)</option>
                          <option value="always">always (always restart)</option>
                          <option value="no">no (never restart)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview */}
                <div>
                  <div className="text-xs text-slate-400 mb-2">Preview</div>
                  <pre className="bg-slate-950 border border-slate-700 rounded-lg p-4 text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre">
                    {generateServiceFile(previewConfig)}
                  </pre>
                  <p className="text-xs text-slate-500 mt-2">
                    Will be saved to: /etc/systemd/system/{previewConfig.serviceName}.service
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-700 bg-slate-800/30">
            <div className="text-xs text-slate-500">
              {installing && installStep && (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {installStep}
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={installing}
                className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-200 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInstall}
                disabled={loading || installing || !serviceName.trim() || !execStart.trim()}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold flex items-center gap-2"
              >
                {installing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Installing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Install & Start
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
