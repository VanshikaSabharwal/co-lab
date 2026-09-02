"use client";

import { useEffect, useState } from "react";

/**
 * True when the primary input is a coarse pointer (finger/stylus) rather than a
 * mouse. Used to widen hit targets — connection radius, handle sizes — where a
 * fingertip needs far more slack than a cursor.
 *
 * Starts false so server and first client render agree, then corrects after
 * mount.
 */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setCoarse(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setCoarse(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return coarse;
}
