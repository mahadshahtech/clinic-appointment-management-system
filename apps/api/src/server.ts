import { safeOperationalError } from "./http/safe-error.js";
import { app, database, environment } from "./runtime.js";

const server = app.listen(environment.PORT, () => {
  console.info(`NFC API listening on http://localhost:${environment.PORT}`);
});

function shutdown(signal: string) {
  console.info(`${signal} received; closing HTTP server.`);
  server.close(async (error) => {
    await database.close();
    if (error) {
      console.error("HTTP server shutdown failed", safeOperationalError(error));
      process.exitCode = 1;
    }
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
