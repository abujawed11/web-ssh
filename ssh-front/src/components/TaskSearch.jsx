import { useState, useMemo } from "react";

const TASKS = [
  {
    id: "check-os",
    title: "Detect OS",
    tags: ["system", "info"],
    command: `cat /etc/os-release || uname -a`,
  },
  {
    id: "node-install-ubuntu",
    title: "Install Node.js 20 (Ubuntu/Debian)",
    tags: ["node", "install"],
    command: `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get update && sudo apt-get install -y nodejs`,
  },
  {
    id: "node-version",
    title: "Check Node version",
    tags: ["node", "info"],
    command: `node -v && npm -v`,
  },
  {
    id: "nginx-install",
    title: "Install Nginx (Ubuntu/Debian)",
    tags: ["nginx", "install"],
    command: `sudo apt-get update && sudo apt-get install -y nginx`,
  },
  {
    id: "ports",
    title: "Show listening ports",
    tags: ["network", "info"],
    command: `sudo ss -tulpn || netstat -tulpn`,
  },
];

export default function TaskSearch({ onSelectCommand }) {
  const [search, setSearch] = useState("");

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return TASKS;
    return TASKS.filter((t) => {
      const hay = `${t.title} ${t.tags.join(" ")} ${t.command}`.toLowerCase();
      return hay.includes(q);
    });
  }, [search]);

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
      <h3>Task Search</h3>
      <input
        placeholder="Search e.g. node, nginx, ports..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <div style={{ maxHeight: 210, overflow: "auto", border: "1px solid #eee", borderRadius: 8 }}>
        {filteredTasks.map((t) => (
          <div
            key={t.id}
            style={{
              padding: 10,
              borderBottom: "1px solid #f1f1f1",
              cursor: "pointer",
            }}
            onClick={() => onSelectCommand(t.command)}
          >
            <div style={{ fontWeight: 600 }}>{t.title}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{t.tags.join(", ")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
