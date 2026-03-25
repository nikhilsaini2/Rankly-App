import { Bar, Feature } from "../types/common.types";

export const FEATURES: Feature[] = [
  {
    title: "AI Score Engine",
    sub: "Real ATS simulation · 50+ roles",
    icon: "analytics-outline",
    color: "#A78BFA",
  },
  {
    title: "Bullet Rewriter",
    sub: "Rewrite weak lines instantly",
    icon: "create-outline",
    color: "#22D3EE",
  },
  {
    title: "Mock Interviews",
    sub: "AI feedback · STAR coaching",
    icon: "chatbubble-outline",
    color: "#22C55E",
  },
];

export const BARS: Bar[] = [
  { label: "Keywords", value: 84, colors: ["#9B5CFF", "#A78BFA"] },
  { label: "Experience", value: 76, colors: ["#22D3EE", "#1D4ED8"] },
  { label: "Format", value: 93, colors: ["#22C55E", "#065F46"] },
  { label: "Skills", value: 68, colors: ["#F59E0B", "#92400E"] },
];
