import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import jwt from "jsonwebtoken";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_local_dev_change_in_prod",
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // @ts-ignore
        session.user.id = token.id || token.sub;
        
        // Generate a standard JWS to send to FastAPI backend
        const encodedToken = jwt.sign(
          { sub: token.id || token.sub, email: session.user.email },
          process.env.NEXTAUTH_SECRET || "fallback_secret_for_local_dev_change_in_prod",
          { algorithm: "HS256" }
        );
        // @ts-ignore
        session.accessToken = encodedToken;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export const GET = (req: any, res: any) => handler(req, res);
export const POST = (req: any, res: any) => handler(req, res);
