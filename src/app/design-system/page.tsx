import type { Metadata } from "next";
import { DesignSystemClient } from "./DesignSystemClient";

export const metadata: Metadata = {
  title: "Compuerta Visual #1 — Design System | Academia Atómica",
  description:
    "Espécimen interactivo de Design Tokens OKLCH, ergonomía neuro-visual y calibración óptica 60 FPS.",
};

export default function DesignSystemPage() {
  return <DesignSystemClient />;
}
