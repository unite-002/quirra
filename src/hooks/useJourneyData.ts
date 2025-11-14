// src/hooks/useJourneyData.ts
"use client";
import { useMemo } from "react";

export type JourneyEntry = {
  id: string;
  type: "achievement" | "reflection" | "support" | "goal" | "emotion";
  title: string;
  content: string;
  snippet: string;
  date: string; // ISO
  emotion_state?: { mood?: string; score?: number };
  ai_reflection_snippet?: string;
};

export default function useJourneyData() {
  const entries = useMemo<JourneyEntry[]>(
    () => [
      {
        id: "e1",
        type: "achievement",
        title: "First breakthrough with Quirra",
        content:
          "That day you learned to lead with clarity — and it changed how you approach challenges.",
        snippet: "You learned to lead with clarity — and it changed everything.",
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
        emotion_state: { mood: "calm", score: 0.6 },
        ai_reflection_snippet:
          "I remember that week. You stayed resilient even when things got hard. That changed everything.",
      },
      {
        id: "e2",
        type: "support",
        title: "Difficult week",
        content:
          "There was a week where tasks piled up and you felt stuck. Quirra helped you build a 3-step recovery plan.",
        snippet: "A difficult week that taught you resilience.",
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 70).toISOString(),
        emotion_state: { mood: "stressed", score: 0.2 },
        ai_reflection_snippet:
          "That was a heavy week. You kept going even when it felt hard — that matters more than it felt then.",
      },
      {
        id: "e3",
        type: "achievement",
        title: "New project launched",
        content: "You launched your new project and executed your plan carefully.",
        snippet: "Your project launch marked visible growth.",
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
        emotion_state: { mood: "energized", score: 0.9 },
        ai_reflection_snippet:
          "This launch was a clear moment of growth — consistent actions led to success.",
      },
    ],
    []
  );

  return { entries };
}
