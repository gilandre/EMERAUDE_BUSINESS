import { Queue } from "bullmq";
import redis from "@/lib/redis";

const QUEUE_NAME = "alertes";

let alertQueue: Queue | null = null;

export interface AlertJobPayload {
  eventCode: string;
  alerteCode: string;
  context: Record<string, unknown>;
  inAppUserId?: string;
}

export function getAlertQueue(): Queue<AlertJobPayload> {
  if (!alertQueue) {
    alertQueue = new Queue<AlertJobPayload>(QUEUE_NAME, {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 1000 },
      },
    });
  }
  return alertQueue;
}

export const ALERT_QUEUE_NAME = QUEUE_NAME;
