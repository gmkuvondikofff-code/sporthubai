import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, MessageSquare, Trophy } from "lucide-react";

export default function AdminWorkouts() {
  const [stats, setStats] = useState({ messages: 0, sports: 0, fanSports: 0 });

  useEffect(() => {
    (async () => {
      const [msgs, ath, fs] = await Promise.all([
        supabase.from("chat_messages").select("id", { count: "exact", head: true }),
        supabase.from("athletes").select("id", { count: "exact", head: true }),
        supabase.from("fan_sports").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        messages: msgs.count || 0,
        sports: ath.count || 0,
        fanSports: fs.count || 0,
      });
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Workout Statistics</h1>
        <p className="text-sm text-muted-foreground">Platform-wide engagement metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">AI Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{stats.messages}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Athlete Sports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{stats.sports}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Fan-Added Sports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{stats.fanSports}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
