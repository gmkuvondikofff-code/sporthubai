import type { SportCategory } from "@/lib/sports-data";
import { useLanguage } from "@/hooks/useLanguage";
import type { Language } from "@/lib/i18n";

interface SportCardProps {
  sport: SportCategory;
  onClick?: () => void;
}

const nameKey: Record<Language, keyof SportCategory> = {
  uz: "nameUz",
  ru: "nameRu",
  en: "name",
};

export default function SportCard({ sport, onClick }: SportCardProps) {
  const { lang } = useLanguage();
  const displayName = sport[nameKey[lang]] as string;

  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl aspect-[3/4] sport-card-hover border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <img
        src={sport.image}
        alt={displayName}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <span className="text-2xl mb-1 block">{sport.icon}</span>
        <h3 className="font-display font-semibold text-foreground text-lg">{displayName}</h3>
      </div>
    </button>
  );
}
