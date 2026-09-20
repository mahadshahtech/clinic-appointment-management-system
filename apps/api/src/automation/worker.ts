import "dotenv/config";

import { createDoctorAppointmentService } from "../appointments/doctor-database-service.js";
import { loadDatabaseEnvironment } from "../config/database-env.js";
import { createDatabase } from "../db/client.js";
import { safeOperationalError } from "../http/safe-error.js";
import { loadAutomationEnvironment } from "./config.js";
import { runAutomationCycle } from "./cycle.js";
import { createConsoleDelivery, createN8nDelivery } from "./delivery.js";
import { createAutomationService } from "./service.js";

const environment = loadAutomationEnvironment();
console.info("Automation worker configured", {
  deliveryMode: environment.EMAIL_DELIVERY_MODE,
  webhookConfigured: Boolean(environment.N8N_EMAIL_WEBHOOK_URL),
  webhookHost: environment.N8N_EMAIL_WEBHOOK_URL ? new URL(environment.N8N_EMAIL_WEBHOOK_URL).host : undefined,
});

const connection = createDatabase(loadDatabaseEnvironment());
const doctor = createDoctorAppointmentService(connection.db);
const delivery = environment.EMAIL_DELIVERY_MODE === "n8n"
  ? createN8nDelivery(environment.N8N_EMAIL_WEBHOOK_URL!, environment.N8N_WEBHOOK_SECRET!)
  : createConsoleDelivery();
const automation = createAutomationService(connection.db, doctor, delivery, {
  batchSize: environment.AUTOMATION_BATCH_SIZE,
});

let running = false;
async function tick() {
  if (running) return;
  running = true;
  try {
    console.info("Automation cycle completed", await runAutomationCycle(automation));
  } catch (error) {
    console.error("Automation cycle failed", safeOperationalError(error));
  } finally {
    running = false;
  }
}

await tick();
if (environment.AUTOMATION_RUN_ONCE === "true") {
  await connection.close();
} else {
  const timer = setInterval(tick, environment.AUTOMATION_POLL_INTERVAL_MS);
  async function stop() {
    clearInterval(timer);
    await connection.close();
    process.exit(0);
  }
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
