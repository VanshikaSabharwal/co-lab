import db from "@repo/db/client";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import bcrypt from "bcrypt";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import { NextAuthOptions } from "next-auth";

const credentialsSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must be less than 50 characters long"),

  email: z.string().email("Invalid email address").min(1, "Email is required"),

  password: z
    .string()
    .min(6, "Password must be at least 6 characters long")
    .max(100, "Password must be less than 100 characters long"),

  phone: z
    .string()
    .regex(/^[0-9]{10}$/, "Phone number must be exactly 10 digits")
    .optional(),
});

// next auth config
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        name: {
          label: "Name",
          type: "text",
          placeholder: "Enter your name",
          required: true,
        },
        email: {
          label: "Email",
          type: "email",
          placeholder: "Enter your email",
          required: true,
        },
        phone: {
          label: "Phone",
          type: "text",
          placeholder: "Enter your Number",
          required: true,
        },
        password: {
          label: "Password",
          type: "password",
          placeholder: "Enter your password",
          required: true,
        },
      },
      async authorize(credentials) {
        try {
          if (!credentials) {
            throw new Error("No credntials provided");
          }

          // validate credntials using zod
          const parsedCredentials = credentialsSchema.safeParse(credentials);
          if (!parsedCredentials.success) {
            throw new Error("Invalid Credentials");
          }

          const { name, email, phone, password } = parsedCredentials.data;
          const hashedPassword = await bcrypt.hash(password, 10);
          const existingUser = await db.user.findFirst({
            where: {
              email,
            },
          });

          if (existingUser) {
            const passwordValidation = await bcrypt.compare(
              password,
              existingUser.password
            );
            if (passwordValidation) {
              return {
                id: existingUser?.id.toString(),
                name: existingUser?.username,
                phone: existingUser?.phone,
                email: existingUser?.email,
              };
            } else {
              throw new Error("User does not exist. Please Sign Up");
            }
          }

          return null;
        } catch (error) {
          console.error("Authorization error", error);
          return null;
        }
      },
    }),
  ],
  secret: process.env.JWT_SECRET,
  callbacks: {
    async session({ token, session }: { token: JWT; session: Session }) {
      if (session.user) {
        session.user.id = token.sub as string;
      }
      return session;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
  },
};
