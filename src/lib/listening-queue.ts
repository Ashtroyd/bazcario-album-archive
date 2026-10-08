export type QueueStatus = "want" | "listening";
export type ListeningStage = QueueStatus | "rated";
export const QUEUE_LABELS = { want: "Want to listen", listening: "Listening", rated: "Rated" } as const;
export function isQueueStatus(value: unknown): value is QueueStatus { return value === "want" || value === "listening"; }
export function listeningStage(status: QueueStatus | null, score: number | string | null | undefined): ListeningStage | null {
  if (score != null && score !== "" && Number.isFinite(Number(score)) && Number(score) >= 0 && Number(score) <= 10) return "rated";
  return status;
}
