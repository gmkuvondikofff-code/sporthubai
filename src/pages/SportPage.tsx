import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { sportCategories } from "@/lib/sports-data";
import AIChat from "@/components/AIChat";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Language } from "@/lib/i18n";
import type { SportCategory } from "@/lib/sports-data";

const nameKey: Record<Language, keyof SportCategory> = {
  uz: "nameUz",
  ru: "nameRu",
  en: "name",
};

export default function SportPage() {
  const { sportId } = useParams<{ sportId: string }>();
  const { user, loading } = useAuth();
  const { lang, t } = useLanguage();
  const navigate = useNavigate();

  const sport = sportCategories.find((s) => s.id === sportId);

  if (!sport) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center">
          <p className="text-2xl font-display text-foreground mb-4">Sport topilmadi</p>
          <Button variant="ember" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> {t("nav.dashboard")}
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="animate-pulse text-primary text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  const displayName = sport[nameKey[lang]] as string;

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="container mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> {t("nav.dashboard")}
          </Button>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="relative h-48">
              <img
                src={sport.image}
                alt={displayName}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <span className="text-3xl mr-2">{sport.icon}</span>
                <h1 className="font-display text-3xl font-bold text-foreground inline-block">{displayName}</h1>
              </div>
            </div>
          </div>
        </div>

        {/* AI Chat for this sport */}
        <AIChat chatType="sport" sportContext={sport.name} />
      </div>
    </div>
  );
}
