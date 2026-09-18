import { createServer } from "vite";

let server;
try {
  server = await createServer({
    appType: "custom",
    configFile: false,
    resolve: { tsconfigPaths: true },
    server: { middlewareMode: true },
  });
  const { seedDemo } = await server.ssrLoadModule("/scripts/seed-demo.ts");
  await seedDemo();
  console.log("Demo seed completed for public board /p/demo.");
} catch {
  console.error("Demo seed failed. Check the explicit seed environment and existing demo ownership.");
  process.exitCode = 1;
} finally {
  await server?.close();
}
