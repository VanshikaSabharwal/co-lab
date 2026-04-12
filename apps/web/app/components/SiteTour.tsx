"use client";

import { useEffect } from "react";
import Shepherd from "shepherd.js";
import "shepherd.js/dist/css/shepherd.css";

const TOUR_KEY = "ko-lab-tour-seen";

export default function SiteTour() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(TOUR_KEY)) return;

    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        cancelIcon: { enabled: true },
        scrollTo: { behavior: "smooth", block: "center" },
        floatingUIOptions: {
          middleware: [],
        },
      },
    });

    tour.addStep({
      id: "welcome",
      text: `<strong>Welcome to Ko-Lab!</strong><br/><br/>
        This quick 3-step tour covers the key features.
        You can skip anytime.`,
      buttons: [
        {
          text: "Skip tour",
          secondary: true,
          action() { tour.cancel(); },
        },
        {
          text: "Let's go →",
          action() { tour.next(); },
        },
      ],
    });

    tour.addStep({
      id: "cta-buttons",
      attachTo: { element: "#tour-cta", on: "bottom" },
      text: `<strong>Jump right in</strong><br/><br/>
        Head to the <em>Chat Room</em>, spin up a new coding group,
        or browse <em>My Groups</em>.`,
      buttons: [
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
      ],
    });

    tour.addStep({
      id: "features",
      attachTo: { element: "#tour-features", on: "top" },
      text: `<strong>Three core features</strong><br/><br/>
        <b>Real-Time Code Editing</b> — collaborate live in a shared editor.<br/>
        <b>One-on-One Chat</b> — private messages with any teammate.<br/>
        <b>Group Chat</b> — a dedicated room per project.`,
      buttons: [
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
      ],
    });

    tour.addStep({
      id: "testimonials",
      attachTo: { element: "#tour-testimonials", on: "top" },
      text: `<strong>Community feedback</strong><br/><br/>
        See what other developers say — and share your own review
        once you've tried Ko-Lab.`,
      buttons: [
        {
          text: "← Back",
          secondary: true,
          action() { tour.back(); },
        },
        {
          text: "Done!",
          action() { tour.complete(); },
        },
      ],
    });

    tour.on("complete", () => localStorage.setItem(TOUR_KEY, "1"));
    tour.on("cancel", () => localStorage.setItem(TOUR_KEY, "1"));

    const timer = setTimeout(() => tour.start(), 800);

    return () => {
      clearTimeout(timer);
      if (tour.isActive()) tour.cancel();
    };
  }, []);

  return null;
}
