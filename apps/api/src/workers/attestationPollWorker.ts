import { pollAttestations } from "@/cctp/attestationPoller";

let timer: ReturnType<typeof setInterval> | null = null;

export function startAttestationPollWorker(intervalMs = 5_000): void {
  if (timer) return;
  timer = setInterval(() => {
    pollAttestations().catch((error) => console.error("[cctp] poll tick failed", error));
  }, intervalMs);
}

export function stopAttestationPollWorker(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
