import type { HelvaultExport, InventoryItem, InventoryAggregate } from '@bag-of-holding/core';

// Message types for communication with the worker
export interface WorkerMessage {
  id: string;
  type: string;
  payload?: unknown;
}

export interface WorkerResponse {
  id: string;
  type: string;
  payload?: unknown;
  error?: string;
}

// SQLite Worker message types
export interface LoadHelvaultMessage extends WorkerMessage {
  type: 'load-helvault';
  payload: {
    file: ArrayBuffer;
  };
}

export interface QueryCardsMessage extends WorkerMessage {
  type: 'query-cards';
  payload: {
    filters?: {
      set?: string;
      name?: string;
      colors?: string[];
      types?: string[];
    };
    limit?: number;
    offset?: number;
  };
}

export interface QueryInventoryMessage extends WorkerMessage {
  type: 'query-inventory';
  payload: {
    collectionId?: string;
  };
}

// Response types
export interface HelvaultLoadedResponse extends WorkerResponse {
  type: 'helvault-loaded';
  payload: {
    inventoryRows: InventoryItem[];
    aggregates: InventoryAggregate[];
    collections: number;
    cards: number;
  };
}

export interface CardsQueryResponse extends WorkerResponse {
  type: 'cards-query-result';
  payload: {
    cards: HelvaultExport['cards'];
    total: number;
  };
}

export interface InventoryQueryResponse extends WorkerResponse {
  type: 'inventory-query-result';
  payload: {
    inventory: HelvaultExport['inventory'];
  };
}

export type AnyWorkerMessage = 
  | LoadHelvaultMessage 
  | QueryCardsMessage 
  | QueryInventoryMessage;

export type AnyWorkerResponse = 
  | HelvaultLoadedResponse 
  | CardsQueryResponse 
  | InventoryQueryResponse;