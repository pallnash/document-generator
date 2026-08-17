import { describe, it, expect } from 'vitest';
import {
  fnv1a64Hex,
  GENESIS_HASH,
  rechainRegistry,
  verifyRegistryIntegrity,
} from './departmentCodes';
import type { RegisteredDocument } from '../types';

const mkDoc = (overrides: Partial<RegisteredDocument>): RegisteredDocument => ({
  id: 'test-' + Math.random().toString(36).slice(2),
  regNumber: 'Д-1',
  date: '14.08.2026',
  seq: 1,
  deptCode: 'Д',
  deptName: 'Делопроизводство',
  composerName: 'Иванов И.И.',
  composerDept: 'Делопроизводство',
  recipientName: 'Начальнику бюро',
  subject: 'Тестовый документ',
  registeredAt: new Date().toISOString(),
  registeredByRole: 'admin',
  ...overrides,
});

describe('fnv1a64Hex', () => {
  it('детерминирован: один и тот же вход — один и тот же хэш', () => {
    expect(fnv1a64Hex('hello')).toBe(fnv1a64Hex('hello'));
  });

  it('разные входы — разные хэши', () => {
    expect(fnv1a64Hex('hello')).not.toBe(fnv1a64Hex('world'));
  });

  it('всегда 16 hex-символов (64-bit)', () => {
    for (const s of ['', 'a', 'Тестовый документ ГОСТ', 'x'.repeat(1000)]) {
      expect(fnv1a64Hex(s)).toMatch(/^[0-9a-f]{16}$/);
    }
  });

  it('пустая строка не падает', () => {
    expect(typeof fnv1a64Hex('')).toBe('string');
  });
});

describe('rechainRegistry', () => {
  it('генерирует prevHash/hash для всех записей', () => {
    const records = [mkDoc({ regNumber: 'Д-3' }), mkDoc({ regNumber: 'Д-2' }), mkDoc({ regNumber: 'Д-1' })];
    const chained = rechainRegistry(records);
    expect(chained.length).toBe(3);
    for (const r of chained) {
      expect(r.hash).toMatch(/^[0-9a-f]{16}$/);
      expect(typeof r.prevHash).toBe('string');
    }
  });

  it('самая старая (конец массива) ссылается на GENESIS_HASH', () => {
    const records = [mkDoc({ regNumber: 'Д-2' }), mkDoc({ regNumber: 'Д-1' })];
    const chained = rechainRegistry(records);
    // порядок: [новая, старая] → самая старая в конце
    expect(chained[1].prevHash).toBe(GENESIS_HASH);
  });

  it('не мутирует исходный массив', () => {
    const records = [mkDoc({ regNumber: 'Д-1' })];
    const snapshot = JSON.stringify(records);
    rechainRegistry(records);
    expect(JSON.stringify(records)).toBe(snapshot);
  });

  it('цепочка связна: hash[i] == prevHash[i-1] (при порядке [новая...старая])', () => {
    const records = [mkDoc({ regNumber: 'Д-3' }), mkDoc({ regNumber: 'Д-2' }), mkDoc({ regNumber: 'Д-1' })];
    const chained = rechainRegistry(records);
    // chained[0] (новая) имеет prevHash = hash(chained[1]) (предыдущая по времени)
    expect(chained[0].prevHash).toBe(chained[1].hash);
    expect(chained[1].prevHash).toBe(chained[2].hash);
  });
});

describe('verifyRegistryIntegrity', () => {
  it('валидная цепочка проходит проверку', () => {
    const records = [mkDoc({ regNumber: 'Д-3' }), mkDoc({ regNumber: 'Д-2' }), mkDoc({ regNumber: 'Д-1' })];
    const chained = rechainRegistry(records);
    const verdict = verifyRegistryIntegrity(chained);
    expect(verdict.valid).toBe(true);
    expect(verdict.total).toBe(3);
    expect(verdict.brokenAt).toBe(-1);
  });

  it('правка записи в обход кода ломает цепочку', () => {
    const records = [mkDoc({ regNumber: 'Д-2' }), mkDoc({ regNumber: 'Д-1' })];
    const chained = rechainRegistry(records);
    // ручная правка subject через devtools
    chained[1] = { ...chained[1], subject: 'ИЗМЕНЕНО ВРУЧНУЮ' };
    const verdict = verifyRegistryIntegrity(chained);
    expect(verdict.valid).toBe(false);
  });

  it('подмена одной записи целиком ломает цепочку', () => {
    const records = [mkDoc({ regNumber: 'Д-3' }), mkDoc({ regNumber: 'Д-2' }), mkDoc({ regNumber: 'Д-1' })];
    const chained = rechainRegistry(records);
    chained[1] = mkDoc({ regNumber: 'Д-99' }); // подделка без валидных hash
    const verdict = verifyRegistryIntegrity(chained);
    expect(verdict.valid).toBe(false);
  });

  it('пустой реестр — валиден', () => {
    const verdict = verifyRegistryIntegrity([]);
    expect(verdict.valid).toBe(true);
    expect(verdict.total).toBe(0);
  });

  it('unchained записи (старый формат) не проходят проверку', () => {
    const legacy = [mkDoc({ regNumber: 'Д-1' })]; // без hash/prevHash
    const verdict = verifyRegistryIntegrity(legacy);
    expect(verdict.valid).toBe(false);
    expect(verdict.hasUnchained).toBe(true);
  });

  it('изменение порядка записей ломает цепочку', () => {
    const records = [mkDoc({ regNumber: 'Д-3' }), mkDoc({ regNumber: 'Д-2' }), mkDoc({ regNumber: 'Д-1' })];
    const chained = rechainRegistry(records);
    const shuffled = [chained[2], chained[0], chained[1]];
    const verdict = verifyRegistryIntegrity(shuffled);
    expect(verdict.valid).toBe(false);
  });
});

describe('регрессия: undefined-поля не ломают цепочку (баг "digitalSignatureKey: undefined")', () => {
  it('запись с digitalSignatureKey: undefined проходит round-trip JSON.stringify', () => {
    // Было: rechainRegistry в памяти считал хэш С undefined-полем, а JSON.stringify
    // выбрасывал это поле при сохранении → хэш после чтения не совпадал → ложная
    // ошибка целостности. Канон теперь игнорирует undefined, как и JSON.stringify.
    const records = [
      mkDoc({ regNumber: 'Д-2', digitalSignatureKey: undefined as unknown as string }),
      mkDoc({ regNumber: 'Д-1' })
    ];
    const chained = rechainRegistry(records);
    // симуляция localStorage: JSON round-trip выбрасывает undefined-поле
    const roundTripped = JSON.parse(JSON.stringify(chained));
    const verdict = verifyRegistryIntegrity(roundTripped);
    expect(verdict.valid).toBe(true);
  });

  it('хэш записи не зависит от undefined-полей', () => {
    const base = { id: 'fixed-id', regNumber: 'Д-1', registeredAt: 'FIXED-TIME' };
    const a = rechainRegistry([mkDoc({ ...base, digitalSignatureKey: undefined as unknown as string })]);
    const b = rechainRegistry([mkDoc({ ...base })]);
    expect(a[0].hash).toBe(b[0].hash);
  });

  it('запись без ЭП и с ЭП — разные хэши (ключ реально влияет на цепочку)', () => {
    const noKey = rechainRegistry([mkDoc({ regNumber: 'Д-1' })]);
    const withKey = rechainRegistry([mkDoc({ regNumber: 'Д-1', digitalSignatureKey: 'AAAA-1234' })]);
    expect(noKey[0].hash).not.toBe(withKey[0].hash);
  });
});
