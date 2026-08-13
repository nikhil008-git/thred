import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@repo/db";

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [
        process.env.BETTER_AUTH_URL,
        process.env.FRONTEND_ORIGIN,
    ].filter((origin): origin is string => Boolean(origin)),
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
    },
});
