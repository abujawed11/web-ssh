export default function CommandExecutor({ selectedCmd, onCmdChange, onRun, onClear, connected, isRunning }) {
  return (
    <div style={{ marginTop: 14, border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
      <h3>Command</h3>
      <textarea
        rows={4}
        placeholder="Pick a task or write your own command..."
        value={selectedCmd}
        onChange={(e) => onCmdChange(e.target.value)}
        style={{ width: "100%", fontFamily: "monospace" }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={onRun} disabled={!connected || isRunning || !selectedCmd.trim()}>
          {isRunning ? "Running..." : "Execute"}
        </button>
        <button onClick={onClear}>Clear Output</button>
      </div>
    </div>
  );
}
