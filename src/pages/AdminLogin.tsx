import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Loader2 } from "lucide-react";
import { ADMIN_EMAIL } from "@/lib/admin-pin";
import { toast } from "@/hooks/use-toast";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { setEmailVerified, logoutAdmin } = useAdminAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    logoutAdmin();

    if (email.trim().toLowerCase() !== ADMIN_EMAIL) {
      toast({ title: "Access Denied", description: "Unauthorized credentials.", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Try sign in; if user doesn't exist yet, create then sign in
    let { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

    if (error && /invalid|not found/i.test(error.message)) {
      const { error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (!signUpErr) {
        const retry = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        error = retry.error;
      } else {
        error = signUpErr;
      }
    }

    if (error) {
      toast({ title: "Access Denied", description: "Invalid credentials.", variant: "destructive" });
      setLoading(false);
      return;
    }

    setEmailVerified(true);
    setLoading(false);
    navigate("/admin/verify-pin");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 bg-background">
      <div className="w-full max-w-md glass-card rounded-2xl p-8 animate-slide-up">
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 mb-3">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Admin Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Step 1 of 2 — Authorized personnel only</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-foreground">Email</Label>
            <Input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 bg-secondary border-border"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <Label className="text-foreground">Password</Label>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 bg-secondary border-border"
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" variant="ember" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
