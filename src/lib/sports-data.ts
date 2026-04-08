import footballImg from "@/assets/sports/football.jpg";
import basketballImg from "@/assets/sports/basketball.jpg";
import tennisImg from "@/assets/sports/tennis.jpg";
import boxingImg from "@/assets/sports/boxing.jpg";
import swimmingImg from "@/assets/sports/swimming.jpg";
import chessImg from "@/assets/sports/chess.jpg";
import mmaImg from "@/assets/sports/mma.jpg";
import athleticsImg from "@/assets/sports/athletics.jpg";

export interface SportCategory {
  id: string;
  name: string;
  nameUz: string;
  nameRu: string;
  image: string;
  icon: string;
}

export const sportCategories: SportCategory[] = [
  { id: "football", name: "Football", nameUz: "Futbol", nameRu: "Футбол", image: footballImg, icon: "⚽" },
  { id: "basketball", name: "Basketball", nameUz: "Basketbol", nameRu: "Баскетбол", image: basketballImg, icon: "🏀" },
  { id: "tennis", name: "Tennis", nameUz: "Tennis", nameRu: "Теннис", image: tennisImg, icon: "🎾" },
  { id: "boxing", name: "Boxing", nameUz: "Boks", nameRu: "Бокс", image: boxingImg, icon: "🥊" },
  { id: "swimming", name: "Swimming", nameUz: "Suzish", nameRu: "Плавание", image: swimmingImg, icon: "🏊" },
  { id: "chess", name: "Chess", nameUz: "Shaxmat", nameRu: "Шахматы", image: chessImg, icon: "♟️" },
  { id: "mma", name: "MMA", nameUz: "MMA", nameRu: "ММА", image: mmaImg, icon: "🥋" },
  { id: "athletics", name: "Athletics", nameUz: "Yengil atletika", nameRu: "Лёгкая атлетика", image: athleticsImg, icon: "🏃" },
];
