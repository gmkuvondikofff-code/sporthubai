import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import SportCard from "@/components/SportCard";
import { sportCategories } from "@/lib/sports-data";
import { Activity, Calendar, User } from "lucide-react";

interface Profile {
  display_name: string | null;
  user_type: "fan" | "athlete";
}

interface AthleteData {
  sport_type: string;
  stress_level: number | null;
  upcoming_competition_date: string | null;
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [athleteData, setAthleteData] = useState<AthleteData | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (user) {
      fetchData();
    }
  }, [user, authLoading]);

  const fetchData = async () => {
    if (!user) return;
    const { data: p } = await supabase
      .from("profiles")
      .select("display_name, user_type")
      .eq("user_id", user.id)
      .single();
    if (p) setProfile(p);

    if (p?.user_type === "athlete") {
      const { data: a } = await supabase
        .from("athletes")
        .select("sport_type, stress_level, upcoming_competition_date")
        .eq("user_id", user.id)
        .single();
      if (a) setAthleteData(a);
    }
  };

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="animate-pulse-ember text-primary text-xl">Loading...</div>
      </div>
    );
  }

  const stressColor = (level: number) => {
    if (level < 30) return "text-success";
    if (level < 60) return "text-gold";
    return "text-destructive";
  };

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* Welcome header */}
        <div className="glass-card rounded-2xl p-6 md:p-8 mb-8 animate-slide-up">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-gradient-ember flex items-center justify-center">
              <User className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                {t("dashboard.welcome")}, {profile.display_name || "User"}!
              </h1>
              <span className="text-sm text-muted-foreground capitalize">{profile.user_type}</span>
            </div>
          </div>
        </div>

        {/* Athlete stats */}
        {profile.user_type === "athlete" && athleteData && (
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <div className="glass-card rounded-xl p-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-3">
                <Activity className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">{t("dashboard.stress")}</span>
              </div>
              <p className={`text-4xl font-display font-bold ${stressColor(athleteData.stress_level || 0)}`}>
                {athleteData.stress_level || 0}%
              </p>
              <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-gradient-ember rounded-full transition-all duration-500"
                  style={{ width: `${athleteData.stress_level || 0}%` }}
                />
              </div>
            </div>
            <div className="glass-card rounded-xl p-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
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
        )}

        {/* Sport categories grid */}
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">{t("sports.title")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {sportCategories.map((sport) => (
            <SportCard key={sport.id} sport={sport} />
          ))}
        </div>
      </div>
    </div>
  );
}
