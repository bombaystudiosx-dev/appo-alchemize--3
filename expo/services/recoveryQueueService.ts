export interface RecoveryQueueItem {
  id: string;
  scope: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

const inMemoryQueue: RecoveryQueueItem[] = [];

export function enqueueRecoveryItem(item: RecoveryQueueItem) {
  inMemoryQueue.push(item);
}

export function listRecoveryItems() {
  return [...inMemoryQueue];
}

export function removeRecoveryItem(id: string) {
  const index = inMemoryQueue.findIndex((item) => item.id === id);

  if (index >= 0) {
    inMemoryQueue.splice(index, 1);
  }
}

export function clearRecoveryQueue() {
  inMemoryQueue.length = 0;
}
