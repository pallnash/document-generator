/**
 * Microservice PostMessage & Event Bridge
 * Enables parent host applications (microfrontend containers, portals, CRM/1C)
 * to communicate seamlessly with this GOST Document Generator microservice.
 */

import { DocumentData, RegisteredDocument } from '../types';

export type MicroserviceMessageType =
  | 'INIT_DOCUMENT'
  | 'GET_DOCUMENT'
  | 'REGISTER_DOCUMENT'
  | 'GET_REGISTRY'
  | 'SET_CONFIG'
  | 'EXPORT_PDF'
  | 'PING'
  | 'RETURN_TO_PORTAL';

export type MicroserviceEventType =
  | 'MICROSERVICE_READY'
  | 'DOCUMENT_CHANGED'
  | 'DOCUMENT_REGISTERED'
  | 'REGISTRY_UPDATED'
  | 'RETURN_TO_PORTAL'
  | 'ERROR'
  | 'PONG';

export interface MicroserviceIncomingMessage {
  type: MicroserviceMessageType;
  requestId?: string;
  payload?: any;
}

export interface MicroserviceOutgoingEvent {
  service: 'generator-doc-gost';
  type: MicroserviceEventType;
  requestId?: string;
  payload?: any;
  timestamp: string;
}

type MessageHandler = (message: MicroserviceIncomingMessage, origin: string) => void;

class MicroserviceBridgeService {
  private listeners: MessageHandler[] = [];
  private isInitialized = false;

  constructor() {
    this.initListener();
  }

  private initListener() {
    if (typeof window === 'undefined' || this.isInitialized) return;

    window.addEventListener('message', (event) => {
      // Validate incoming data structure
      if (!event.data || typeof event.data !== 'object') return;
      const data = event.data as MicroserviceIncomingMessage;

      if (!data.type) return;

      this.listeners.forEach((handler) => handler(data, event.origin));
    });

    this.isInitialized = true;

    // Send READY signal to parent frame if running inside iframe
    if (window.self !== window.top) {
      this.emit('MICROSERVICE_READY', {
        status: 'initialized',
        capabilities: ['document_generation', 'gost_preview', 'auto_registry', 'ai_assistant'],
      });
    }
  }

  public subscribe(handler: MessageHandler) {
    this.listeners.push(handler);
    return () => {
      this.listeners = this.listeners.filter((h) => h !== handler);
    };
  }

  public emit(type: MicroserviceEventType, payload?: any, requestId?: string) {
    if (typeof window === 'undefined') return;

    const eventData: MicroserviceOutgoingEvent = {
      service: 'generator-doc-gost',
      type,
      requestId,
      payload,
      timestamp: new Date().toISOString(),
    };

    // If running in iframe, post to parent window
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(eventData, '*');
    }

    // Also dispatch as custom window event for same-page microfrontend embedding
    window.dispatchEvent(
      new CustomEvent('generator-doc-gost:event', { detail: eventData })
    );
  }
}

export const microserviceBridge = new MicroserviceBridgeService();
