import { useState } from "react";

export default function KIModal({ prompt, onSubmit }) {
  const [answers, setAnswers] = useState(new Array(prompt.prompts.length).fill(""));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(answers);
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000
    }}>
      <div style={{ background: "white", padding: 20, borderRadius: 10, minWidth: 300, color: "#333" }}>
        <h3>{prompt.name || "MFA / Verification"}</h3>
        <p style={{ fontSize: 13 }}>{prompt.instructions}</p>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
          {prompt.prompts.map((p, i) => (
            <div key={i}>
              <label style={{ display: "block", fontSize: 12 }}>{p.prompt}</label>
              <input 
                type={p.echo ? "text" : "password"} 
                autoFocus={i === 0}
                value={answers[i]} 
                onChange={e => {
                  const newAnswers = [...answers];
                  newAnswers[i] = e.target.value;
                  setAnswers(newAnswers);
                }} 
                style={{ width: "100%" }}
              />
            </div>
          ))}
          <button type="submit">Verify</button>
        </form>
      </div>
    </div>
  );
}
