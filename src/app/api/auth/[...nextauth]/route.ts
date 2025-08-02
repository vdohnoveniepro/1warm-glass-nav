import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { cookies } from "next/headers";
import { authenticateUser, updateLastLogin } from "@/lib/auth";
import { usersAPI } from "@/lib/api";
import { NextAuthOptions } from "next-auth";

/**
 * Настройка NextAuth с провайдерами для аутентификации
 */
export const authOptions: NextAuthOptions = {
  providers: [
    // Google провайдер
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "395765096031-rp54n8fj9kt39s85al83cc89gl39t0h7.apps.googleusercontent.com",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "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",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          firstName: profile.given_name,
          lastName: profile.family_name,
          email: profile.email,
          image: profile.picture,
          role: "user"
        };
      },
    }),
    
    // Credentials провайдер для стандартной авторизации
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        try {
          // Используем существующую функцию аутентификации
          const result = await authenticateUser(
            credentials.email,
            credentials.password
          );
          
          if (!result) {
            return null;
          }
          
          const { user } = result;
          
          // Обновляем lastLogin для пользователя
          updateLastLogin(user.id);
          
          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            specialistId: user.specialistId || null,
          };
        } catch (error) {
          console.error("Ошибка при авторизации:", error);
          return null;
        }
      }
    }),
  ],
  
  callbacks: {
    async jwt({ token, user, account }) {
      console.log('[NextAuth] JWT Callback:', { 
        hasToken: !!token, 
        hasUser: !!user, 
        hasAccount: !!account,
        tokenUserId: token?.id,
        userId: user?.id
      });
      
      // Если есть объект пользователя, добавляем его данные в токен
      if (user) {
        console.log('[NextAuth] Добавление данных пользователя в токен:', user);
        token.id = user.id;
        token.role = user.role;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.photo = user.photo;
        token.email = user.email;
        token.phone = user.phone;
      }
      
      console.log('[NextAuth] Итоговый токен:', token);
      return token;
    },
    
    async session({ session, token }) {
      console.log('[NextAuth] Session Callback:', { 
        hasSession: !!session, 
        hasToken: !!token,
        tokenId: token?.id
      });
      
      // Добавляем данные из токена в объект сессии
      if (token && session.user) {
        console.log('[NextAuth] Добавление данных из токена в сессию');
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.photo = token.photo as string;
        session.user.email = token.email as string;
        session.user.phone = token.phone as string;
      }
      
      console.log('[NextAuth] Итоговая сессия:', session);
      return session;
    },
  },
  
  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/login",
  },
  
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 дней
  },
  
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 // 7 дней
      }
    }
  },
  
  secret: process.env.NEXTAUTH_SECRET || "default_nextauth_secret",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };