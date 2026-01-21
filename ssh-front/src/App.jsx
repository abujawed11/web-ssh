import { useState } from "react";
import { Toaster } from "react-hot-toast";
import Login from "./components/Login";
import Header from "./components/Header";
import FileExplorer from "./components/FileExplorer";
import ConnectPanel from "./components/ConnectPanel";
import ConnectedCard from "./components/ConnectedCard";
import TaskPanel from "./components/TaskPanel";
import TaskWindow from "./components/TaskWindow";
import CommandPanel from "./components/CommandPanel";
import TerminalPanel from "./components/TerminalPanel";
import KIModal from "./components/KIModal";
import SessionModal from "./components/SessionModal";
import { useSSH } from "./hooks/useSSH";
import { findGroupById, getDefaultGroupId } from "./tasks/taskLibrary";

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const {
    wsStatus,
    connectionState, // The source of truth for connection info
    cwd,
    dirPath,
    dirEntries,
    dirLoading,
    running,
    output,
    kiPrompt,
    connectSSH,
    disconnectSSH,
    runCommand,
    clearOutput,
    listDir,
    setCwd,
    mkdir,
    createFile,
    renamePath,
    deletePath,
    copyPath,
    movePath,
    readFile,
    writeFile,
    answerKI
  } = useSSH();

  const [selectedCmd, setSelectedCmd] = useState("");
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState(getDefaultGroupId);

  const activeGroup = findGroupById(activeGroupId);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Login onLogin={setUser} />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-900 text-slate-200 font-sans selection:bg-blue-500/30 flex flex-col">
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid #334155'
          }
        }}
      />
      
      <Header 
        user={user} 
        onLogout={() => {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          window.location.reload();
        }}
        session={connectionState}
        cwd={cwd}
        onSessionClick={() => setSessionModalOpen(true)}
      />

      <main className="mx-auto w-full lg:w-[85vw] max-w-[1700px] p-4 md:p-6 flex-1 min-h-0 overflow-hidden flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
          {/* Left: File manager */}
          <div className="lg:col-span-3 min-h-0">
            <FileExplorer
              connected={!!connectionState}
              cwd={cwd}
              dirPath={dirPath}
              entries={dirEntries}
              loading={dirLoading}
              onSetCwd={setCwd}
              onRefresh={() => listDir(dirPath)}
              onMkdir={async (path) => {
                await mkdir(path);
              }}
              onCreateFile={async (path) => {
                await createFile(path);
              }}
              onRename={async (from, to) => {
                await renamePath(from, to);
              }}
              onDelete={async (path) => {
                await deletePath(path);
              }}
              onCopyPath={copyPath}
              onMovePath={movePath}
              onReadFile={readFile}
              onWriteFile={writeFile}
            />
          </div>

          {/* Center: Task + Command + Terminal */}
          <div className="lg:col-span-6 flex flex-col gap-6 min-h-0">
            <div className="h-[260px] min-h-0">
              <TaskWindow
                group={activeGroup}
                connected={!!connectionState}
                onSelectCommand={setSelectedCmd}
                onRunCommand={(cmd) => {
                  setSelectedCmd(cmd);
                  runCommand(cmd);
                }}
              />
            </div>

            <CommandPanel
              selectedCmd={selectedCmd}
              onCmdChange={setSelectedCmd}
              onRun={() => runCommand(selectedCmd)}
              onClear={clearOutput}
              isConnected={!!connectionState}
              isRunning={running}
              cwd={cwd}
            />

            <div className="flex-1 min-h-0">
              <TerminalPanel
                output={output}
                className="h-full"
                title={
                  connectionState
                    ? `${connectionState.username || "user"}@${connectionState.hostName || connectionState.host} — ${cwd || "/"}`
                    : "Not connected"
                }
              />
            </div>
          </div>

          {/* Right: Task Groups */}
          <div className="lg:col-span-3 min-h-0">
            <TaskPanel activeGroupId={activeGroupId} onSelectGroup={setActiveGroupId} />
          </div>
        </div>
      </main>

      {/* Modals */}
      {kiPrompt && <KIModal prompt={kiPrompt} onSubmit={answerKI} />}

      <SessionModal
        open={sessionModalOpen}
        onClose={() => setSessionModalOpen(false)}
        title={connectionState ? "Session information" : "New connection"}
      >
        {connectionState ? (
          <div className="h-[520px] min-h-0">
            <ConnectedCard connection={connectionState} onDisconnect={disconnectSSH} />
          </div>
        ) : (
          <div className="h-[520px] min-h-0">
            <ConnectPanel
              onConnect={(payload) => {
                setSessionModalOpen(false);
                connectSSH(payload);
              }}
              wsStatus={wsStatus}
            />
          </div>
        )}
      </SessionModal>
    </div>
  );
}
