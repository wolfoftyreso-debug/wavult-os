import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./Dashboard";
import LoginScreen from "./LoginScreen";
import OnboardingWizard from "./OnboardingWizard";
import { LanguageProvider } from "@pixdrift/i18n";

const API = "https://api.bc.pixdrift.com";

function Root() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("pixdrift_token");
    const savedUser = localStorage.getItem("pixdrift_user");

    if (savedToken && savedUser) {
      // Validera token mot API
      fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
        credentials: "include",
      })
        .then(res => {
          if (res.ok) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
          } else {
            // Token utgången — rensa
            localStorage.removeItem("pixdrift_token");
            localStorage.removeItem("pixdrift_user");
          }
          setLoading(false);
        })
        .catch(() => {
          // Offline eller API nere — visa appen ändå med sparad user
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  function handleLogin(newToken: string, newUser: any) {
    setToken(newToken);
    setUser(newUser);
  }

  function handleLogout() {
    localStorage.removeItem("pixdrift_token");
    localStorage.removeItem("pixdrift_user");
    setToken(null);
    setUser(null);
    // Rensa cookie + Supabase-session
    fetch(`${API}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
  }

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#F2F2F7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{ fontSize: 13, color: "#8E8E93" }}>Laddar pixdrift...</div>
      </div>
    );
  }

  if (!token) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const [showOnboarding, setShowOnboarding] = useState(
    !localStorage.getItem("pixdrift_onboarding_complete")
  );

  if (showOnboarding) {
    return (
      <LanguageProvider>
        <OnboardingWizard
          onComplete={() => {
            localStorage.setItem("pixdrift_onboarding_complete", "true");
            setShowOnboarding(false);
          }}
          onSkip={() => {
            // Don't mark complete on skip — remind next login
            setShowOnboarding(false);
          }}
        />
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
      <App user={user} onLogout={handleLogout} />
    </LanguageProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
