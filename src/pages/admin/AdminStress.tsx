import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

interface AthleteRow {
  id: string;
  user_id: string;
  sport_type: string;
  stress_level: number | null;
  display_name?: string | null;
}

interface ScoreRow {
  score: number;
  created_at: string;
  notes: string | null;
}

export default function AdminStress() {
  const [athletes, setAthletes] = useState<AthleteRow[]>([]);
  const [selected, setSelected] = useState<AthleteRow | null>(null);
  const [history, setHistory] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("athletes")
        .select("id, user_id, sport_type, stress_level");
      if (data) {
        const enriched = await Promise.all(
          data.map(async (a) => {
            const { data: prof } = await supabase
              .from("profiles")
              .select("display_name")
              .eq("user_id", a.user_id)
              .maybeSingle();
            return { ...a, display_name: prof?.display_name };
          })
        );
        setAthletes(enriched);
      }
      setLoading(false);
    })();
  }, []);

  const viewHistory = async (a: AthleteRow) => {
    setSelected(a);
    const { data } = await supabase
      .from("stress_scores")
      .select("score, created_at, notes")
      .eq("athlete_id", a.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setHistory((data as ScoreRow[]) || []);
  };

  const stressColor = (v: number) =>
    v < 30 ? "text-green-500" : v < 60 ? "text-yellow-500" : "text-destructive";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Stress Analytics</h1>
        <p className="text-sm text-muted-foreground">Athlete stress levels and history</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Athletes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Sport</TableHead>
                  <TableHead>Stress %</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {athletes.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-foreground">{a.display_name || "—"}</TableCell>
                    <TableCell className="text-foreground">{a.sport_type}</TableCell>
                    <TableCell>
                      <span className={`font-bold ${stressColor(a.stress_level || 0)}`}>
                        {a.stress_level || 0}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => viewHistory(a)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {athletes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No athletes yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>History — {selected.display_name || selected.sport_type}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              ✕
            </Button>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-muted-foreground text-sm">No stress data recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {history.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-secondary rounded-lg px-4 py-2"
                  >
                    <span className="text-sm text-muted-foreground">
                      {new Date(s.created_at).toLocaleString()}
                    </span>
                    <span className={`font-bold ${stressColor(s.score)}`}>{s.score}%</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
