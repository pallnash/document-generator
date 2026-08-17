import { describe, it, expect } from 'vitest';
import { computeRegistryStats } from './registryStats';
import type { RegisteredDocument } from '../types';

const mkDoc = (overrides: Partial<RegisteredDocument>): RegisteredDocument => ({
  id: 'r-' + Math.random().toString(36).slice(2, 8),
  regNumber: '1408/1И',
  date: '14.08.2026',
  seq: 1,
  deptCode: 'И',
  deptName: 'ИТ, автоматика, ПО',
  composerName: 'Орлов Д.С.',
  composerDept: 'Бюро автоматики',
  recipientName: 'Начальнику бюро',
  subject: 'Служебная записка',
  registeredAt: '14.08.2026, 11:30',
  registeredByRole: 'admin',
  ...overrides,
});

describe('computeRegistryStats', () => {
  it('пустой реестр — нулевая статистика', () => {
    const s = computeRegistryStats([]);
    expect(s.total).toBe(0);
    expect(s.byDept).toEqual([]);
    expect(s.byComposer).toEqual([]);
    expect(s.avgPerMonth).toBe(0);
    expect(s.lastRegisteredAt).toBeNull();
  });

  it('total = числу записей', () => {
    const s = computeRegistryStats([mkDoc({}), mkDoc({}), mkDoc({})]);
    expect(s.total).toBe(3);
  });

  it('today: документы с датой = сегодня учитываются', () => {
    const today = new Date().toLocaleDateString('ru-RU');
    const s = computeRegistryStats([
      mkDoc({ date: today }),
      mkDoc({ date: today }),
      mkDoc({ date: '01.01.2000' }),
    ]);
    expect(s.total).toBe(3);
    expect(s.today).toBe(2);
  });

  it('группировка по отделам', () => {
    const s = computeRegistryStats([
      mkDoc({ deptName: 'ИТ, автоматика, ПО' }),
      mkDoc({ deptName: 'ИТ, автоматика, ПО' }),
      mkDoc({ deptName: 'Производство' }),
    ]);
    const it = s.byDept.find(d => d.name === 'ИТ, автоматика, ПО');
    expect(it?.count).toBe(2);
    expect(s.byDept.length).toBe(2);
  });

  it('топ-составители отсортированы по убыванию', () => {
    const s = computeRegistryStats([
      mkDoc({ composerName: 'Орлов Д.С.' }),
      mkDoc({ composerName: 'Орлов Д.С.' }),
      mkDoc({ composerName: 'Кузнецов В.А.' }),
      mkDoc({ composerName: 'Кузнецов В.А.' }),
      mkDoc({ composerName: 'Кузнецов В.А.' }),
    ]);
    expect(s.byComposer[0].name).toBe('Кузнецов В.А.');
    expect(s.byComposer[0].count).toBe(3);
  });

  it('по месяцам: даты в ru-формате группируются по месяцу', () => {
    const s = computeRegistryStats([
      mkDoc({ date: '14.08.2026' }),
      mkDoc({ date: '03.08.2026' }),
      mkDoc({ date: '21.07.2026' }),
    ]);
    const aug = s.byMonth.find(m => m.key === '2026-08');
    const jul = s.byMonth.find(m => m.key === '2026-07');
    expect(aug?.count).toBe(2);
    expect(jul?.count).toBe(1);
  });

  it('ISO-даты тоже распознаются', () => {
    const s = computeRegistryStats([mkDoc({ date: '2026-08-14' })]);
    expect(s.byMonth.find(m => m.key === '2026-08')?.count).toBe(1);
  });

  it('битые даты не ломают подсчёт', () => {
    const s = computeRegistryStats([
      mkDoc({ date: 'не-дата' }),
      mkDoc({ date: '' }),
      mkDoc({ date: '14.08.2026' }),
    ]);
    expect(s.total).toBe(3);
    expect(s.byMonth.some(m => m.count > 0)).toBe(true);
  });

  it('byType: номера с /И — служебные записки', () => {
    const s = computeRegistryStats([mkDoc({ regNumber: '1408/1И' }), mkDoc({ regNumber: '1408/2И' })]);
    expect(s.byType.find(t => t.key === 'notes')?.count).toBe(2);
  });

  it('avgPerMonth считается по месяцам с данными', () => {
    const s = computeRegistryStats([
      mkDoc({ date: '14.08.2026' }),
      mkDoc({ date: '03.08.2026' }),
      mkDoc({ date: '21.07.2026' }),
    ]);
    // 3 записи в 2 месяцах с данными → 1.5
    expect(s.avgPerMonth).toBe(1.5);
  });

  it('lastRegisteredAt — максимальный registeredAt', () => {
    const s = computeRegistryStats([
      mkDoc({ registeredAt: '01.08.2026, 09:00' }),
      mkDoc({ registeredAt: '14.08.2026, 11:30' }),
    ]);
    expect(s.lastRegisteredAt).toBe('14.08.2026, 11:30');
  });
});