import "dotenv/config";

function optional(name: string): string | undefined {
  return process.env[name];
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  firebase: {
    projectId: optional("FIREBASE_PROJECT_ID"),
    clientEmail: optional("FIREBASE_CLIENT_EMAIL"),
    privateKey: optional("FIREBASE_PRIVATE_KEY")?.replace(/\\n/g, "\n"),
  },
} as const;
