import { useState, useMemo } from "react";
import { Search, Command } from "lucide-react";

// Move TASKS here or import from a shared file
const TASKS = [
  {
    id: "check-os",
    title: "Detect OS",
    tags: ["system", "info"],
    command: `cat /etc/os-release || uname -a`,
  },
  {
    id: "node-install-ubuntu",
    title: "Install Node.js 20",
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
    title: "Install Nginx",
    tags: ["nginx", "install"],
    command: `sudo apt-get update && sudo apt-get install -y nginx`,
  },
  {
    id: "ports",
    title: "Show listening ports",
    tags: ["network", "info"],
    command: `sudo ss -tulpn || netstat -tulpn`,
  },
  {
    id: "docker-ps",
    title: "List Docker Containers",
    tags: ["docker", "info"],
    command: `docker ps -a`,
  },
  {
    id: "disk-usage",
    title: "Disk Usage",
    tags: ["system", "info"],
    command: `df -h`,
  },
];

export default function TaskPanel({ onSelectCommand }) {
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
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden flex flex-col h-full min-h-0">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50">
        <h3 className="font-semibold text-slate-200 flex items-center gap-2 mb-3">
          <Command className="w-4 h-4 text-purple-400" />
          Task Library
        </h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none text-slate-200 placeholder-slate-500"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-y-auto flex-1 min-h-0 p-2 space-y-1 scrollbar-thin">
        {filteredTasks.map((t) => (
          <div
            key={t.id}
            onClick={() => onSelectCommand(t.command)}
            className="p-3 rounded-lg hover:bg-slate-700/50 cursor-pointer group transition-colors border border-transparent hover:border-slate-600"
          >
            <div className="flex justify-between items-start mb-1">
              <div className="font-medium text-slate-200 text-sm">{t.title}</div>
              <Command className="w-3 h-3 text-slate-600 group-hover:text-purple-400 transition-colors" />
            </div>
            <div className="flex gap-1 flex-wrap">
              {t.tags.map(tag => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-700">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
