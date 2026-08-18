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

export const TEPLOMASH_EMPLOYEES: TeplomashEmployee[] = [
  {
    id: 'emp-tt-head',
    fullName: 'Иванов Алексей Сергеевич',
    shortName: 'Иванов А.С.',
    dativeName: 'Иванову Алексею Сергеевичу',
    position: 'Начальник отдела цифровых технологий и автоматизации',
    dativePosition: 'Начальнику отдела цифровых технологий и автоматизации',
    department: 'Отдел цифровых технологий и автоматизации',
    organization: 'АО «НПО «Тепломаш»',
    email: 'ivanov.as@teplomash.ru',
    phone: '301-99-40 (доб. 241)'
  },
  {
    id: 'emp-tt-dev',
    fullName: 'Козлов Дмитрий Павлович',
    shortName: 'Козлов Д.П.',
    dativeName: 'Козлову Дмитрию Павловичу',
    position: 'Программист приложений',
    dativePosition: 'Программисту приложений',
    department: 'Отдел цифровых технологий и автоматизации',
    organization: 'АО «НПО «Тепломаш»',
    email: 'kozlov.dp@teplomash.ru',
    phone: '301-99-40 (доб. 242)'
  }
];
