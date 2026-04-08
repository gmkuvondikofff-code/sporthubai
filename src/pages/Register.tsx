import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame } from "lucide-react";
import { toast } from "sonner";
import { sportCategories } from "@/lib/sports-data";

type UserType = "fan" | "athlete";

export default function Register() {
  const { signUp } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = (searchParams.get("type") as UserType) || "fan";

  const [userType, setUserType] = useState<UserType>(initialType);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [sportType, setSportType] = useState("");
  const [favoriteTeam, setFavoriteTeam] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signUp(email, password, name);

      // Wait for session then create role-specific record
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Update profile with user type
        await supabase.from("profiles").update({ user_type: userType }).eq("user_id", session.user.id);

        if (userType === "athlete") {
          await supabase.from("athletes").insert({
            user_id: session.user.id,
            sport_type: sportType || "General",
          });
        } else {
          await supabase.from("fans").insert({
            user_id: session.user.id,
            favorite_sport: sportType || null,
            favorite_team: favoriteTeam || null,
          });
        }
      }

      toast.success(lang === "ru" ? "Регистрация успешна!" : "Ro'yxatdan o'tdingiz!");
      navigate("/dashboard");
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

        {/* Type toggle */}
        <div className="flex rounded-lg bg-secondary p-1 mb-6">
          {(["fan", "athlete"] as UserType[]).map((type) => (
            <button
              key={type}
              onClick={() => setUserType(type)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                userType === type
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(`auth.${type}`)}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-foreground">{t("auth.name")}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 bg-secondary border-border" />
          </div>
          <div>
            <Label htmlFor="email" className="text-foreground">{t("auth.email")}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 bg-secondary border-border" />
          </div>
          <div>
            <Label htmlFor="password" className="text-foreground">{t("auth.password")}</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1 bg-secondary border-border" />
          </div>
          <div>
            <Label htmlFor="sport" className="text-foreground">{t("auth.sport")}</Label>
            <select
              id="sport"
              value={sportType}
              onChange={(e) => setSportType(e.target.value)}
              className="mt-1 w-full rounded-md bg-secondary border border-border text-foreground px-3 py-2 text-sm"
            >
              <option value="">--</option>
              {sportCategories.map((s) => (
                <option key={s.id} value={s.name}>
                  {lang === "ru" ? s.nameRu : lang === "uz" ? s.nameUz : s.name}
                </option>
              ))}
            </select>
          </div>
          {userType === "fan" && (
            <div>
              <Label htmlFor="team" className="text-foreground">{t("auth.team")}</Label>
              <Input id="team" value={favoriteTeam} onChange={(e) => setFavoriteTeam(e.target.value)} className="mt-1 bg-secondary border-border" />
            </div>
          )}
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
