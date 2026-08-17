/**
 * Employee Service
 * Business logic layer for employee search, department lookup, and
 * automatic department code resolution for microservice integrations.
 */

import { TEPLOMASH_EMPLOYEES, TeplomashEmployee } from '../constants/teplomashEmployees';
import { DEPARTMENT_CODES, guessDepartmentCode } from '../constants/departmentCodes';

const EMPLOYEES_KEY = 'teplomash_employees_db';

export class EmployeeService {
  /**
   * Helper to fetch current employee database from localStorage or fall back to default
   */
  public static getStoredEmployees(): TeplomashEmployee[] {
    try {
      const saved = localStorage.getItem(EMPLOYEES_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return TEPLOMASH_EMPLOYEES;
  }

  /**
   * Search employees by query string (name, position, department)
   */
  public static searchEmployees(query: string): TeplomashEmployee[] {
    const list = this.getStoredEmployees();
    if (!query.trim()) return list;
    const lower = query.toLowerCase();
    return list.filter(
      (emp) =>
        emp.fullName.toLowerCase().includes(lower) ||
        emp.position.toLowerCase().includes(lower) ||
        emp.department.toLowerCase().includes(lower)
    );
  }

  /**
   * Resolve department code automatically based on department name and position.
   */
  public static resolveDepartmentCode(department: string, position: string): string {
    return guessDepartmentCode(department, position);
  }

  /**
   * Get all registered department codes with names and descriptions.
   */
  public static getDepartmentCodes() {
    return DEPARTMENT_CODES;
  }

  /**
   * Find a specific employee by name or position.
   */
  public static findEmployee(fullNameOrPosition: string): TeplomashEmployee | undefined {
    const list = this.getStoredEmployees();
    const lower = fullNameOrPosition.toLowerCase();
    return list.find(
      emp => emp.fullName.toLowerCase().includes(lower) || emp.position.toLowerCase().includes(lower)
    );
  }
}
