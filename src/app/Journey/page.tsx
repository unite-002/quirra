"use client";

import React from "react";
import JourneyPath from "@/components/Journey/JourneyPath"; // <-- import your path component

export default function JourneyPage() {
  return (
    <div
      className="fixed inset-0 w-screen h-screen overflow-hidden flex items-center justify-center"
      style={{
        background: `
          radial-gradient(
            circle at 50% 50%,
            rgba(0, 60, 150, 0.08),
            rgba(0, 30, 80, 0.1),
            #040814 70%
          ),
          linear-gradient(
            180deg,
            #040814 0%,
            #030612 40%,
            #02040E 75%,
            #01030A 100%
          )
        `,
      }}
    >
      {/* Subtle deep blue ambient layer */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 50% 50%, rgba(0, 90, 255, 0.07), transparent 70%)
          `,
          mixBlendMode: "soft-light",
        }}
      ></div>

      {/* Atmospheric density layer */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(180deg, rgba(0, 50, 120, 0.05), rgba(0, 20, 60, 0.07))
          `,
          mixBlendMode: "overlay",
        }}
      ></div>

      {/* Subtle cinematic blur for smooth tone */}
      <div
        className="absolute inset-0"
        style={{
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          opacity: 0.1,
        }}
      ></div>

      {/* --- Centered Journey Path Component --- */}
      <div className="relative z-10 w-[90%] max-w-6xl">
        <JourneyPath />
      </div>
    </div>
  );
}
