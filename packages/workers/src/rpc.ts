import type { 
  AnyWorkerResponse, 
  WorkerMessage 
} from './types.js';

/**
 * RPC client for communicating with Web Workers
 * Provides promise-based interface over postMessage/onmessage
 */
export class WorkerRPC {
  private worker: Worker;
  private pendingRequests = new Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }>();

  constructor(worker: Worker) {
    this.worker = worker;
    this.worker.onmessage = this.handleMessage.bind(this);
    this.worker.onerror = this.handleError.bind(this);
  }

  private handleMessage(event: MessageEvent<AnyWorkerResponse>) {
    const response = event.data;
    const pending = this.pendingRequests.get(response.id);
    
    if (!pending) {
      console.warn('Received response for unknown request:', response.id);
      return;
    }

    this.pendingRequests.delete(response.id);

    if (response.error) {
      pending.reject(new Error(response.error));
    } else {
      pending.resolve(response.payload);
    }
  }

  private handleError(error: ErrorEvent) {
    console.error('Worker error:', error);
    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests.entries()) {
      pending.reject(new Error(`Worker error: ${error.message}`));
      this.pendingRequests.delete(id);
    }
  }

  /**
   * Send a message to the worker and wait for response
   */
  call<T = unknown>(type: string, payload?: unknown): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = this.generateId();
      const message: WorkerMessage = { id, type, payload };
      
      this.pendingRequests.set(id, { 
        resolve: (value: unknown) => resolve(value as T), 
        reject 
      });
      this.worker.postMessage(message);
    });
  }

  /**
   * Terminate the worker and cleanup
   */
  terminate() {
    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests.entries()) {
      pending.reject(new Error('Worker terminated'));
      this.pendingRequests.delete(id);
    }
    
    this.worker.terminate();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}