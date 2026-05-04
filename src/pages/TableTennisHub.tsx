import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import AIChat from "@/components/AIChat";
import { Button } from "@/components/ui/button";
import {
  Activity, Brain, Smile, Users, Trophy, Target, Flame,
  Calendar, ChevronRight, Award, Zap, MessageCircle, X, Gamepad2,
} from "lucide-react";
import { getUpcomingCompetitions, formatCountdown } from "@/lib/tt-competitions";

interface TTProfile {
  display_name: string | null;
  username: string | null;
}
interface TTData {
  age: number | null;
  level: string;
  goals: string | null;
  training_streak: number;
  total_xp: number;
}

const indicators = [
  { key: "tt.speed", value: 75 },
  { key: "tt.endurance", value: 70 },
  { key: "tt.agility", value: 80 },
  { key: "tt.coordination", value: 78 },
];

const skills = [
  { key: "tt.physical", value: 72, icon: Activity, color: "text-emerald-500" },
  { key: "tt.cognitive", value: 68, icon: Brain, color: "text-blue-500" },
  { key: "tt.psych", value: 75, icon: Smile, color: "text-purple-500" },
  { key: "tt.social", value: 80, icon: Users, color: "text-amber-500" },
];

const sessions = [
  { titleKey: "tt.tools", route: "tools", descUz: "Jihozlar va anjomlar", descRu: "Инвентарь и снаряжение", descEn: "Equipment & gear" },
  { titleKey: "tt.methods", route: "methods", descUz: "Amaliy mashqlar", descRu: "Практические упражнения", descEn: "Practical drills" },
  { titleKey: "tt.tactics", route: "tactics", descUz: "Forehand, backhand va boshqalar", descRu: "Форхенд, бэкхенд и др.", descEn: "Forehand, backhand & more" },
  { titleKey: "tt.miniTour", route: "mini-tour", descUz: "Musobaqalar va o'yinlar", descRu: "Соревнования и игры", descEn: "Tournaments & matches" },
];

export default function TableTennisHub() {
  const { user, loading: authLoading } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<TTProfile | null>(null);
  const [tt, setTt] = useState<TTData | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const nextComp = useMemo(() => getUpcomingCompetitions(now)[0], [now]);
  const cd = nextComp ? formatCountdown(new Date(nextComp.date), now) : null;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (user) load();
  }, [user, authLoading]);

  const load = async () => {
    if (!user) return;
    const { data: p } = await supabase
      .from("profiles").select("display_name, user_type, username")
      .eq("user_id", user.id).single();
    if (p && (p as any).user_type !== "tt_player") {
      navigate("/dashboard", { replace: true });
      return;
    }
    if (p) setProfile(p as TTProfile);
    const { data: ttd } = await supabase
      .from("tt_players").select("age, level, goals, training_streak, total_xp")
      .eq("user_id", user.id).single();
    if (ttd) setTt(ttd);
  };

  if (authLoading || !profile || !tt) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="animate-pulse text-primary text-xl">Loading...</div>
      </div>
    );
  }

  const xpPercent = Math.min(100, Math.round((tt.total_xp / 1200) * 100));

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="container mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="glass-card rounded-2xl p-6 md:p-8 animate-slide-up">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-3xl">
              🏓
            </div>
            <div className="flex-1">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                {t("tt.title")}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{t("tt.subtitle")}</p>
            </div>
          </div>
        </div>

        {/* Greeting + today training */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="glass-card rounded-2xl p-6 md:col-span-2">
            <p className="text-sm text-muted-foreground">
              {lang === "ru" ? "Привет" : lang === "en" ? "Hi" : "Salom"},
            </p>
            <h2 className="font-display text-2xl font-bold text-foreground">
              {profile.display_name || profile.username}!
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {lang === "ru"
                ? "Достигайте сегодняшней цели!"
                : lang === "en"
                ? "Reach today's goal!"
                : "Bugungi maqsadingizga yeting!"}
            </p>

            <div className="mt-5 p-4 rounded-xl bg-secondary/40 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">{t("tt.training")}</span>
                <span className="text-sm font-bold text-primary">60%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60" style={{ width: "60%" }} />
              </div>
              <Button variant="ember" size="sm" className="w-full mt-4" onClick={() => navigate("/tt-hub/section/training")}>
                {t("tt.continue")} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* Rank card */}
          <div className="glass-card rounded-2xl p-6 flex flex-col items-center text-center">
            <Trophy className="h-12 w-12 text-amber-500 mb-2" />
            <p className="text-xs text-muted-foreground">{t("tt.rank")}</p>
            <h3 className="font-display text-xl font-bold text-foreground">{t("tt.gold")}</h3>
            <p className="text-sm text-muted-foreground mt-1">{tt.total_xp} / 1200 XP</p>
            <div className="w-full mt-3 h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300" style={{ width: `${xpPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Upcoming Competition Card */}
        {nextComp && cd && (
          <Link to="/tt-hub/competitions" className="block">
            <div className="glass-card rounded-2xl p-5 border border-primary/30 hover:border-primary/60 transition-all">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-xs uppercase tracking-wider text-primary font-medium">
                      {lang === "ru" ? "Ближайшее соревнование" : lang === "en" ? "Next competition" : "Yaqin musobaqa"}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-foreground leading-snug">{nextComp.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{nextComp.city} • {nextComp.district}</p>
                </div>
                <div className="flex items-center gap-2 text-foreground tabular-nums">
                  <div className="text-center">
                    <div className="font-display text-xl font-bold">{String(cd.days).padStart(2, "0")}</div>
                    <div className="text-[9px] uppercase text-muted-foreground">{lang === "ru" ? "дн" : lang === "en" ? "d" : "kun"}</div>
                  </div>
                  <span className="text-primary">:</span>
                  <div className="text-center">
                    <div className="font-display text-xl font-bold">{String(cd.hours).padStart(2, "0")}</div>
                    <div className="text-[9px] uppercase text-muted-foreground">{lang === "ru" ? "ч" : lang === "en" ? "h" : "soat"}</div>
                  </div>
                  <span className="text-primary">:</span>
                  <div className="text-center">
                    <div className="font-display text-xl font-bold">{String(cd.minutes).padStart(2, "0")}</div>
                    <div className="text-[9px] uppercase text-muted-foreground">{lang === "ru" ? "мин" : lang === "en" ? "m" : "daq"}</div>
                  </div>
                  <span className="text-primary">:</span>
                  <div className="text-center">
                    <div className="font-display text-xl font-bold">{String(cd.seconds).padStart(2, "0")}</div>
                    <div className="text-[9px] uppercase text-muted-foreground">{lang === "ru" ? "сек" : lang === "en" ? "s" : "son"}</div>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end text-xs text-primary font-medium">
                {lang === "ru" ? "Все соревнования" : lang === "en" ? "All competitions" : "Barcha musobaqalar"}
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </Link>
        )}

        {/* Skill metrics 2x2 */}
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground mb-3">
            {t("tt.metrics")}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {skills.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.key} className="glass-card rounded-xl p-4">
                  <Icon className={`h-5 w-5 mb-2 ${s.color}`} />
                  <p className="text-xs text-muted-foreground">{t(s.key)}</p>
                  <p className="text-2xl font-display font-bold text-foreground">{s.value}%</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sessions list (Mashg'ulot) */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="glass-card rounded-2xl p-5">
            <div className="flex gap-2 mb-4">
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-500 font-medium">{t("tt.tools")}</span>
              <span className="text-xs px-3 py-1 rounded-full bg-blue-500/15 text-blue-500 font-medium">{t("tt.methods")}</span>
              <span className="text-xs px-3 py-1 rounded-full bg-purple-500/15 text-purple-500 font-medium">{t("tt.tactics")}</span>
            </div>
            <ul className="space-y-3">
              {sessions.map((s) => (
                <li
                  key={s.titleKey}
                  onClick={() => navigate(`/tt-hub/section/${s.route}`)}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/40 hover:bg-secondary transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center text-lg">🏓</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t(s.titleKey)}</p>
                      <p className="text-xs text-muted-foreground">{lang === "ru" ? s.descRu : lang === "en" ? s.descEn : s.descUz}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </li>
              ))}
            </ul>
          </div>

          {/* Indicators */}
          <div className="glass-card rounded-2xl p-5">
            <h4 className="font-display font-semibold text-foreground mb-3">{t("tt.indicators")}</h4>
            <div className="space-y-3">
              {indicators.map((i) => (
                <div key={i.key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{t(i.key)}</span>
                    <span className="font-bold text-foreground">{i.value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60" style={{ width: `${i.value}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 p-4 rounded-xl bg-secondary/40">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">{t("tt.dailyTask")}</span>
              </div>
              <p className="text-sm font-medium text-foreground">
                {lang === "ru" ? "Сделайте 20 идеальных подач" : lang === "en" ? "Do 20 perfect serves" : "Servis mashqini 20 marta mukammal bajaring"}
              </p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-muted-foreground">0 / 20</span>
                <Button size="sm" variant="ember" onClick={() => navigate("/tt-hub/section/daily-task")}>
                  {lang === "ru" ? "Выполнить" : lang === "en" ? "Do it" : "Bajarish"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="glass-card rounded-2xl p-5">
          <h4 className="font-display font-semibold text-foreground mb-3">{t("tt.achievements")}</h4>
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: Award, labelUz: "Intizomli", labelRu: "Дисциплинированный", labelEn: "Disciplined", color: "text-blue-500" },
              { icon: Zap, labelUz: "Tezkor", labelRu: "Быстрый", labelEn: "Fast", color: "text-amber-500" },
              { icon: Target, labelUz: "Strateg", labelRu: "Стратег", labelEn: "Strategist", color: "text-emerald-500" },
              { icon: Users, labelUz: "Jamoaviy", labelRu: "Командный", labelEn: "Team player", color: "text-purple-500" },
            ].map((a, idx) => {
              const Icon = a.icon;
              return (
                <div key={idx} className="flex flex-col items-center text-center p-3 rounded-xl bg-secondary/40">
                  <Icon className={`h-7 w-7 mb-1 ${a.color}`} />
                  <span className="text-xs text-foreground">
                    {lang === "ru" ? a.labelRu : lang === "en" ? a.labelEn : a.labelUz}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Coach */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <h4 className="font-display font-semibold text-foreground">{t("tt.aiCoach")}</h4>
            </div>
            <Button variant={chatOpen ? "outline" : "ember"} size="sm" onClick={() => setChatOpen(!chatOpen)}>
              {chatOpen ? <X className="h-4 w-4" /> : t("tt.askAi")}
            </Button>
          </div>
          {chatOpen && <AIChat chatType="sport" sportContext="Table Tennis" />}
        </div>
      </div>
    </div>
  );
}