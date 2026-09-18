import { createServer } from "vite";

let server;
try {
  server = await createServer({
    appType: "custom",
    configFile: false,
    resolve: { tsconfigPaths: true },
    server: { middlewareMode: true },
  });
  const { migrateTestDatabase } = await server.ssrLoadModule("/scripts/migrate-test.ts");
  await migrateTestDatabase();
  console.log("Test database migrations completed.");
} catch {
  console.error("Test database migration failed. Check the explicit test database environment.");
  process.exitCode = 1;
} finally {
  await server?.close();
}
