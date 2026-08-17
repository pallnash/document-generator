/**
 * React Hook for Microservice PostMessage Communication
 */

import { useEffect } from 'react';
import { microserviceBridge, MicroserviceIncomingMessage } from '../services/microserviceBridge';
import { DocumentData } from '../types';

interface UseMicroserviceBridgeOptions {
  onInitDocument?: (data: Partial<DocumentData>) => void;
  onRegisterDocumentRequest?: () => void;
  onGetDocumentRequest?: () => DocumentData;
}

export function useMicroserviceBridge(options: UseMicroserviceBridgeOptions) {
  useEffect(() => {
    const unsubscribe = microserviceBridge.subscribe((message: MicroserviceIncomingMessage) => {
      switch (message.type) {
        case 'INIT_DOCUMENT':
          if (message.payload && options.onInitDocument) {
            options.onInitDocument(message.payload);
            microserviceBridge.emit('DOCUMENT_CHANGED', message.payload, message.requestId);
          }
          break;

        case 'REGISTER_DOCUMENT':
          if (options.onRegisterDocumentRequest) {
            options.onRegisterDocumentRequest();
          }
          break;

        case 'GET_DOCUMENT':
          if (options.onGetDocumentRequest) {
            const currentDoc = options.onGetDocumentRequest();
            microserviceBridge.emit('DOCUMENT_CHANGED', currentDoc, message.requestId);
          }
          break;

        case 'PING':
          microserviceBridge.emit('PONG', { status: 'active', timestamp: new Date().toISOString() }, message.requestId);
          break;

        default:
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [options]);
}
