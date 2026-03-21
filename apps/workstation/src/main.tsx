import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./Dashboard";
import { LanguageProvider } from "@pixdrift/i18n";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
);
