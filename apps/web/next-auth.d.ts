import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      phone?: string; // Add phone field
    };
  }

  interface User {
    id: string;
    email: string;
    phone?: string; // Add phone field
  }
}
