
import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";

const app = express();
const port = Number(process.env.PORT ?? 8080);
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
const authUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

type AuthenticatedRequest = Request & {
    user?: { id: string; email: string; name: string };
};

app.use(express.json());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", frontendOrigin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
});

/** Validates the Better Auth session cookie before protected API handlers run. */
async function requireAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
) {
    try {
        const sessionResponse = await fetch(`${authUrl}/api/auth/get-session`, {
            headers: req.headers.cookie ? { cookie: req.headers.cookie } : {},
        });
        const session = (await sessionResponse.json()) as {
            user?: { id: string; email: string; name: string };
        } | null;

        if (!sessionResponse.ok || !session?.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        req.user = session.user;
        next();
    } catch (error) {
        next(error);
    }
}

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.get("/api/me", requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.user });
});

app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`);
});
