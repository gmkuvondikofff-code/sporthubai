import { Link, useParams } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import AIChat from "@/components/AIChat";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

type SectionKey = "tools" | "methods" | "tactics" | "mini-tour" | "daily-task" | "training";

const content: Record<SectionKey, { uz: { title: string; desc: string; items: string[] }; ru: { title: string; desc: string; items: string[] }; en: { title: string; desc: string; items: string[] } }> = {
  tools: {
    uz: { title: "Jihozlar va anjomlar", desc: "Stol tennisi uchun zarur asbob-uskunalar ro'yxati va ulardan to'g'ri foydalanish.", items: ["Raketka (shakl, gubka, qoplama tanlash)", "To'p — ITTF standarti (40+ mm, 3 yulduzli)", "Stol — 2.74×1.525 m, balandligi 76 sm", "To'r — 15.25 sm balandlik", "Sport kiyim va maxsus krossovkalar", "Raketka g'ilofi va tozalash vositasi"] },
    ru: { title: "Инвентарь и снаряжение", desc: "Список необходимого инвентаря для настольного тенниса и правильное использование.", items: ["Ракетка (форма, губка, накладки)", "Мяч — стандарт ITTF (40+ мм, 3 звезды)", "Стол — 2.74×1.525 м, высота 76 см", "Сетка — высота 15.25 см", "Спортивная одежда и кроссовки", "Чехол для ракетки и средство очистки"] },
    en: { title: "Equipment & Gear", desc: "List of necessary equipment for table tennis and how to use it correctly.", items: ["Racket (shape, sponge, rubbers)", "Ball — ITTF standard (40+ mm, 3-star)", "Table — 2.74×1.525 m, height 76 cm", "Net — height 15.25 cm", "Sportswear and shoes", "Racket case & cleaning kit"] },
  },
  methods: {
    uz: { title: "Amaliy mashqlar", desc: "Texnikani oshirish uchun kunlik mashqlar tizimi.", items: ["Forehand drive — 3×20 takror", "Backhand push — 3×20 takror", "Servis turlari (topspin, backspin, side)", "Multiball mashqi — 100 to'p", "Footwork: 2-step, 3-step", "Devorga to'p urish — 5 daqiqa"] },
    ru: { title: "Практические упражнения", desc: "Система ежедневных упражнений для улучшения техники.", items: ["Форхенд драйв — 3×20 повторений", "Бэкхенд пуш — 3×20", "Виды подач (топспин, бэкспин, боковая)", "Мультибол — 100 мячей", "Футворк: 2-шаг, 3-шаг", "Удары о стену — 5 минут"] },
    en: { title: "Practical drills", desc: "Daily drill system to improve technique.", items: ["Forehand drive — 3×20 reps", "Backhand push — 3×20 reps", "Service types (topspin, backspin, side)", "Multiball drill — 100 balls", "Footwork: 2-step, 3-step", "Wall practice — 5 minutes"] },
  },
  tactics: {
    uz: { title: "Taktika va texnika", desc: "Forehand, backhand, servis va o'yin strategiyalari.", items: ["Hujum: topspin + tezlik", "Himoya: chop, block, lob", "Servisdan keyingi 3-zarba sxemasi", "Raqibning zaif tomonini topish", "Stol burchaklariga aniq yo'naltirish", "Ritm o'zgartirish — tempo control"] },
    ru: { title: "Тактика и техника", desc: "Форхенд, бэкхенд, подача и игровые стратегии.", items: ["Атака: топспин + скорость", "Защита: chop, block, lob", "Схема 3-го удара после подачи", "Поиск слабых сторон соперника", "Точное направление по углам стола", "Смена ритма — tempo control"] },
    en: { title: "Tactics & Technique", desc: "Forehand, backhand, service and game strategies.", items: ["Attack: topspin + speed", "Defense: chop, block, lob", "3rd-ball attack after service", "Find opponent's weak side", "Precise placement to corners", "Tempo control — change of pace"] },
  },
  "mini-tour": {
    uz: { title: "Mini-turnir", desc: "Do'stlar yoki klub a'zolari bilan kichik musobaqa o'tkazing.", items: ["3-5 ishtirokchi", "Round-robin formati", "Har o'yin: bo'g 5 dan 3 g'olib", "Ball yozib boring", "G'olibga mukofot", "AI Coach yordamida tahlil"] },
    ru: { title: "Мини-турнир", desc: "Проведите небольшое соревнование с друзьями или клубом.", items: ["3-5 участников", "Round-robin формат", "Каждый матч: bo'5 до 3", "Запись очков", "Награда победителю", "Анализ через AI Coach"] },
    en: { title: "Mini-tournament", desc: "Hold a small tournament with friends or club.", items: ["3-5 participants", "Round-robin format", "Each match: best of 5", "Track the score", "Prize for the winner", "AI Coach analysis"] },
  },
  "daily-task": {
    uz: { title: "Kunning vazifasi", desc: "Bugun 20 ta mukammal servisni bajaring.", items: ["10 ta topspin servis", "10 ta backspin servis", "Har birini 1 daqiqa pauza bilan", "Videoga oling — xatolarni ko'ring", "AI Coach bilan tahlil qiling", "Bajargach Done tugmasini bosing"] },
    ru: { title: "Задание дня", desc: "Сегодня выполните 20 идеальных подач.", items: ["10 топспин подач", "10 бэкспин подач", "С паузой 1 минута между ними", "Снимите на видео — найдите ошибки", "Проанализируйте с AI Coach", "Нажмите Done после выполнения"] },
    en: { title: "Daily task", desc: "Do 20 perfect serves today.", items: ["10 topspin serves", "10 backspin serves", "1 min pause between each", "Record video — review mistakes", "Discuss with AI Coach", "Press Done when finished"] },
  },
  training: {
    uz: { title: "Bugungi mashg'ulot", desc: "Strukturalashtirilgan 60 daqiqalik treningni bajaring.", items: ["Isinish — 10 daqiqa", "Texnik mashqlar — 20 daqiqa", "Multiball — 15 daqiqa", "O'yin — 10 daqiqa", "Strech va sovutish — 5 daqiqa", "Natijalarni belgilang"] },
    ru: { title: "Сегодняшняя тренировка", desc: "Выполните структурированную 60-минутную тренировку.", items: ["Разминка — 10 мин", "Технические упр. — 20 мин", "Мультибол — 15 мин", "Игра — 10 мин", "Растяжка — 5 мин", "Отметьте результаты"] },
    en: { title: "Today's training", desc: "Complete a structured 60-minute session.", items: ["Warm-up — 10 min", "Technical drills — 20 min", "Multiball — 15 min", "Match play — 10 min", "Cool-down — 5 min", "Log results"] },
  },
};

export default function TTSection() {
  const { section } = useParams<{ section: SectionKey }>();
  const { lang } = useLanguage();
  const key = (section as SectionKey) ?? "tools";
  const data = content[key];

  if (!data) {
    return (
      <div className="min-h-screen pt-24 px-4 text-center text-muted-foreground">
        Section not found. <Link to="/tt-hub" className="text-primary underline">Back</Link>
      </div>
    );
  }

  const c = data[lang as "uz" | "ru" | "en"] ?? data.uz;
  const backLabel = lang === "ru" ? "Назад" : lang === "en" ? "Back" : "Orqaga";
  const doneLabel = lang === "ru" ? "Готово" : lang === "en" ? "Done" : "Bajarildi";

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        <Link to="/tt-hub" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>

        <div className="glass-card rounded-2xl p-6 md:p-8 animate-slide-up">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{c.title}</h1>
          <p className="text-sm text-muted-foreground mt-2">{c.desc}</p>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <ul className="space-y-3">
            {c.items.map((item, i) => (
              <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/40">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm text-foreground">{item}</span>
              </li>
            ))}
          </ul>
          <Button variant="ember" className="w-full mt-5">{doneLabel}</Button>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-display font-semibold text-foreground mb-3">AI Coach</h3>
          <AIChat chatType="sport" sportContext={`Table Tennis - ${c.title}`} />
        </div>
      </div>
    </div>
  );
}