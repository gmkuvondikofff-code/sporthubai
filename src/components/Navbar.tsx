import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Flame, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import type { Language } from "@/lib/i18n";

const langLabels: Record<Language, string> = { uz: "UZ", ru: "RU", en: "EN" };

export default function Navbar() {
  const { user, signOut } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <Flame className="h-7 w-7 text-primary" />
          <span className="font-display text-xl font-bold text-foreground">
            Sport<span className="text-gradient-ember">AI</span> Hub
          </span>
        </Link>

        {/* Language switcher */}
        <div className="hidden md:flex items-center gap-1 mr-4">
          {(["uz", "ru", "en"] as Language[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {langLabels[l]}
            </button>
          ))}
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.home")}
          </Link>
          {user ? (
            <>
              <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("nav.dashboard")}
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1" />
                {t("nav.logout")}
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">{t("nav.login")}</Button>
              </Link>
              <Link to="/register">
                <Button variant="ember" size="sm">{t("nav.register")}</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden glass-card border-t border-border p-4 flex flex-col gap-3 animate-slide-up">
          <div className="flex gap-1 mb-2">
            {(["uz", "ru", "en"] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1 text-xs rounded font-medium ${
                  lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {langLabels[l]}
              </button>
            ))}
          </div>
          <Link to="/" onClick={() => setMobileOpen(false)} className="text-sm text-foreground">
            {t("nav.home")}
          </Link>
          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="text-sm text-foreground">
                {t("nav.dashboard")}
              </Link>
              <button onClick={handleLogout} className="text-sm text-foreground text-left">
                {t("nav.logout")}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMobileOpen(false)} className="text-sm text-foreground">
                {t("nav.login")}
              </Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="text-sm text-foreground">
                {t("nav.register")}
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
