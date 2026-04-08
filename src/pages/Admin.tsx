import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Flame, Shield, Users, Activity, Eye } from "lucide-react";

interface AdminAthlete {
  user_id: string;
  sport_type: string;
  stress_level: number | null;
  profiles: { display_name: string | null; username: string | null } | null;
}

interface AdminFan {
  user_id: string;
  favorite_sport: string | null;
  favorite_team: string | null;
  profiles: { display_name: string | null; username: string | null } | null;
}

interface StressHistory {
  score: number;
  created_at: string;
  notes: string | null;
}

export default function Admin() {
  const { lang } = useLanguage();
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [athletes, setAthletes] = useState<AdminAthlete[]>([]);
  const [fans, setFans] = useState<AdminFan[]>([]);
  const [fanSports, setFanSports] = useState<{ sport_name: string; user_id: string }[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null);
  const [stressHistory, setStressHistory] = useState<StressHistory[]>([]);
  const [tab, setTab] = useState<"athletes" | "fans">("athletes");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "Kuvondikofff" && password === "deli4321") {
      setAuthenticated(true);
    } else {
      alert(lang === "ru" ? "Неверные данные" : "Noto'g'ri ma'lumotlar");
    }
  };

  useEffect(() => {
    if (!authenticated) return;
    fetchData();
  }, [authenticated]);

  const fetchData = async () => {
    // We need service role for admin queries, but since RLS has public read for athletes...
    // Actually the admin needs to be logged in with admin role. For simplicity with hardcoded creds,
    // we'll use the public policies that already exist (athletes have public read).
    const { data: ath } = await supabase
      .from("athletes")
      .select("user_id, sport_type, stress_level");
    
    // Get profiles for each athlete
    if (ath) {
      const enriched: AdminAthlete[] = [];
      for (const a of ath) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name, username")
          .eq("user_id", a.user_id)
          .single();
        enriched.push({ ...a, profiles: prof });
      }
      setAthletes(enriched);
    }

    const { data: f } = await supabase.from("fans").select("user_id, favorite_sport, favorite_team");
    if (f) {
      const enrichedFans: AdminFan[] = [];
      for (const fan of f) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name, username")
          .eq("user_id", fan.user_id)
          .single();
        enrichedFans.push({ ...fan, profiles: prof });
      }
      setFans(enrichedFans);
    }

    const { data: fs } = await supabase.from("fan_sports").select("sport_name, user_id");
    if (fs) setFanSports(fs);
  };

  const viewStressHistory = async (userId: string) => {
    setSelectedAthlete(userId);
    const { data: athlete } = await supabase
      .from("athletes")
      .select("id")
      .eq("user_id", userId)
      .single();
    if (athlete) {
      const { data: scores } = await supabase
        .from("stress_scores")
        .select("score, created_at, notes")
        .eq("athlete_id", athlete.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (scores) setStressHistory(scores);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="w-full max-w-sm glass-card rounded-2xl p-8 animate-slide-up">
          <div className="text-center mb-6">
            <Shield className="h-10 w-10 text-primary mx-auto mb-3" />
            <h1 className="font-display text-2xl font-bold text-foreground">Admin Panel</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label className="text-foreground">Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1 bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-foreground">Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 bg-secondary border-border" />
            </div>
            <Button type="submit" variant="ember" className="w-full">
              {lang === "ru" ? "Войти" : "Kirish"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="font-display text-3xl font-bold text-foreground">Admin Dashboard</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={tab === "athletes" ? "ember" : "outline"}
            onClick={() => setTab("athletes")}
          >
            <Activity className="h-4 w-4 mr-2" />
            {lang === "ru" ? "Спортсмены" : "Sportchilar"} ({athletes.length})
          </Button>
          <Button
            variant={tab === "fans" ? "ember" : "outline"}
            onClick={() => setTab("fans")}
          >
            <Users className="h-4 w-4 mr-2" />
            {lang === "ru" ? "Фанаты" : "Muxlislar"} ({fans.length})
          </Button>
        </div>

        {tab === "athletes" && (
          <div className="glass-card rounded-xl overflow-hidden mb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{lang === "ru" ? "Имя" : "Ism"}</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>{lang === "ru" ? "Спорт" : "Sport"}</TableHead>
                  <TableHead>{lang === "ru" ? "Стресс" : "Stress"} %</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {athletes.map((a) => (
                  <TableRow key={a.user_id}>
                    <TableCell className="text-foreground">{a.profiles?.display_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{a.profiles?.username || "—"}</TableCell>
                    <TableCell className="text-foreground">{a.sport_type}</TableCell>
                    <TableCell>
                      <span className={`font-bold ${
                        (a.stress_level || 0) < 30 ? "text-green-500" :
                        (a.stress_level || 0) < 60 ? "text-yellow-500" : "text-destructive"
                      }`}>
                        {a.stress_level || 0}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => viewStressHistory(a.user_id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {athletes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {lang === "ru" ? "Нет спортсменов" : "Sportchilar yo'q"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {tab === "fans" && (
          <div className="glass-card rounded-xl overflow-hidden mb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{lang === "ru" ? "Имя" : "Ism"}</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>{lang === "ru" ? "Любимый спорт" : "Sevimli sport"}</TableHead>
                  <TableHead>{lang === "ru" ? "Команда" : "Jamoa"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fans.map((f) => (
                  <TableRow key={f.user_id}>
                    <TableCell className="text-foreground">{f.profiles?.display_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{f.profiles?.username || "—"}</TableCell>
                    <TableCell className="text-foreground">{f.favorite_sport || "—"}</TableCell>
                    <TableCell className="text-foreground">{f.favorite_team || "—"}</TableCell>
                  </TableRow>
                ))}
                {fans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {lang === "ru" ? "Нет фанатов" : "Muxlislar yo'q"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Fan Added Sports */}
        {tab === "fans" && fanSports.length > 0 && (
          <div className="glass-card rounded-xl p-6 mb-6">
            <h3 className="font-display font-semibold text-foreground mb-3">
              {lang === "ru" ? "Добавленные спорты" : "Qo'shilgan sportlar"}
            </h3>
            <div className="flex flex-wrap gap-2">
              {fanSports.map((fs, i) => (
                <span key={i} className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm">
                  {fs.sport_name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stress History Modal */}
        {selectedAthlete && (
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-foreground">
                {lang === "ru" ? "История стресса" : "Stress tarixi"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedAthlete(null)}>✕</Button>
            </div>
            {stressHistory.length === 0 ? (
              <p className="text-muted-foreground text-sm">{lang === "ru" ? "Нет данных" : "Ma'lumot yo'q"}</p>
            ) : (
              <div className="space-y-2">
                {stressHistory.map((s, i) => (
                  <div key={i} className="flex items-center justify-between bg-secondary rounded-lg px-4 py-2">
                    <span className="text-sm text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
                    <span className={`font-bold ${
                      s.score < 30 ? "text-green-500" : s.score < 60 ? "text-yellow-500" : "text-destructive"
                    }`}>
                      {s.score}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
