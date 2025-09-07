import { WorkerRPC } from './rpc.js';
import type { HelvaultLoadedResponse } from './types.js';
import type { InventoryItem, InventoryAggregate } from '@bag-of-holding/core';

/**
 * High-level client for Helvault SQLite operations
 * Provides the openHelvault API mentioned in the issue
 */
export class HelvaultClient {
  private rpc: WorkerRPC;

  constructor(worker: Worker) {
    this.rpc = new WorkerRPC(worker);
  }

  /**
   * Open a Helvault .helvault file and parse it
   * @param buffer ArrayBuffer of the .helvault SQLite file
   * @returns Promise resolving to inventory rows and aggregates
   */
  async openHelvault(buffer: ArrayBuffer): Promise<{
    inventoryRows: InventoryItem[];
    aggregates: InventoryAggregate[];
  }> {
    const response = await this.rpc.call<HelvaultLoadedResponse['payload']>('load-helvault', {
      file: buffer
    });

    return {
      inventoryRows: response.inventoryRows,
      aggregates: response.aggregates
    };
  }

  /**
   * Terminate the worker
   */
  terminate() {
    this.rpc.terminate();
  }
}

/**
 * Create a new Helvault worker and client
 * @param workerUrl URL to the SQLite worker script
 * @returns HelvaultClient instance
 */
export function createHelvaultClient(workerUrl: string): HelvaultClient {
  const worker = new Worker(workerUrl); // Remove module type to allow importScripts
  return new HelvaultClient(worker);
}