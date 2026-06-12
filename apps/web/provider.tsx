"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { CallProvider } from "./app/components/call/CallProvider";
import CallUI from "./app/components/call/CallUI";

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <SessionProvider>
        <CallProvider>
          {children}
          <CallUI />
        </CallProvider>
      </SessionProvider>
    </ThemeProvider>
  );
};
