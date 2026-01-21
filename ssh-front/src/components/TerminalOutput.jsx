import { useEffect, useRef } from "react";

export default function TerminalOutput({ output }) {
  const outputRef = useRef(null);

  useEffect(() => {
    // autoscroll
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div style={{ marginTop: 14, border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
      <h3>Terminal Output</h3>
      <pre
        ref={outputRef}
        style={{
          background: "#0b0f14",
          color: "#d7e2f0",
          padding: 12,
          borderRadius: 8,
          height: 320,
          overflow: "auto",
          fontSize: 13,
        }}
      >
        {output}
      </pre>
    </div>
  );
}
