import { useNavigate, Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import SportCard from "@/components/SportCard";
import { sportCategories } from "@/lib/sports-data";
import heroBanner from "@/assets/hero-banner.jpg";
import { ArrowRight, Brain, Trophy, Users } from "lucide-react";

export default function Index() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <img
          src={heroBanner}
          alt="SportAI Hub hero"
          width={1920}
          height={1080}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background" />
        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto animate-slide-up">
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-4 text-foreground">
            {t("hero.title")}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
            {t("hero.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="ember"
              size="lg"
              onClick={() => navigate("/dashboard?type=fan")}
              className="text-base px-8"
            >
              Fan
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="ember-outline"
              size="lg"
              onClick={() => navigate("/tt-hub")}
              className="text-base px-8"
            >
              🏓 Stol tennis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="ember-outline"
              size="lg"
              onClick={() => navigate("/dashboard?type=athlete")}
              className="text-base px-8"
            >
              Sportchi
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {[
              { icon: Brain, title: "AI Sport Chat", desc: "Sport bo'yicha AI bilan suhbat" },
              { icon: Trophy, title: "Mental Coach", desc: "Ruhiy holat tahlili va stress monitoring" },
              { icon: Users, title: "Community", desc: "Sportchilar va muxlislar jamoasi" },
            ].map((f, i) => (
              <div
                key={i}
                className="glass-card rounded-2xl p-8 text-center animate-fade-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <f.icon className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="font-display text-xl font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Sport categories */}
          <h2 className="font-display text-3xl font-bold text-foreground text-center mb-10">
            {t("sports.title")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {sportCategories.map((sport) => (
              <SportCard
                key={sport.id}
                sport={sport}
                onClick={() => navigate(sport.id === "table-tennis" ? "/tt-hub" : `/sport/${sport.id}`)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>© 2026 SportAI Hub. All rights reserved.</p>
      </footer>
    </div>
  );
}
