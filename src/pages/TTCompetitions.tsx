import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, ExternalLink, ArrowLeft, Trophy } from "lucide-react";
import { getUpcomingCompetitions, formatCountdown, type TTCompetition } from "@/lib/tt-competitions";

export default function TTCompetitions() {
  const { lang } = useLanguage();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const competitions = getUpcomingCompetitions(now);
  const next = competitions[0];

  const labels = {
    uz: { back: "Orqaga", title: "Stol tennisi musobaqalari", subtitle: "O'zbekiston Stol Tennisi Federatsiyasi (uttf.uz)", upcoming: "Yaqinlashayotgan musobaqalar", starts: "Boshlanish vaqti", days: "kun", hours: "soat", minutes: "daqiqa", seconds: "soniya", details: "Batafsil", source: "Manba" },
    ru: { back: "Назад", title: "Соревнования по настольному теннису", subtitle: "Федерация настольного тенниса Узбекистана (uttf.uz)", upcoming: "Предстоящие соревнования", starts: "Начало", days: "дн", hours: "ч", minutes: "мин", seconds: "сек", details: "Подробно", source: "Источник" },
    en: { back: "Back", title: "Table Tennis Competitions", subtitle: "Uzbekistan Table Tennis Federation (uttf.uz)", upcoming: "Upcoming competitions", starts: "Starts in", days: "d", hours: "h", minutes: "m", seconds: "s", details: "Details", source: "Source" },
  } as const;
  const L = labels[lang as keyof typeof labels] ?? labels.uz;

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    const locale = lang === "ru" ? "ru-RU" : lang === "en" ? "en-US" : "uz-UZ";
    return d.toLocaleString(locale, { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const Counter = ({ c }: { c: TTCompetition }) => {
    const cd = formatCountdown(new Date(c.date), now);
    const Cell = ({ v, label }: { v: number; label: string }) => (
      <div className="flex flex-col items-center">
        <span className="font-display text-2xl md:text-3xl font-bold text-foreground tabular-nums">{String(v).padStart(2, "0")}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
    );
    return (
      <div className="flex items-center gap-3 md:gap-5">
        <Cell v={cd.days} label={L.days} />
        <span className="text-primary text-2xl">:</span>
        <Cell v={cd.hours} label={L.hours} />
        <span className="text-primary text-2xl">:</span>
        <Cell v={cd.minutes} label={L.minutes} />
        <span className="text-primary text-2xl">:</span>
        <Cell v={cd.seconds} label={L.seconds} />
      </div>
    );
  };

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="container mx-auto max-w-5xl space-y-6">
        <Link to="/tt-hub" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> {L.back}
        </Link>

        <div className="glass-card rounded-2xl p-6 md:p-8 animate-slide-up">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Trophy className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{L.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">{L.subtitle}</p>
            </div>
          </div>
        </div>

        {next && (
          <div className="glass-card rounded-2xl p-6 border border-primary/30">
            <p className="text-xs uppercase tracking-wider text-primary mb-1">{L.starts}</p>
            <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-1">{next.title}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <MapPin className="h-4 w-4" />
              <span>{next.city} • {next.district}</span>
              <span className="text-border">|</span>
              <Calendar className="h-4 w-4" />
              <span>{fmtDate(next.date)}</span>
            </div>
            <Counter c={next} />
            <a href={next.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-primary hover:underline">
              {L.details} <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        <div>
          <h3 className="font-display text-lg font-semibold text-foreground mb-3">{L.upcoming}</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {competitions.map((c) => (
              <a
                key={c.id}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card rounded-xl p-4 hover:border-primary/40 transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-foreground text-sm leading-snug group-hover:text-primary transition-colors">{c.title}</h4>
                  <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{c.city} • {c.district}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-primary font-medium">
                  <Calendar className="h-3 w-3" />
                  <span>{fmtDate(c.date)}</span>
                </div>
              </a>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {L.source}: <a href="https://uttf.uz" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">uttf.uz</a>
        </p>
      </div>
    </div>
  );
}