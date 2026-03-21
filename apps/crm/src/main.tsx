import React from "react";
import ReactDOM from "react-dom/client";

function App() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700 }}>Hypbit</h1>
        <p style={{ color: "#86868B" }}>Appen är under uppbyggnad.</p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
