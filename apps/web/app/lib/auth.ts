import prisma from "../lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
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
          if (!credentials) throw new Error("No credentials provided");

          const parsedCredentials = credentialsSchema.safeParse(credentials);
          if (!parsedCredentials.success)
            throw new Error("Invalid Credentials");

          const { name, email, phone, password } = parsedCredentials.data;

          const existingUser = await prisma.user.findUnique({
            where: { email },
          });

          if (existingUser) {
            const passwordValidation = await bcrypt.compare(
              password,
              existingUser.password
            );
            if (!passwordValidation)
              throw new Error("Incorrect password. Please try again.");

            return {
              id: existingUser.id.toString(),
              name: existingUser.username,
              phone: existingUser.phone || "",
              email: existingUser.email,
              image: existingUser.image || "",
            };
          }

          const hashedPassword = await bcrypt.hash(password, 10);
          const newUser = await prisma.user.create({
            data: {
              username: name,
              email,
              phone: phone || "",
              password: hashedPassword,
              image: "",
            },
          });

          return {
            id: newUser.id.toString(),
            name: newUser.username,
            phone: newUser.phone || "",
            email: newUser.email,
            image: newUser.image || "",
          };
        } catch (error) {
          console.error("Authorization error", error);
          throw new Error("Internal error");
        }
      },
    }),

    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      authorization: { params: { scope: "repo" } },
      async profile(profile, tokens) {
        console.log("GitHub profile:", profile);
        console.log("GitHub tokens:", tokens); // Log tokens
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
          accessToken: tokens.access_token, // Ensure access token is available here
        };
      },
    }),
  ],

  secret: process.env.JWT_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.phone = user.phone;
        token.name = user.name;
        token.image = user.image;
        token.accessToken = user.githubAccessToken; // Ensure this is being set
      }
      return token;
    },

    async session({ token, session }: { token: JWT; session: Session }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.phone = token.phone as string;
        session.user.name = token.name as string;
        session.user.image = token.image as string;
        session.user.githubAccessToken = token.accessToken as string; // Include access token
      }
      return session;
    },
  },
};
