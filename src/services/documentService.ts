/**
 * Document Service
 * Centralized business logic layer for document creation, validation,
 * registry management, and microservice REST API communication.
 */

import { DocumentData, RegisteredDocument } from '../types';
import { getDocumentRegistry, registerDocumentInDb, deleteRegisteredDocumentFromDb, clearDocumentRegistryDb } from '../constants/departmentCodes';

export class DocumentService {
  /**
   * Fetches the official document registry.
   */
  public static async getRegistry(): Promise<RegisteredDocument[]> {
    try {
      // Try local store first or API fallback
      return getDocumentRegistry();
    } catch (err) {
      console.error('Failed to fetch registry:', err);
      return [];
    }
  }

  /**
   * Registers/publishes a new document into the official registry with unique number allocation.
   */
  public static async registerDocument(params: {
    dateStr: string;
    deptCode: string;
    composerName: string;
    composerDept: string;
    recipientName: string;
    subject: string;
    role: 'admin' | 'user';
  }): Promise<{ registeredDoc: RegisteredDocument; wasAdjustedForUniqueness: boolean }> {
    return registerDocumentInDb(params);
  }

  /**
   * Deletes a document from the registry (Admin authorized).
   */
  public static async deleteDocument(docId: string): Promise<boolean> {
    try {
      deleteRegisteredDocumentFromDb(docId);
      return true;
    } catch (err) {
      console.error('Failed to delete registered document:', err);
      return false;
    }
  }

  /**
   * Clears entire registry (Admin authorized).
   */
  public static async clearRegistry(): Promise<boolean> {
    try {
      clearDocumentRegistryDb();
      return true;
    } catch (err) {
      console.error('Failed to clear registry:', err);
      return false;
    }
  }
}
