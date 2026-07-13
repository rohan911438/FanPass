import { createApp } from "@/app";
import { env } from "@/config/env";
import { startAttestationPollWorker } from "@/workers/attestationPollWorker";

const app = createApp();

app.listen(env.port, () => {
  console.log(`FanPass API listening on http://localhost:${env.port}`);
  startAttestationPollWorker();
});
