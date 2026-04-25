export interface TTCompetition {
  id: number;
  title: string;
  city: string;
  district: string;
  date: string; // ISO
  url: string;
}

// Manba: https://uttf.uz (O'zbekiston Stol Tennisi Federatsiyasi)
export const ttCompetitions: TTCompetition[] = [
  { id: 1142, title: "ITTF Jamoaviy bahslari bo'yicha Jahon chempionati London 2026", city: "Toshkent shahar", district: "Chilonzor tumani", date: "2026-04-28T09:00:00", url: "https://uttf.uz/uz/competitions/1142" },
  { id: 1152, title: "WTT Youth Contender Tashkent 2026", city: "Toshkent shahar", district: "Yunusobod tumani", date: "2026-05-13T09:00:00", url: "https://uttf.uz/uz/competitions/1152" },
  { id: 1141, title: "U11 va U13 O'zbekiston chempionati", city: "Toshkent shahar", district: "Yakkasaroy tumani", date: "2026-05-27T09:00:00", url: "https://uttf.uz/uz/competitions/1141" },
  { id: 1143, title: "U15 O'zbekiston chempionati", city: "Toshkent shahar", district: "Yakkasaroy tumani", date: "2026-06-01T09:00:00", url: "https://uttf.uz/uz/competitions/1143" },
  { id: 1144, title: "ITTF-ATTU Yoshlar o'rtasida Osiyo chempionati", city: "Toshkent shahar", district: "Chilonzor tumani", date: "2026-06-21T09:00:00", url: "https://uttf.uz/uz/competitions/1144" },
  { id: 1145, title: "U17 O'zbekiston kubogi", city: "Toshkent shahar", district: "Yakkasaroy tumani", date: "2026-07-13T09:00:00", url: "https://uttf.uz/uz/competitions/1145" },
  { id: 1153, title: "WTT Youth Contender Tashkent II 2026", city: "Toshkent shahar", district: "Chilonzor tumani", date: "2026-07-19T09:00:00", url: "https://uttf.uz/uz/competitions/1153" },
  { id: 1154, title: "WTT Feeder Tashkent 2026", city: "Toshkent shahar", district: "Chilonzor tumani", date: "2026-07-24T09:00:00", url: "https://uttf.uz/uz/competitions/1154" },
  { id: 1155, title: "U19 O'zbekiston kubogi", city: "Toshkent shahar", district: "Yakkasaroy tumani", date: "2026-08-17T09:00:00", url: "https://uttf.uz/uz/competitions/1155" },
  { id: 1146, title: "U15 O'zbekiston kubogi", city: "Toshkent shahar", district: "Yakkasaroy tumani", date: "2026-09-14T09:00:00", url: "https://uttf.uz/uz/competitions/1146" },
  { id: 1149, title: "ITTF-ATTU Osiyo chempionati", city: "Toshkent shahar", district: "Chilonzor tumani", date: "2026-09-19T09:00:00", url: "https://uttf.uz/uz/competitions/1149" },
  { id: 1147, title: "20-Osiyo o'yinlari Aichi-Nagoya 2026", city: "Toshkent shahar", district: "Yakkasaroy tumani", date: "2026-09-19T09:00:00", url: "https://uttf.uz/uz/competitions/1147" },
  { id: 1150, title: "Yoshlar o'rtasida Olimpiya o'yinlari", city: "Toshkent shahar", district: "Chilonzor tumani", date: "2026-10-30T09:00:00", url: "https://uttf.uz/uz/competitions/1150" },
  { id: 1148, title: "U11 va U13 O'zbekiston kubogi", city: "Toshkent shahar", district: "Yakkasaroy tumani", date: "2026-11-09T09:00:00", url: "https://uttf.uz/uz/competitions/1148" },
  { id: 1151, title: "Stol tennisi bo'yicha yoshlar o'rtasidagi jahon chempionati", city: "Toshkent shahar", district: "Chilonzor tumani", date: "2026-11-21T09:00:00", url: "https://uttf.uz/uz/competitions/1151" },
  { id: 1156, title: "Katalar o'rtasida O'zbekiston kubogi", city: "Toshkent shahar", district: "Yakkasaroy tumani", date: "2026-12-14T09:00:00", url: "https://uttf.uz/uz/competitions/1156" },
  { id: 1030, title: "Los-Anjeles-2028 Olimpiya o'yinlari", city: "Los-Anjeles", district: "-", date: "2028-11-01T00:00:00", url: "https://uttf.uz/uz/competitions/1030" },
];

export function getUpcomingCompetitions(now: Date = new Date()): TTCompetition[] {
  return ttCompetitions
    .filter((c) => new Date(c.date).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function formatCountdown(target: Date, now: Date = new Date()) {
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, ended: true };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds, ended: false };
}