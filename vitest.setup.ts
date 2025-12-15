const env = process.env as unknown as Record<string, string | undefined>;

env.NODE_ENV = "test";
env.DATABASE_URL ??= "file:./dev-test.db";
