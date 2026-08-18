import { describe, it, expect } from 'vitest';
import {
  detectGender,
  declineFio,
  declineSurname,
  declineFirstName,
  declinePatronymic,
  declineJobPosition,
  pluralizeNoun,
  GrammarCase,
} from './declensionUtils';

describe('pluralizeNoun', () => {
  it('документ/документа/документов', () => {
    const forms: [string, string, string] = ['документ', 'документа', 'документов'];
    expect(pluralizeNoun(1, forms)).toBe('1 документ');
    expect(pluralizeNoun(2, forms)).toBe('2 документа');
    expect(pluralizeNoun(5, forms)).toBe('5 документов');
    expect(pluralizeNoun(11, forms)).toBe('11 документов');
    expect(pluralizeNoun(21, forms)).toBe('21 документ');
    expect(pluralizeNoun(22, forms)).toBe('22 документа');
    expect(pluralizeNoun(105, forms)).toBe('105 документов');
  });

  it('отрицательные и ноль', () => {
    const forms: [string, string, string] = ['письмо', 'письма', 'писем'];
    expect(pluralizeNoun(0, forms)).toBe('0 писем');
    expect(pluralizeNoun(-3, forms)).toBe('-3 письма');
  });
});

describe('detectGender', () => {
  it('по отчеству', () => {
    expect(detectGender('Иванов Иван Иванович')).toBe('male');
    expect(detectGender('Петрова Анна Петровна')).toBe('female');
    expect(detectGender('Сидоров Павел Ильич')).toBe('male');
  });

  it('по фамилии', () => {
    expect(detectGender('Иванов')).toBe('male');
    expect(detectGender('Иванова')).toBe('female');
    expect(detectGender('Смирнов')).toBe('male');
    expect(detectGender('Смирнова')).toBe('female');
    expect(detectGender('Заболотский')).toBe('male');
    expect(detectGender('Заболотская')).toBe('female');
  });

  it('по имени', () => {
    expect(detectGender('Анна')).toBe('female');
    expect(detectGender('Александр')).toBe('male');
  });
});

describe('declineSurname', () => {
  it('мужские на -ов/-ев/-ин', () => {
    expect(declineSurname('Иванов', 'dative', 'male')).toBe('Иванову');
    expect(declineSurname('Иванов', 'genitive', 'male')).toBe('Иванова');
    expect(declineSurname('Иванов', 'instrumental', 'male')).toBe('Ивановым');
    expect(declineSurname('Смирнов', 'dative', 'male')).toBe('Смирнову');
    expect(declineSurname('Кузнецов', 'dative', 'male')).toBe('Кузнецову');
  });

  it('женские на -ова/-ева/-ина', () => {
    expect(declineSurname('Иванова', 'dative', 'female')).toBe('Ивановой');
    expect(declineSurname('Иванова', 'genitive', 'female')).toBe('Ивановой');
    expect(declineSurname('Иванова', 'accusative', 'female')).toBe('Иванову');
    expect(declineSurname('Смирнова', 'dative', 'female')).toBe('Смирновой');
    expect(declineSurname('Кузнецова', 'dative', 'female')).toBe('Кузнецовой');
  });

  it('на -ский/-цкий', () => {
    expect(declineSurname('Заболотский', 'dative', 'male')).toBe('Заболотскому');
    expect(declineSurname('Заболотская', 'dative', 'female')).toBe('Заболотской');
    expect(declineSurname('Троицкий', 'genitive', 'male')).toBe('Троицкого');
  });

  it('несклоняемые фамилии', () => {
    expect(declineSurname('Шевченко', 'dative', 'male')).toBe('Шевченко');
    expect(declineSurname('Бойко', 'dative', 'male')).toBe('Бойко');
    expect(declineSurname('Седых', 'dative', 'male')).toBe('Седых');
    expect(declineSurname('Глухих', 'dative', 'male')).toBe('Глухих');
  });

  it('дефисные фамилии', () => {
    expect(declineSurname('Иванов-Сидоров', 'dative', 'male')).toBe('Иванову-Сидорову');
  });

  it('мужские на твёрдый согласный', () => {
    expect(declineSurname('Мишкевич', 'dative', 'male')).toBe('Мишкевичу');
    expect(declineSurname('Романов', 'dative', 'male')).toBe('Романову');
  });
});

describe('declineFirstName', () => {
  it('мужские имена', () => {
    expect(declineFirstName('Иван', 'dative', 'male')).toBe('Ивану');
    expect(declineFirstName('Александр', 'dative', 'male')).toBe('Александру');
    expect(declineFirstName('Сергей', 'dative', 'male')).toBe('Сергею');
    expect(declineFirstName('Андрей', 'dative', 'male')).toBe('Андрею');
    expect(declineFirstName('Илья', 'dative', 'male')).toBe('Илье');
    expect(declineFirstName('Никита', 'dative', 'male')).toBe('Никите');
  });

  it('женские имена', () => {
    expect(declineFirstName('Анна', 'dative', 'female')).toBe('Анне');
    expect(declineFirstName('Елена', 'dative', 'female')).toBe('Елене');
    expect(declineFirstName('Мария', 'dative', 'female')).toBe('Марии');
    expect(declineFirstName('Наталья', 'dative', 'female')).toBe('Наталье');
    expect(declineFirstName('Ольга', 'dative', 'female')).toBe('Ольге');
  });

  it('инициалы не склоняются', () => {
    expect(declineFirstName('А.', 'dative', 'male')).toBe('А.');
    expect(declineFirstName('И.', 'dative', 'female')).toBe('И.');
  });
});

describe('declinePatronymic', () => {
  it('мужские отчества', () => {
    expect(declinePatronymic('Иванович', 'dative')).toBe('Ивановичу');
    expect(declinePatronymic('Ильич', 'dative')).toBe('Ильичу');
    expect(declinePatronymic('Петрович', 'genitive')).toBe('Петровича');
  });

  it('женские отчества', () => {
    expect(declinePatronymic('Петровна', 'dative')).toBe('Петровне');
    expect(declinePatronymic('Ивановна', 'genitive')).toBe('Ивановне');
    expect(declinePatronymic('Александровна', 'dative')).toBe('Александровне');
  });
});

describe('declineFio (полное склонение)', () => {
  it('мужчина ФИО в дательный', () => {
    expect(declineFio('Иванов Иван Иванович', 'dative')).toBe('Иванову Ивану Ивановичу');
  });

  it('женщина ФИО в дательный', () => {
    expect(declineFio('Петрова Анна Петровна', 'dative')).toBe('Петровой Анне Петровне');
  });

  it('ФИО с инициалами', () => {
    expect(declineFio('Романов А.А.', 'dative')).toBe('Романову А.А.');
    expect(declineFio('Романов А. А.', 'dative')).toBe('Романову А. А.');
    expect(declineFio('А.А. Романов', 'dative')).toBe('А.А. Романову');
  });

  it('фамилия + имя (2 слова)', () => {
    expect(declineFio('Иванов Иван', 'dative')).toBe('Иванову Ивану');
  });
});

describe('declineJobPosition (склонение должностей)', () => {
  it('Генеральный директор -> Генеральному директору', () => {
    expect(declineJobPosition('Генеральный директор', 'dative')).toBe('Генеральному директору');
  });

  it('Начальник бюро -> Начальнику бюро', () => {
    expect(declineJobPosition('Начальник бюро', 'dative')).toBe('Начальнику бюро');
  });

  it('Начальник отдела кадров -> Начальнику отдела кадров', () => {
    expect(declineJobPosition('Начальник отдела кадров', 'dative')).toBe('Начальнику отдела кадров');
  });

  it('Главный инженер -> Главному инженеру', () => {
    expect(declineJobPosition('Главный инженер', 'dative')).toBe('Главному инженеру');
  });

  it('Заместитель директора -> Заместителю директора', () => {
    expect(declineJobPosition('Заместитель директора', 'dative')).toBe('Заместителю директора');
  });

  it('Инженер-программист -> Инженеру-программисту', () => {
    expect(declineJobPosition('Инженер-программист', 'dative')).toBe('Инженеру-программисту');
  });

  it('со скобочным суффиксом (подразделение не склоняется)', () => {
    expect(declineJobPosition('Начальник бюро (бюро автоматики)', 'dative')).toBe('Начальнику бюро (бюро автоматики)');
  });

  it('руководитель -> руководителю', () => {
    expect(declineJobPosition('Руководитель направления', 'dative')).toBe('Руководителю направления');
  });

  it('Программист приложений -> Программисту приложений', () => {
    expect(declineJobPosition('Программист приложений', 'dative')).toBe('Программисту приложений');
  });

  it('Начальник отдела цифровых технологий и автоматизации -> Начальнику отдела цифровых технологий и автоматизации', () => {
    expect(declineJobPosition('Начальник отдела цифровых технологий и автоматизации', 'dative')).toBe('Начальнику отдела цифровых технологий и автоматизации');
  });

  it('именительный не меняется', () => {
    expect(declineJobPosition('Начальник отдела продаж', 'nominative')).toBe('Начальник отдела продаж');
  });
});
