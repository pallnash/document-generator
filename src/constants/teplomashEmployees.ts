export interface TeplomashEmployee {
  id: string;
  fullName: string;
  shortName: string;
  dativeName: string;
  position: string;
  dativePosition: string;
  department: string;
  organization: string;
  email: string;
  phone: string;
}

export function sanitizeEmployeeDepartments(employees: TeplomashEmployee[]): TeplomashEmployee[] {
  return employees.map(emp => ({
    ...emp,
    department: emp.department ? emp.department.trim() : '',
    organization: emp.organization ? emp.organization.trim() : 'АО «НПО «Тепломаш»'
  }));
}

export const TEPLOMASH_EMPLOYEES: TeplomashEmployee[] = [];
