import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import SportCard from "@/components/SportCard";
import AIChat from "@/components/AIChat";
import AddSportForm from "@/components/AddSportForm";
import { sportCategories } from "@/lib/sports-data";
import { Activity, Calendar, User, MessageCircle, Brain, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Profile {
  display_name: string | null;
  user_type: "fan" | "athlete" | "tt_player";
  username: string | null;
}

interface AthleteData {
  sport_type: string;
  stress_level: number | null;
  upcoming_competition_date: string | null;
}

interface FanSport {
  id: string;
  sport_name: string;
  image_url: string | null;
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [athleteData, setAthleteData] = useState<AthleteData | null>(null);
  const [activeSportChat, setActiveSportChat] = useState<string | null>(null);
  const [showPsychologist, setShowPsychologist] = useState(false);
  const [fanSports, setFanSports] = useState<FanSport[]>([]);
  const [showAddSport, setShowAddSport] = useState(false);

  useEffect(() => {
    if (user) fetchData();
    else {
      const t = searchParams.get("type");
      const isAth = t === "athlete";
      setProfile({
        display_name: "Mehmon",
        user_type: isAth ? "athlete" : "fan",
        username: "guest",
      });
      if (isAth) {
        setAthleteData({
          sport_type: "Table Tennis",
          stress_level: 0,
          upcoming_competition_date: null,
        });
      }
    }
  }, [user, authLoading]);

  const fetchData = async () => {
    if (!user) return;
    const { data: p } = await supabase
      .from("profiles")
      .select("display_name, user_type, username")
      .eq("user_id", user.id)
      .single();
    if (p) {
      setProfile(p as Profile);
      if (p.user_type === "tt_player") {
        navigate("/tt-hub", { replace: true });
        return;
      }
    }

    if (p?.user_type === "athlete") {
      const { data: a } = await supabase
        .from("athletes")
        .select("sport_type, stress_level, upcoming_competition_date")
        .eq("user_id", user.id)
        .single();
      if (a) setAthleteData(a);
    } else {
      // Load fan custom sports
      const { data: fs } = await supabase
        .from("fan_sports")
        .select("id, sport_name, image_url")
        .eq("user_id", user.id);
      if (fs) setFanSports(fs);
    }
  };

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="animate-pulse text-primary text-xl">Loading...</div>
      </div>
    );
  }

  const stressColor = (level: number) => {
    if (level < 30) return "text-green-500";
    if (level < 60) return "text-yellow-500";
    return "text-destructive";
  };

  const isAthlete = profile.user_type === "athlete";

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* Welcome */}
        <div className="glass-card rounded-2xl p-6 md:p-8 mb-8 animate-slide-up">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <User className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                {t("dashboard.welcome")}, {profile.display_name || profile.username || "User"}!
              </h1>
              <span className="text-sm text-muted-foreground capitalize">{profile.user_type}</span>
            </div>
          </div>
        </div>

        {/* Athlete: sport-specific dashboard */}
        {isAthlete && athleteData && (
          <>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Activity className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">{t("dashboard.stress")}</span>
                </div>
                <p className={`text-4xl font-display font-bold ${stressColor(athleteData.stress_level || 0)}`}>
                  {athleteData.stress_level || 0}%
                </p>
                <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${athleteData.stress_level || 0}%`,
                      background: `linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.6))`,
                    }}
                  />
                </div>
              </div>
              <div className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">{t("dashboard.competition")}</span>
                </div>
                <p className="text-2xl font-display font-bold text-foreground">
                  {athleteData.upcoming_competition_date
                    ? new Date(athleteData.upcoming_competition_date).toLocaleDateString()
                    : "—"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{athleteData.sport_type}</p>
              </div>
            </div>

            {/* Athlete: Only their sport chat + Psychologist */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <Button
                variant={activeSportChat ? "ember" : "outline"}
                className="h-auto py-4 flex-col gap-2"
                onClick={() => { setActiveSportChat(athleteData.sport_type); setShowPsychologist(false); }}
              >
                <MessageCircle className="h-6 w-6" />
                <span>{athleteData.sport_type} AI Chat</span>
              </Button>
              <Button
                variant={showPsychologist ? "ember" : "outline"}
                className="h-auto py-4 flex-col gap-2"
                onClick={() => { setShowPsychologist(true); setActiveSportChat(null); }}
              >
                <Brain className="h-6 w-6" />
                <span>{lang === "ru" ? "Психолог AI" : "Psixolog AI"}</span>
              </Button>
            </div>

            {activeSportChat && (
              <div className="mb-8">
                <AIChat chatType="sport" sportContext={activeSportChat} />
              </div>
            )}
            {showPsychologist && (
              <div className="mb-8">
                <AIChat
                  chatType="psychologist"
                  sportContext={athleteData.sport_type}
                  onStressScore={async (score) => {
                    setAthleteData(prev => prev ? { ...prev, stress_level: score } : prev);
                  }}
                />
              </div>
            )}
          </>
        )}

        {/* Fan: All sport categories + custom sports + add sport */}
        {!isAthlete && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-bold text-foreground">{t("sports.title")}</h2>
              <Button variant="ember" size="sm" onClick={() => setShowAddSport(!showAddSport)}>
                {showAddSport ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                {showAddSport ? (lang === "ru" ? "Закрыть" : "Yopish") : (lang === "ru" ? "Добавить спорт" : "Sport qo'shish")}
              </Button>
            </div>

            {showAddSport && (
              <div className="mb-6">
                <AddSportForm onAdded={() => { fetchData(); setShowAddSport(false); }} />
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {sportCategories.map((sport) => (
                <SportCard
                  key={sport.id}
                  sport={sport}
                  onClick={() => navigate(`/sport/${sport.id}`)}
                />
              ))}
              {fanSports.map((fs) => (
                <button
                  key={fs.id}
                  onClick={() => setActiveSportChat(fs.sport_name)}
                  className="group relative overflow-hidden rounded-xl aspect-[3/4] border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {fs.image_url && (
                    <img src={fs.image_url} alt={fs.sport_name} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <span className="text-2xl mb-1 block">🏅</span>
                    <h3 className="font-display font-semibold text-foreground text-lg">{fs.sport_name}</h3>
                  </div>
                </button>
              ))}
            </div>

            {activeSportChat && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-lg font-semibold text-foreground">{activeSportChat} AI</h3>
                  <Button variant="ghost" size="sm" onClick={() => setActiveSportChat(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <AIChat chatType="sport" sportContext={activeSportChat} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
