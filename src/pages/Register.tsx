import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Flame } from "lucide-react";
import { toast } from "sonner";

type UserType = "fan" | "athlete" | "tt_player";

export default function Register() {
  const { signUp } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = (searchParams.get("type") as UserType) || "fan";

  const [userType, setUserType] = useState<UserType>(initialType);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || password.length < 6) return;
    setLoading(true);
    try {
      const fakeEmail = `${username.toLowerCase().trim()}@sportai.local`;
      await signUp(fakeEmail, password, fullName.trim() || username.trim());

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from("profiles").update({
          user_type: userType,
          username: username.trim(),
        }).eq("user_id", session.user.id);

        if (userType === "athlete") {
          await supabase.from("athletes").insert({
            user_id: session.user.id,
            sport_type: "General",
          });
        } else if (userType === "tt_player") {
          await supabase.from("tt_players").insert({
            user_id: session.user.id,
            level: "beginner",
          });
        } else {
          await supabase.from("fans").insert({
            user_id: session.user.id,
          });
        }
      }

      toast.success(lang === "ru" ? "Регистрация успешна!" : "Ro'yxatdan o'tdingiz!");
      navigate(userType === "tt_player" ? "/tt-hub" : "/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-10">
      <div className="w-full max-w-md glass-card rounded-2xl p-8 animate-slide-up">
        <div className="text-center mb-6">
          <Flame className="h-10 w-10 text-primary mx-auto mb-3" />
          <h1 className="font-display text-2xl font-bold text-foreground">{t("auth.register")}</h1>
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1 mb-6">
          {(["fan", "athlete", "tt_player"] as UserType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setUserType(type)}
              className={`py-2 text-xs font-medium rounded-md transition-colors ${
                userType === type
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {type === "tt_player" ? t("auth.tt") : t(`auth.${type}`)}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="fullName" className="text-foreground">{lang === "ru" ? "Имя и фамилия" : lang === "en" ? "Full name" : "Ism va familiya"}</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="mt-1 bg-secondary border-border" />
          </div>
          <div>
            <Label htmlFor="username" className="text-foreground">{t("auth.username")}</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required className="mt-1 bg-secondary border-border" />
          </div>
          <div>
            <Label htmlFor="password" className="text-foreground">{t("auth.password")}</Label>
            <div className="relative mt-1">
              <Input id="password" type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="bg-secondary border-border pr-10" />
              <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground" aria-label="toggle password">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{lang === "ru" ? "Минимум 6 символов" : lang === "en" ? "At least 6 characters" : "Kamida 6 ta belgi"}</p>
          </div>
          <Button type="submit" variant="ember" className="w-full" disabled={loading}>
            {loading ? "..." : t("auth.register")}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          {t("auth.hasAccount")}{" "}
          <Link to="/login" className="text-primary hover:underline">{t("auth.login")}</Link>
        </p>
      </div>
    </div>
  );
}
