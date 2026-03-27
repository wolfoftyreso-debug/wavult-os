import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./Dashboard";
import LoginScreen from "./LoginScreen";
import OnboardingWizard from "./OnboardingWizard";
import { LanguageProvider } from "@pixdrift/i18n";

const API = "https://api.bc.pixdrift.com";

// ─── White-label Brand Engine ────────────────────────────────────────────────
async function applyBrand(orgId: string, token: string | null) {
  try {
    // Try API first
    if (token) {
      const res = await fetch(`${API}/api/brand/${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const brand = await res.json();
        injectBrand(brand);
        // Cache locally for offline/fast startup
        localStorage.setItem("pixdrift_brand_settings", JSON.stringify(brand));
        return;
      }
    }
  } catch (_) {
    // Fall through to localStorage
  }

  // Fallback: use cached brand from localStorage (set by admin panel)
  try {
    const cached = localStorage.getItem("pixdrift_brand_settings");
    if (cached) {
      injectBrand(JSON.parse(cached));
    }
  } catch (_) {}
}

function injectBrand(brand: Record<string, string | boolean>) {
  const root = document.documentElement;

  if (brand.primary_color) {
    root.style.setProperty("--brand-primary",   brand.primary_color as string);
    root.style.setProperty("--brand-secondary", brand.secondary_color as string);
    root.style.setProperty("--brand-accent",    brand.accent_color as string);
  }

  if (brand.logo_url) {
    localStorage.setItem("pixdrift_brand_logo", brand.logo_url as string);
    localStorage.setItem("pixdrift_brand_name", (brand.company_name as string) || "pixdrift");
  }

  if (brand.tagline) {
    localStorage.setItem("pixdrift_brand_tagline", brand.tagline as string);
  }

  if (brand.font_heading) {
    // Load Google Font dynamically
    const fontName = brand.font_heading as string;
    const id = `gf-heading-${fontName.replace(/\s+/g, "-")}`;
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, "+")}:wght@400;500;600;700&display=swap`;
      document.head.appendChild(link);
    }
    root.style.setProperty("--font-heading", `'${fontName}', system-ui, sans-serif`);
  }

  if (brand.font_body) {
    const fontName = brand.font_body as string;
    const id = `gf-body-${fontName.replace(/\s+/g, "-")}`;
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, "+")}:wght@400;500;600;700&display=swap`;
      document.head.appendChild(link);
    }
    root.style.setProperty("--font-body", `'${fontName}', system-ui, sans-serif`);
  }

  if (brand.dark_mode) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
}

function Root() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(
    !localStorage.getItem("pixdrift_onboarding_complete")
  );
  // Existing users with an org_id skip the wizard automatically
  const skipOnboardingForExistingUser = (u: any) => {
    if (u?.org_id || u?.user_metadata?.org_id) {
      localStorage.setItem("pixdrift_onboarding_complete", "true");
      setShowOnboarding(false);
    }
  };

  // Google Translate Widget
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.head.appendChild(script);

    (window as any).googleTranslateElementInit = function() {
      new (window as any).google.translate.TranslateElement(
        {
          pageLanguage: 'sv',
          includedLanguages: 'sv,en,de,no,da,fi,fr,nl,es,pl',
          layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        },
        'google_translate_element'
      );
    };

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem("pixdrift_token");
    const savedUser = localStorage.getItem("pixdrift_user");

    // Apply cached brand immediately on startup (before API validation)
    try {
      const cached = localStorage.getItem("pixdrift_brand_settings");
      if (cached) injectBrand(JSON.parse(cached));
    } catch (_) {}

    if (savedToken && savedUser) {
      // Validera token direkt mot Supabase (ingen backend-proxy)
      const SB_URL = import.meta.env.VITE_SUPABASE_URL || "";
      const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
      fetch(`${SB_URL}/auth/v1/user`, {
        headers: { "apikey": SB_KEY, "Authorization": `Bearer ${savedToken}` },
      })
        .then(res => {
          if (res.ok) {
            const parsedUser = JSON.parse(savedUser);
            setToken(savedToken);
            setUser(parsedUser);
            skipOnboardingForExistingUser(parsedUser);
            // Fetch & apply brand from API
            const orgId = parsedUser?.org_id || parsedUser?.user_metadata?.org_id || "default";
            applyBrand(orgId, savedToken);
          } else {
            localStorage.removeItem("pixdrift_token");
            localStorage.removeItem("pixdrift_user");
          }
          setLoading(false);
        })
        .catch(() => {
          // Offline — visa appen med sparad user
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
    skipOnboardingForExistingUser(newUser);
    // Apply brand after fresh login
    const orgId = newUser?.org_id || newUser?.user_metadata?.org_id || "default";
    applyBrand(orgId, newToken);
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
