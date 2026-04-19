import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

export default function AdminSettings() {
  const { logoutAdmin } = useAdminAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Admin session controls</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Two-step verification active. Session expires when this tab is closed.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              logoutAdmin();
              navigate("/admin/login", { replace: true });
            }}
          >
            <LogOut className="h-4 w-4 mr-2" /> End Admin Session
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
