/**
 * Microservice Configuration & Contract Definition
 * generator-doc-gost microservice
 */

export interface MicroserviceConfig {
  serviceName: string;
  version: string;
  apiPrefix: string;
  isEmbeddedMode: boolean;
  allowedOrigins: string[];
  features: {
    aiAssistant: boolean;
    autoRegistry: boolean;
    employeeIntegration: boolean;
    pdfExport: boolean;
    excelExport: boolean;
    signatureCanvas: boolean;
  };
}

/**
 * Resolves the dynamic API base URL depending on deployment context (e.g., /docgen/api or /api)
 */
export const getApiBaseUrl = (): string => {
  const metaEnv = (import.meta as unknown as { env?: { BASE_URL?: string } }).env;
  const envBase = (metaEnv?.BASE_URL || '/').replace(/\/$/, '');
  return envBase ? `${envBase}/api` : '/api';
};

export const DEFAULT_MICROSERVICE_CONFIG: MicroserviceConfig = {
  serviceName: 'generator-doc-gost',
  version: '1.0.0',
  apiPrefix: getApiBaseUrl() + '/v1',
  isEmbeddedMode: window.self !== window.top, // Detect if running inside iframe microfrontend
  allowedOrigins: ['*'], // Can be restricted via postMessage handshake
  features: {
    aiAssistant: true,
    autoRegistry: true,
    employeeIntegration: true,
    pdfExport: false,
    excelExport: true,
    signatureCanvas: true,
  },
};
