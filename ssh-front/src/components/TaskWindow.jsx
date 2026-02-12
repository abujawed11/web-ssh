import { useMemo, useState } from "react";
import clsx from "clsx";
import { Search, Play, Copy, TerminalSquare, Server, X, Package, Box } from "lucide-react";
import TargetHubModal from "./TargetHubModal";

function renderTemplate(template, vars) {
  const str = String(template || "");
  return str.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => {
    const val = vars?.[key];
    return val == null ? "" : String(val);
  });
}

function missingRequires(task, vars) {
  const req = Array.isArray(task.requires) ? task.requires : [];
  return req.filter((k) => !vars?.[k]);
}

function loadTargets(sessionId) {
  if (!sessionId) return {};
  try {
    const raw = localStorage.getItem(`webssh:target:${sessionId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveTargets(sessionId, next) {
  if (!sessionId) return;
  localStorage.setItem(`webssh:target:${sessionId}`, JSON.stringify(next || {}));
}

export default function TaskWindow({
  sessionId,
  group,
  connected,
  onSelectCommand,
  onRunCommand,
  services,
  servicesLoading,
  onFetchServices,
  dockerContainers,
  dockerContainersLoading,
  onFetchDockerContainers,
  dockerImages,
  dockerImagesLoading,
  onFetchDockerImages,
  nginxSites,
  nginxSitesLoading,
  onFetchNginxSites,
  nginxSitesAvailable,
  nginxSitesAvailableLoading,
  onFetchNginxSitesAvailable,
}) {
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);
  const [targetHubOpen, setTargetHubOpen] = useState(false);
  const [targets, setTargets] = useState(() => loadTargets(sessionId));

  const vars = useMemo(() => ({ ...(targets || {}) }), [targets]);

  const tasks = useMemo(() => {
    const list = group?.tasks || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((t) => {
      const hay = `${t.title} ${(t.tags || []).join(" ")} ${t.command}`.toLowerCase();
      return hay.includes(q);
    });
  }, [group, search]);

  const title = group?.title || "Tasks";
  const desc = group?.description || "Select a task group to see commands.";
  const requiredKeys = useMemo(() => {
    const set = new Set();
    for (const t of group?.tasks || []) {
      for (const k of t.requires || []) set.add(k);
    }
    return Array.from(set);
  }, [group]);

  const needsTargets = requiredKeys.length > 0;

  const setTargetKey = (key, value) => {
    const next = { ...targets, [key]: value };
    setTargets(next);
    saveTargets(sessionId, next);
  };

  const clearTargetKey = (key) => {
    const next = { ...targets };
    delete next[key];
    setTargets(next);
    saveTargets(sessionId, next);
  };

  const openTargets = () => {
    if (!connected) return;
    // ensure initial data for the first required key
    const first = requiredKeys[0];
    if (first === "service") onFetchServices?.();
    if (first === "container") onFetchDockerContainers?.();
    if (first === "image") onFetchDockerImages?.();
    if (first === "nginx_site") onFetchNginxSites?.();
    if (first === "nginx_site_available") onFetchNginxSitesAvailable?.();
    setTargetHubOpen(true);
  };

  const tabs = [];

  if (requiredKeys.includes("service")) {
    tabs.push({
      key: "service",
      label: "Services",
      loading: !!servicesLoading,
      items: services || [],
      onRefresh: onFetchServices,
      onEnsure: onFetchServices,
      keyFor: (it) => it.rawUnit || it.name,
      filterText: (it) => `${it.name} ${it.state} ${it.status} ${it.description}`,
      renderRow: (it) => (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm text-slate-200 font-semibold truncate">{it.name}</div>
            <div className="text-[11px] text-slate-500 truncate">{it.description || it.rawUnit}</div>
          </div>
          <div className="text-xs text-slate-500 shrink-0">{it.state}/{it.status}</div>
        </div>
      ),
      onSelect: (it) => setTargetKey("service", it.name),
    });
  }

  if (requiredKeys.includes("container")) {
    tabs.push({
      key: "container",
      label: "Containers",
      loading: !!dockerContainersLoading,
      items: dockerContainers || [],
      onRefresh: onFetchDockerContainers,
      onEnsure: onFetchDockerContainers,
      keyFor: (it) => it.id || it.name,
      filterText: (it) => `${it.name} ${it.image} ${it.status}`,
      renderRow: (it) => (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm text-slate-200 font-semibold truncate">{it.name}</div>
            <div className="text-[11px] text-slate-500 truncate">{it.image}</div>
          </div>
          <div className="text-xs text-slate-500 shrink-0">{it.state}</div>
        </div>
      ),
      onSelect: (it) => setTargetKey("container", it.name),
    });
  }

  if (requiredKeys.includes("image")) {
    tabs.push({
      key: "image",
      label: "Images",
      loading: !!dockerImagesLoading,
      items: dockerImages || [],
      onRefresh: onFetchDockerImages,
      onEnsure: onFetchDockerImages,
      keyFor: (it) => it.id || it.ref,
      filterText: (it) => `${it.ref} ${it.id} ${it.size}`,
      renderRow: (it) => (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm text-slate-200 font-semibold truncate">{it.ref}</div>
            <div className="text-[11px] text-slate-500 truncate">{it.id}</div>
          </div>
          <div className="text-xs text-slate-500 shrink-0">{it.size}</div>
        </div>
      ),
      onSelect: (it) => setTargetKey("image", it.ref),
    });
  }

  if (requiredKeys.includes("nginx_site")) {
    tabs.push({
      key: "nginx_site",
      label: "Nginx Sites",
      loading: !!nginxSitesLoading,
      items: nginxSites || [],
      onRefresh: onFetchNginxSites,
      onEnsure: onFetchNginxSites,
      keyFor: (it) => it.name,
      filterText: (it) => it.name,
      renderRow: (it) => (
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-slate-200 font-semibold truncate">{it.name}</div>
        </div>
      ),
      onSelect: (it) => setTargetKey("nginx_site", it.name),
    });
  }

  if (requiredKeys.includes("nginx_site_available")) {
    tabs.push({
      key: "nginx_site_available",
      label: "Nginx Sites (available)",
      loading: !!nginxSitesAvailableLoading,
      items: nginxSitesAvailable || [],
      onRefresh: onFetchNginxSitesAvailable,
      onEnsure: onFetchNginxSitesAvailable,
      keyFor: (it) => it.name,
      filterText: (it) => it.name,
      renderRow: (it) => (
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-slate-200 font-semibold truncate">{it.name}</div>
        </div>
      ),
      onSelect: (it) => setTargetKey("nginx_site_available", it.name),
    });
  }

  // Text input tabs for manual entry
  if (requiredKeys.includes("username")) {
    tabs.push({
      key: "username",
      label: "Username",
      isTextInput: true,
      placeholder: "Enter username (e.g., johndoe)",
      pattern: "^[a-z_][a-z0-9_-]{0,31}$",
      patternHint: "lowercase letters, numbers, underscore, hyphen (max 32 chars)",
      onSelect: (value) => setTargetKey("username", value),
    });
  }

  if (requiredKeys.includes("group")) {
    tabs.push({
      key: "group",
      label: "Group",
      isTextInput: true,
      placeholder: "Enter group name",
      pattern: "^[a-z_][a-z0-9_-]{0,31}$",
      patternHint: "lowercase letters, numbers, underscore, hyphen (max 32 chars)",
      items: [
        { name: "sudo", desc: "Administrators with sudo privileges" },
        { name: "docker", desc: "Docker users" },
        { name: "www-data", desc: "Web server group" },
        { name: "staff", desc: "Staff users" },
      ],
      onSelect: (value) => setTargetKey("group", value),
    });
  }

  if (requiredKeys.includes("shell")) {
    tabs.push({
      key: "shell",
      label: "Shell",
      isTextInput: true,
      placeholder: "/bin/bash",
      items: [
        { name: "/bin/bash", desc: "Bash shell (default)" },
        { name: "/bin/sh", desc: "Bourne shell" },
        { name: "/bin/zsh", desc: "Z shell" },
        { name: "/usr/bin/fish", desc: "Friendly interactive shell" },
        { name: "/bin/dash", desc: "Debian Almquist shell" },
        { name: "/bin/false", desc: "No shell (disable login)" },
        { name: "/usr/sbin/nologin", desc: "No login shell" },
      ],
      onSelect: (value) => setTargetKey("shell", value),
    });
  }

  if (requiredKeys.includes("home_dir")) {
    tabs.push({
      key: "home_dir",
      label: "Home Directory",
      isTextInput: true,
      placeholder: "/home/username",
      pattern: "^/.*",
      patternHint: "must be an absolute path starting with /",
      onSelect: (value) => setTargetKey("home_dir", value),
    });
  }

  if (requiredKeys.includes("port")) {
    tabs.push({
      key: "port",
      label: "Port",
      isTextInput: true,
      placeholder: "Enter port number (e.g., 8080)",
      pattern: "^[0-9]{1,5}$",
      patternHint: "1-65535",
      items: [
        { name: "80", desc: "HTTP" },
        { name: "443", desc: "HTTPS" },
        { name: "22", desc: "SSH" },
        { name: "3000", desc: "Node.js/React dev" },
        { name: "8080", desc: "Alternative HTTP" },
        { name: "5432", desc: "PostgreSQL" },
        { name: "3306", desc: "MySQL" },
        { name: "6379", desc: "Redis" },
        { name: "27017", desc: "MongoDB" },
      ],
      onSelect: (value) => setTargetKey("port", value),
    });
  }

  if (requiredKeys.includes("domain")) {
    tabs.push({
      key: "domain",
      label: "Domain",
      isTextInput: true,
      placeholder: "example.com",
      pattern: "^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$",
      patternHint: "valid domain name (e.g., example.com, sub.example.com)",
      onSelect: (value) => setTargetKey("domain", value),
    });
  }

  if (requiredKeys.includes("backend_port")) {
    tabs.push({
      key: "backend_port",
      label: "Backend Port",
      isTextInput: true,
      placeholder: "3000",
      pattern: "^[0-9]{1,5}$",
      patternHint: "1-65535",
      items: [
        { name: "3000", desc: "Node.js/Express default" },
        { name: "8000", desc: "Python/Django default" },
        { name: "5000", desc: "Flask default" },
        { name: "4000", desc: "GraphQL common" },
        { name: "8080", desc: "Alternative HTTP" },
      ],
      onSelect: (value) => setTargetKey("backend_port", value),
    });
  }

  if (requiredKeys.includes("root_path")) {
    tabs.push({
      key: "root_path",
      label: "Root Path",
      isTextInput: true,
      placeholder: "/var/www/html",
      pattern: "^/.*",
      patternHint: "must be an absolute path starting with /",
      items: [
        { name: "/var/www/html", desc: "Default web root" },
        { name: "/usr/share/nginx/html", desc: "Nginx default" },
        { name: "/var/www", desc: "Web directory" },
      ],
      onSelect: (value) => setTargetKey("root_path", value),
    });
  }

  if (requiredKeys.includes("service_name")) {
    tabs.push({
      key: "service_name",
      label: "Service Name",
      isTextInput: true,
      placeholder: "my-app",
      pattern: "^[a-z][a-z0-9-]*$",
      patternHint: "lowercase letters, numbers, and hyphens",
      onSelect: (value) => setTargetKey("service_name", value),
    });
  }

  if (requiredKeys.includes("exec_start")) {
    tabs.push({
      key: "exec_start",
      label: "Exec Start Command",
      isTextInput: true,
      placeholder: "/usr/bin/node /var/www/app/index.js",
      items: [
        { name: "/usr/bin/node /var/www/app/index.js", desc: "Node.js app" },
        { name: "/usr/bin/python3 /var/www/app/main.py", desc: "Python app" },
        { name: "/usr/bin/npm start", desc: "npm start" },
      ],
      onSelect: (value) => setTargetKey("exec_start", value),
    });
  }

  if (requiredKeys.includes("rule_number")) {
    tabs.push({
      key: "rule_number",
      label: "Rule Number",
      isTextInput: true,
      placeholder: "1",
      pattern: "^[0-9]+$",
      patternHint: "numeric value",
      onSelect: (value) => setTargetKey("rule_number", value),
    });
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden flex flex-col h-full min-h-0">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
              <TerminalSquare className="w-4 h-4 text-blue-400" />
              {title}
            </h3>
            <div className="text-xs text-slate-500 mt-1 truncate">{desc}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {needsTargets && !targetOpen && (
              <div className="hidden md:flex items-center gap-2">
                {requiredKeys.filter((k) => targets[k]).map((k) => (
                  <div key={k} className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-full px-3 py-1.5 max-w-[240px]">
                    <Server className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="text-xs text-slate-200 truncate" title={`${k}: ${targets[k]}`}>
                      {targets[k]}
                    </div>
                    <button
                      type="button"
                      onClick={() => clearTargetKey(k)}
                      className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-200"
                      title="Clear"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={openTargets}
                  disabled={!connected}
                  className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-200 text-sm flex items-center gap-2"
                  title={connected ? "Pick targets" : "Connect first"}
                >
                  <Package className="w-4 h-4 text-blue-400" />
                  Pick
                </button>
              </div>
            )}

            {needsTargets && (
              <button
                type="button"
                onClick={() => setTargetOpen((v) => !v)}
                disabled={!connected}
                className={clsx(
                  "p-2 rounded-lg border transition-colors",
                  targetOpen
                    ? "bg-slate-700/60 border-slate-500 text-slate-200"
                    : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800",
                  !connected && "opacity-50 cursor-not-allowed"
                )}
                title={targetOpen ? "Hide targets" : "Targets"}
              >
                <Box className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              className={clsx(
                "p-2 rounded-lg border transition-colors",
                searchOpen
                  ? "bg-slate-700/60 border-slate-500 text-slate-200"
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              )}
              title={searchOpen ? "Hide search" : "Search commands"}
            >
              <Search className="w-4 h-4" />
            </button>

            <div className="text-[10px] text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-700">
              {tasks.length} commands
            </div>
          </div>
        </div>

        {searchOpen && (
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-9 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-200 placeholder-slate-500"
              placeholder="Search commands in this group..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {needsTargets && targetOpen && (
          <div className="mt-3">
            <div className="flex items-center justify-between gap-3 bg-slate-900/30 border border-slate-700/60 rounded-xl p-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Targets</div>
              <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap justify-end">
                {requiredKeys.filter((k) => targets[k]).map((k) => (
                  <div key={k} className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-full px-3 py-1.5 max-w-[320px]">
                    <Server className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="text-sm text-slate-200 truncate" title={`${k}: ${targets[k]}`}>
                      {targets[k]}
                    </div>
                    <button
                      type="button"
                      onClick={() => clearTargetKey(k)}
                      className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-200"
                      title="Clear"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={openTargets}
                  disabled={!connected}
                  className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold"
                >
                  Pick targets
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-y-auto flex-1 min-h-0 p-2 space-y-1 scrollbar-thin">
        {!group ? (
          <div className="p-4 text-sm text-slate-400">Pick a group from the right to view commands.</div>
        ) : tasks.length === 0 ? (
          <div className="p-4 text-sm text-slate-400">No commands match your search.</div>
        ) : (
          tasks.map((t) => {
            const missing = missingRequires(t, vars);
            const disabled = !connected || missing.length > 0;
            const tooltip = !connected ? "Connect to run" : missing.length ? `Select ${missing[0]} first` : "";
            const rendered = renderTemplate(t.command, vars);

            return (
              <div
                key={t.id}
                className="p-3 rounded-lg border border-slate-700/60 bg-slate-900/30 hover:bg-slate-900/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-200 text-sm truncate">{t.title}</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-1 truncate" title={rendered}>
                      {rendered}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onSelectCommand(rendered)}
                      disabled={disabled}
                      className="p-2 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors text-slate-400 hover:text-slate-200"
                      title={disabled ? tooltip : "Load into editor"}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRunCommand?.(rendered)}
                      disabled={disabled}
                      className={clsx(
                        "px-3 py-2 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors",
                        !disabled
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                          : "bg-slate-700 text-slate-500 cursor-not-allowed"
                      )}
                      title={disabled ? tooltip : (t.longRunning ? "Run (stream)" : "Run now")}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      RUN
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <TargetHubModal
        open={targetHubOpen}
        onClose={() => setTargetHubOpen(false)}
        tabs={tabs}
        initialTabKey={tabs[0]?.key}
      />
    </div>
  );
}

