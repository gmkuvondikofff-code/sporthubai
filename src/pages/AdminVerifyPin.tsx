import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ShieldCheck, Loader2 } from "lucide-react";
import { verifyAdminPin } from "@/lib/admin-pin";
import { toast } from "@/hooks/use-toast";

export default function AdminVerifyPin() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const { emailVerified, setPinVerified, logoutAdmin } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!emailVerified) navigate("/admin/login", { replace: true });
  }, [emailVerified, navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6) return;
    setLoading(true);
    const ok = await verifyAdminPin(pin);
    setLoading(false);

    if (!ok) {
      const next = attempts + 1;
      setAttempts(next);
      setPin("");
      if (next >= 3) {
        logoutAdmin();
        toast({ title: "Locked out", description: "Too many invalid attempts.", variant: "destructive" });
        navigate("/admin/login", { replace: true });
        return;
      }
      toast({ title: "Invalid PIN", description: `${3 - next} attempt(s) remaining.`, variant: "destructive" });
      return;
    }

    setPinVerified(true);
    navigate("/admin-dashboard", { replace: true });
  };

  if (!emailVerified) return null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 bg-background">
      <div className="w-full max-w-md glass-card rounded-2xl p-8 animate-slide-up">
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 mb-3">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Security Verification</h1>
          <p className="text-sm text-muted-foreground mt-1">Step 2 of 2 — Enter your 6-digit PIN</p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={pin} onChange={setPin} pattern="^[0-9]+$">
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button type="submit" variant="ember" className="w-full" disabled={loading || pin.length !== 6}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
          </Button>
        </form>
      </div>
    </div>
  );
}
