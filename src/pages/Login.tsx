import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Flame } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Use username as fake email for Supabase auth
      await signIn(`${username.toLowerCase().trim()}@sportai.local`, password);
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20">
      <div className="w-full max-w-md glass-card rounded-2xl p-8 animate-slide-up">
        <div className="text-center mb-8">
          <Flame className="h-10 w-10 text-primary mx-auto mb-3" />
          <h1 className="font-display text-2xl font-bold text-foreground">{t("auth.login")}</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username" className="text-foreground">{t("auth.username")}</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required className="mt-1 bg-secondary border-border" />
          </div>
          <div>
            <Label htmlFor="password" className="text-foreground">{t("auth.password")}</Label>
            <div className="relative mt-1">
              <Input id="password" type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-secondary border-border pr-10" />
              <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground" aria-label="toggle password">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" variant="ember" className="w-full" disabled={loading}>
            {loading ? "..." : t("auth.login")}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          {t("auth.noAccount")}{" "}
          <Link to="/register" className="text-primary hover:underline">{t("auth.register")}</Link>
        </p>
      </div>
    </div>
  );
}
