import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import AIChat from "@/components/AIChat";
import { ArrowLeft, CheckCircle2, Circle, ExternalLink, PlayCircle, Sparkles } from "lucide-react";
import {
  fetchProgress, toggleCompletion, type ProgressSnapshot, type SectionKey, emptySnapshot, SECTION_SIZES,
} from "@/lib/tt-progress";

interface ItemWithImage { uz: string; ru: string; en: string; img: string; example?: { uz: string; ru: string; en: string } }

const TOOLS_ITEMS: ItemWithImage[] = [
  { uz: "Raketka — shakl, gubka, qoplama tanlash", ru: "Ракетка — форма, губка, накладки", en: "Racket — shape, sponge, rubbers",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Table_tennis_racket_and_balls.jpg/320px-Table_tennis_racket_and_balls.jpg",
    example: { uz: "Misol: Butterfly Timo Boll ALC + Tenergy 05 qoplamasi", ru: "Пример: Butterfly Timo Boll ALC + накладка Tenergy 05", en: "Ex: Butterfly Timo Boll ALC + Tenergy 05 rubber" } },
  { uz: "To'p — ITTF standarti (40+ mm, 3 yulduzli)", ru: "Мяч — стандарт ITTF (40+ мм, 3 звезды)", en: "Ball — ITTF standard (40+ mm, 3-star)",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Ping_pong_ball_white.jpg/320px-Ping_pong_ball_white.jpg",
    example: { uz: "Misol: Nittaku Premium 3* (oq, 40+)", ru: "Пример: Nittaku Premium 3* (белый, 40+)", en: "Ex: Nittaku Premium 3* (white, 40+)" } },
  { uz: "Stol — 2.74×1.525 m, balandligi 76 sm", ru: "Стол — 2.74×1.525 м, высота 76 см", en: "Table — 2.74×1.525 m, height 76 cm",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Table_tennis_table.svg/320px-Table_tennis_table.svg.png" },
  { uz: "To'r — 15.25 sm balandlik", ru: "Сетка — высота 15.25 см", en: "Net — 15.25 cm height",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Table_tennis_net_height.svg/320px-Table_tennis_net_height.svg.png" },
  { uz: "Sport kiyim va maxsus krossovkalar", ru: "Спортивная одежда и кроссовки", en: "Sportswear and shoes",
    img: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=300&fit=crop" },
  { uz: "Raketka g'ilofi va tozalash vositasi", ru: "Чехол и средство очистки", en: "Racket case & cleaner",
    img: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400&h=300&fit=crop" },
];

// 13 ketma-ket video darslik (PL8G9_JOD5NB0XyCH_S09I4zFGtuqhWRty)
const PLAYLIST = "PL8G9_JOD5NB0XyCH_S09I4zFGtuqhWRty";
const ytUrl = (id: string) => `https://www.youtube.com/watch?v=${id}&list=${PLAYLIST}`;
const ytImg = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const METHODS_VIDEOS: { id: string; uz: string; ru: string; en: string }[] = [
  { id: "sFOPqdjSmW4", uz: "1-dars: Kirish va asoslar", ru: "Урок 1: Введение и основы", en: "Lesson 1: Intro & basics" },
  { id: "SU4sksLuQQY", uz: "2-dars: Raketkani ushlash", ru: "Урок 2: Хват ракетки", en: "Lesson 2: Grip" },
  { id: "cLh0B0xfmsg", uz: "3-dars: Asosiy stoyka", ru: "Урок 3: Базовая стойка", en: "Lesson 3: Stance" },
  { id: "o6RWbZFB0oE", uz: "4-dars: Forehand zarba", ru: "Урок 4: Форхенд", en: "Lesson 4: Forehand" },
  { id: "pk4o_oyqpGE", uz: "5-dars: Backhand zarba", ru: "Урок 5: Бэкхенд", en: "Lesson 5: Backhand" },
  { id: "YkcscC77ces", uz: "6-dars: Servis texnikasi", ru: "Урок 6: Подача", en: "Lesson 6: Serve" },
  { id: "9o_DJmAXdBE", uz: "7-dars: Topspin", ru: "Урок 7: Топспин", en: "Lesson 7: Topspin" },
  { id: "zgT5cO-V4jE", uz: "8-dars: Backspin", ru: "Урок 8: Бэкспин", en: "Lesson 8: Backspin" },
  { id: "XsPcnT1jq6Q", uz: "9-dars: Footwork", ru: "Урок 9: Работа ног", en: "Lesson 9: Footwork" },
  { id: "wn7TiBoP5L4", uz: "10-dars: Block va himoya", ru: "Урок 10: Блок и защита", en: "Lesson 10: Block & defense" },
  { id: "wSxUoaIAk14", uz: "11-dars: Smash hujum", ru: "Урок 11: Смэш", en: "Lesson 11: Smash" },
  { id: "ZZ7ZWJ5yL9s", uz: "12-dars: Taktika", ru: "Урок 12: Тактика", en: "Lesson 12: Tactics" },
  { id: "yAs01uVtOMQ", uz: "13-dars: Match va amaliyot", ru: "Урок 13: Матч и практика", en: "Lesson 13: Match practice" },
];
const METHODS_ITEMS: (ItemWithImage & { yt: string })[] = METHODS_VIDEOS.map((v) => ({
  uz: v.uz, ru: v.ru, en: v.en, img: ytImg(v.id), yt: ytUrl(v.id),
}));

const SIMPLE_ITEMS: Record<Exclude<SectionKey, "tools" | "methods">, ItemWithImage[]> = {
  "mini-tour": [
    { uz: "3-5 ishtirokchi yig'ing", ru: "Соберите 3-5 участников", en: "Gather 3-5 players", img: "https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=400&h=250&fit=crop" },
    { uz: "Round-robin grafigini tuzing", ru: "Составьте сетку round-robin", en: "Build round-robin bracket", img: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400&h=250&fit=crop" },
    { uz: "Har match: bo3 yoki bo5", ru: "Каждый матч: bo3 или bo5", en: "Each match: bo3 or bo5", img: "https://images.unsplash.com/photo-1606925207923-c2a3c5b3a83d?w=400&h=250&fit=crop" },
    { uz: "Ballarni jurnalga yozing", ru: "Записывайте очки", en: "Track scores", img: "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=400&h=250&fit=crop" },
    { uz: "G'olibga sertifikat tayyorlang", ru: "Подготовьте сертификат победителю", en: "Prepare winner certificate", img: "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=400&h=250&fit=crop" },
    { uz: "AI Coach bilan natijalarni tahlil qiling", ru: "Анализ результатов с AI Coach", en: "Analyze with AI Coach", img: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=250&fit=crop" },
  ],
  "daily-task": [
    { uz: "10 ta topspin servis", ru: "10 топспин подач", en: "10 topspin serves", img: "https://i.ytimg.com/vi/HEYI8O2gM3M/hqdefault.jpg" },
    { uz: "10 ta backspin servis", ru: "10 бэкспин подач", en: "10 backspin serves", img: "https://i.ytimg.com/vi/qyrHb-3p6sk/hqdefault.jpg" },
    { uz: "Har birini 1 daqiqa pauza bilan", ru: "С паузой 1 минута", en: "1 min pause between sets", img: "https://images.unsplash.com/photo-1508179170837-be5fec6e1ee0?w=400&h=250&fit=crop" },
    { uz: "Videoga oling — xatolarni ko'ring", ru: "Снимите на видео", en: "Record video", img: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400&h=250&fit=crop" },
    { uz: "AI Coach bilan tahlil", ru: "Анализ через AI Coach", en: "Discuss with AI Coach", img: "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=400&h=250&fit=crop" },
    { uz: "20 dan kamida 15 tasi to'g'ri", ru: "Минимум 15 из 20 точно", en: "At least 15/20 accurate", img: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400&h=250&fit=crop" },
  ],
  training: [
    { uz: "Isinish — 10 daqiqa", ru: "Разминка — 10 мин", en: "Warm-up — 10 min", img: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=250&fit=crop" },
    { uz: "Texnik mashqlar — 20 daqiqa", ru: "Технические упр. — 20 мин", en: "Technical drills — 20 min", img: "https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=400&h=250&fit=crop" },
    { uz: "Multiball — 15 daqiqa", ru: "Мультибол — 15 мин", en: "Multiball — 15 min", img: "https://i.ytimg.com/vi/UxIx5J9aV0o/hqdefault.jpg" },
    { uz: "O'yin (match) — 10 daqiqa", ru: "Игра — 10 мин", en: "Match play — 10 min", img: "https://images.unsplash.com/photo-1606925207923-c2a3c5b3a83d?w=400&h=250&fit=crop" },
    { uz: "Stretch va sovutish — 5 daqiqa", ru: "Растяжка — 5 мин", en: "Cool-down — 5 min", img: "https://images.unsplash.com/photo-1552693673-1bf958298935?w=400&h=250&fit=crop" },
    { uz: "Natijalarni jurnalga yozing", ru: "Запишите результаты", en: "Log results", img: "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=400&h=250&fit=crop" },
  ],
};

const TITLES: Record<SectionKey, { uz: string; ru: string; en: string; desc: { uz: string; ru: string; en: string } }> = {
  tools:       { uz: "Jihozlar va anjomlar", ru: "Инвентарь и снаряжение", en: "Equipment & Gear",
    desc: { uz: "Stol tennisi uchun zarur asbob-uskunalar va misollar.", ru: "Необходимый инвентарь и примеры.", en: "Required gear with examples." } },
  methods:     { uz: "Amaliy mashqlar", ru: "Практические упражнения", en: "Practical drills",
    desc: { uz: "10 ta video darslik bilan kunlik mashqlar.", ru: "10 видеоуроков и ежедневные упражнения.", en: "10 video lessons + daily drills." } },
  tactics:     { uz: "Taktika va texnika", ru: "Тактика и техника", en: "Tactics & Technique",
    desc: { uz: "10 ta video darslik bilan strategiyalar.", ru: "Стратегии с 10 видеоуроками.", en: "Strategies with 10 video lessons." } },
  "mini-tour": { uz: "Mini-turnir", ru: "Мини-турнир", en: "Mini-tournament",
    desc: { uz: "Do'stlar bilan kichik musobaqa.", ru: "Соревнование с друзьями.", en: "Tournament with friends." } },
  "daily-task":{ uz: "Kunning vazifasi", ru: "Задание дня", en: "Daily task",
    desc: { uz: "Bugun 20 ta mukammal servisni bajaring.", ru: "Сегодня 20 идеальных подач.", en: "20 perfect serves today." } },
  training:    { uz: "Bugungi mashg'ulot", ru: "Сегодняшняя тренировка", en: "Today's training",
    desc: { uz: "Strukturalashtirilgan 60 daqiqalik trening.", ru: "60-минутная структурированная тренировка.", en: "Structured 60-minute session." } },
};

export default function TTSection() {
  const { section } = useParams<{ section: SectionKey }>();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [progress, setProgress] = useState<ProgressSnapshot>(emptySnapshot());
  const [busy, setBusy] = useState<number | null>(null);
  const key = (section as SectionKey) ?? "tools";
  const meta = TITLES[key];

  useEffect(() => { if (user) fetchProgress(user.id).then(setProgress); }, [user]);

  if (!meta) return <div className="min-h-screen pt-24 px-4 text-center text-muted-foreground">Section not found. <Link to="/tt-hub" className="text-primary underline">Back</Link></div>;

  const items: (ItemWithImage & { yt?: string })[] =
    key === "tools" ? TOOLS_ITEMS :
    key === "methods" ? METHODS_ITEMS :
    key === "tactics" ? TACTICS_ITEMS :
    SIMPLE_ITEMS[key];

  const extraVideos = key === "tactics" ? TACTICS_EXTRA_VIDEOS : [];

  const completedSet = progress.completed[key];
  const allDone = completedSet.size >= SECTION_SIZES[key];

  const onToggle = async (idx: number) => {
    if (!user) return;
    const isDone = completedSet.has(idx);
    setBusy(idx);
    try {
      await toggleCompletion(user.id, key, idx, isDone);
      const fresh = await fetchProgress(user.id);
      setProgress(fresh);
      toast({
        title: isDone
          ? (lang === "ru" ? "Снято" : lang === "en" ? "Removed" : "Bekor qilindi")
          : (lang === "ru" ? "Зачтено! +50 XP" : lang === "en" ? "Done! +50 XP" : "Bajarildi! +50 XP"),
      });
    } finally { setBusy(null); }
  };

  const onCompleteAll = async () => {
    if (!user) return;
    setBusy(-1);
    try {
      const missing = Array.from({ length: SECTION_SIZES[key] }, (_, i) => i).filter((i) => !completedSet.has(i));
      for (const i of missing) await toggleCompletion(user.id, key, i, false);
      const fresh = await fetchProgress(user.id);
      setProgress(fresh);
      toast({ title: lang === "ru" ? `Бонус +${missing.length * 50} XP!` : lang === "en" ? `Bonus +${missing.length * 50} XP!` : `Bonus +${missing.length * 50} XP!` });
    } finally { setBusy(null); }
  };

  const c = (o: { uz: string; ru: string; en: string }) => o[lang as "uz" | "ru" | "en"] ?? o.uz;
  const back = lang === "ru" ? "Назад" : lang === "en" ? "Back" : "Orqaga";
  const doneLabel = lang === "ru" ? "Выполнено" : lang === "en" ? "Done" : "Bajarildi";
  const markLabel = lang === "ru" ? "Отметить" : lang === "en" ? "Mark" : "Belgilash";
  const watchLabel = lang === "ru" ? "Смотреть видео" : lang === "en" ? "Watch video" : "Videoni ko'rish";

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        <Link to="/tt-hub" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> {back}
        </Link>

        <div className="glass-card rounded-2xl p-6 md:p-8 animate-slide-up">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{c(meta)}</h1>
          <p className="text-sm text-muted-foreground mt-2">{c(meta.desc)}</p>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all" style={{ width: `${progress.perSectionPercent[key]}%` }} />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">{completedSet.size}/{SECTION_SIZES[key]}</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {items.map((item, i) => {
            const isDone = completedSet.has(i);
            return (
              <div key={i} className={`glass-card rounded-2xl overflow-hidden border transition-all ${isDone ? "border-primary/60" : "border-border"}`}>
                <div className="relative aspect-video bg-secondary">
                  <img src={item.img} alt={c(item)} loading="lazy" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  {item.yt && (
                    <a href={item.yt} target="_blank" rel="noopener noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors group">
                      <PlayCircle className="h-14 w-14 text-white drop-shadow-lg group-hover:scale-110 transition-transform" />
                    </a>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    {isDone ? <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" /> : <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{c(item)}</p>
                      {item.example && <p className="text-xs text-muted-foreground mt-1">{c(item.example)}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {item.yt && (
                      <Button asChild size="sm" variant="outline" className="flex-1">
                        <a href={item.yt} target="_blank" rel="noopener noreferrer">
                          <PlayCircle className="h-4 w-4 mr-1" /> {watchLabel}
                        </a>
                      </Button>
                    )}
                    <Button size="sm" variant={isDone ? "outline" : "ember"} className="flex-1" disabled={busy === i} onClick={() => onToggle(i)}>
                      {isDone ? doneLabel : markLabel} {!isDone && "(+50 XP)"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {extraVideos.length > 0 && (
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-primary" />
              {lang === "ru" ? "Дополнительные видео" : lang === "en" ? "Extra video lessons" : "Qo'shimcha video darslar"}
            </h3>
            <ul className="space-y-2">
              {extraVideos.map((v, i) => (
                <li key={i}>
                  <a href={v.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-lg bg-secondary/40 hover:bg-secondary transition-colors">
                    <span className="text-sm text-foreground">{v.title}</span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!allDone && (
          <Button variant="ember" className="w-full" size="lg" disabled={busy === -1} onClick={onCompleteAll}>
            <Sparkles className="h-4 w-4 mr-2" />
            {lang === "ru" ? "Отметить все как выполнено" : lang === "en" ? "Mark all as done" : "Hammasini bajarildi deb belgilash"}
          </Button>
        )}

        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-display font-semibold text-foreground mb-3">AI Coach</h3>
          <AIChat chatType="sport" sportContext={`Table Tennis - ${c(meta)}`} />
        </div>
      </div>
    </div>
  );
}
