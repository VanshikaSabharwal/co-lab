"use client";

import { useEffect } from "react";
import Shepherd from "shepherd.js";
import "shepherd.js/dist/css/shepherd.css";

export interface TourStep {
  id: string;
  text: string;
  attachTo?: { element: string; on: "top" | "bottom" | "left" | "right" };
}

interface PageTourProps {
  storageKey: string;
  steps: TourStep[];
  delay?: number;
}

const navButtons = (tour: Shepherd.Tour) => [
  {
    text: "Skip",
    secondary: true,
    action() { tour.cancel(); },
  },
  {
    text: "← Back",
    secondary: true,
    action() { tour.back(); },
  },
  {
    text: "Next →",
    action() { tour.next(); },
  },
];

export default function PageTour({ storageKey, steps, delay = 600 }: PageTourProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(storageKey)) return;
    if (!steps.length) return;

    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        cancelIcon: { enabled: true },
        scrollTo: { behavior: "smooth", block: "center" },
        floatingUIOptions: { middleware: [] },
      },
    });

    steps.forEach((step, i) => {
      const isFirst = i === 0;
      const isLast = i === steps.length - 1;

      tour.addStep({
        id: step.id,
        text: step.text,
        ...(step.attachTo ? { attachTo: step.attachTo } : {}),
        buttons: isFirst
          ? [
              {
                text: "Skip tour",
                secondary: true,
                action() { tour.cancel(); },
              },
              {
                text: "Let's go →",
                action() { tour.next(); },
              },
            ]
          : isLast
          ? [
              {
                text: "← Back",
                secondary: true,
                action() { tour.back(); },
              },
              {
                text: "Done!",
                action() { tour.complete(); },
              },
            ]
          : navButtons(tour),
      });
    });

    tour.on("complete", () => localStorage.setItem(storageKey, "1"));
    tour.on("cancel", () => localStorage.setItem(storageKey, "1"));

    const timer = setTimeout(() => tour.start(), delay);
    return () => {
      clearTimeout(timer);
      if (tour.isActive()) tour.cancel();
    };
  }, []);

  return null;
}
