import { RegisteredDocument } from '../types';

export interface RegistryStats {
  total: number;
  today: number;
  byMonth: { key: string; label: string; count: number }[];
  byDept: { name: string; count: number }[];
  byComposer: { name: string; count: number }[];
  byType: { key: string; label: string; count: number }[];
  avgPerMonth: number;
  lastRegisteredAt: string | null;
}

/** Разбор даты 'DD.MM.YYYY' (или ISO 'YYYY-MM-DD') → {year, month} | null */
const parseDateParts = (dateStr: string): { year: number; month: number } | null => {
  if (!dateStr) return null;
  const s = dateStr.trim();
  const ru = /^(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s);
  if (ru) return { month: Number(ru[2]), year: Number(ru[3]) };
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (iso) return { month: Number(iso[2]), year: Number(iso[1]) };
  return null;
};

const monthLabel = (m: number): string =>
  ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'][m - 1] || String(m);

const monthKey = (y: number, m: number): string => `${y}-${String(m).padStart(2, '0')}`;

const MONTH_KEYS = Array.from({ length: 6 }, (_, i) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - i);
  return { key: monthKey(d.getFullYear(), d.getMonth() + 1), label: `${monthLabel(d.getMonth() + 1)} ${d.getFullYear()}` };
});

/** Определяет тип документа по исходящему номеру: буква отдела (базово) + маска номера. */
const classifyType = (doc: RegisteredDocument): { key: string; label: string } => {
  const num = (doc.regNumber || '').toUpperCase();
  const mask = /^\d{4}\/(\d+)/.exec(num);
  const seq = mask ? Number(mask[1]) : 0;
  if (num.includes('ПР')) return { key: 'prikaz', label: 'Приказы' };
  if (num.includes('И')) return { key: 'notes', label: 'Служебные записки' };
  if (seq >= 200) return { key: 'letters', label: 'Письма' };
  return { key: 'other', label: 'Прочие' };
};

/** Статистика по реестру. Чистая функция — легко тестировать и переиспользовать. */
export const computeRegistryStats = (records: RegisteredDocument[]): RegistryStats => {
  const byMonthMap = new Map<string, number>();
  const byDeptMap = new Map<string, number>();
  const byComposerMap = new Map<string, number>();
  const byTypeMap = new Map<string, number>();
  let lastRegisteredAt: string | null = null;
  const todayStr = new Date().toLocaleDateString('ru-RU');
  let todayCount = 0;

  for (const doc of records) {
    if (doc.date === todayStr) todayCount++;
    // по месяцу регистрации (docs.date — дата документа)
    const parts = parseDateParts(doc.date);
    if (parts) {
      const k = monthKey(parts.year, parts.month);
      byMonthMap.set(k, (byMonthMap.get(k) || 0) + 1);
    }
    const dept = doc.deptName || doc.deptCode || 'Без отдела';
    byDeptMap.set(dept, (byDeptMap.get(dept) || 0) + 1);
    const composer = doc.composerName || 'Не указан';
    byComposerMap.set(composer, (byComposerMap.get(composer) || 0) + 1);
    const t = classifyType(doc);
    byTypeMap.set(t.key, (byTypeMap.get(t.key) || 0) + 1);

    if (doc.registeredAt && (!lastRegisteredAt || doc.registeredAt > lastRegisteredAt)) {
      lastRegisteredAt = doc.registeredAt;
    }
  }

  // Последние 6 месяцев по убыванию, с нулями для пустых
  const byMonth = MONTH_KEYS.map(({ key, label }) => ({
    key,
    label,
    count: byMonthMap.get(key) || 0,
  })).reverse();

  const rowsToSorted = (m: Map<string, number>) =>
    Array.from(m.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ru'));

  const byDept = rowsToSorted(byDeptMap);
  const byComposer = rowsToSorted(byComposerMap).slice(0, 10);
  const byType = Array.from(byTypeMap.entries())
    .map(([key, count]) => ({ key, label: classifyType({ regNumber: key } as RegisteredDocument).label, count }))
    .sort((a, b) => b.count - a.count);

  const monthsWithData = byMonth.filter(m => m.count > 0);
  const avgPerMonth = monthsWithData.length > 0
    ? Math.round((records.length / monthsWithData.length) * 10) / 10
    : 0;

  return {
    total: records.length,
    today: todayCount,
    byMonth,
    byDept,
    byComposer,
    byType,
    avgPerMonth,
    lastRegisteredAt,
  };
};