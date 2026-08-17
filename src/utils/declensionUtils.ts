export type GrammarCase = 'nominative' | 'genitive' | 'dative' | 'accusative' | 'instrumental' | 'prepositional';

export interface FioDeclensionResult {
  nominative: string;   // Кто? (Иванов Иван Иванович)
  genitive: string;     // Кого? (Иванова Ивана Ивановича)
  dative: string;       // Кому? (Иванову Ивану Ивановичу)
  accusative: string;   // Кого? (Иванова Ивана Ивановича)
  instrumental: string; // Кем? (Ивановым Иваном Ивановичем)
  prepositional: string;// О ком? (Иванове Иване Ивановиче)
}

/**
 * Universal Russian Pluralization helper for counters.
 * Example: pluralize(5, ['документ', 'документа', 'документов']) -> "5 документов"
 */
export function pluralizeNoun(count: number, forms: [string, string, string]): string {
  const absCount = Math.abs(count) % 100;
  const lastDigit = absCount % 10;

  if (absCount > 10 && absCount < 20) {
    return `${count} ${forms[2]}`;
  }
  if (lastDigit > 1 && lastDigit < 5) {
    return `${count} ${forms[1]}`;
  }
  if (lastDigit === 1) {
    return `${count} ${forms[0]}`;
  }
  return `${count} ${forms[2]}`;
}

/**
 * Detects gender from patronymic, first name, or surname
 */
export function detectGender(fullName: string): 'male' | 'female' | 'unknown' {
  const clean = fullName.trim();
  const parts = clean.split(/\s+/);

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower.endsWith('вич') || lower.endsWith('лич') || lower.endsWith('вичу') || lower.endsWith('личем')) return 'male';
    if (lower.endsWith('вна') || lower.endsWith('чна') || lower.endsWith('вне') || lower.endsWith('чной')) return 'female';
  }

  // Check last names
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (
      lower.endsWith('ов') || lower.endsWith('ев') || lower.endsWith('ин') || lower.endsWith('ын') ||
      lower.endsWith('ский') || lower.endsWith('цкий') ||
      lower.endsWith('ову') || lower.endsWith('еву') || lower.endsWith('ину') || lower.endsWith('скому')
    ) {
      return 'male';
    }
    if (
      lower.endsWith('ова') || lower.endsWith('ева') || lower.endsWith('ина') || lower.endsWith('ына') ||
      lower.endsWith('ская') || lower.endsWith('цкая') ||
      lower.endsWith('овой') || lower.endsWith('евой') || lower.endsWith('иной') || lower.endsWith('ской')
    ) {
      return 'female';
    }
  }

  // Check first names
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (['анна', 'елена', 'ирина', 'ольга', 'татьяна', 'мария', 'наталья', 'екатерина', 'светлана', 'юлия', 'анастасия', 'виктория', 'дарья', 'евгения', 'марина', 'надежда', 'любовь', 'анне', 'елене', 'ирине', 'ольге', 'татьяне', 'марии', 'наталье', 'екатерине', 'светлане', 'юлии'].includes(lower)) {
      return 'female';
    }
    if (['иван', 'александр', 'сергей', 'дмитрий', 'андрей', 'алексей', 'михаил', 'павел', 'евгений', 'роман', 'денис', 'артем', 'владимир', 'николай', 'виктор', 'ивану', 'александру', 'сергею', 'дмитрию', 'андрею', 'алексею', 'михаилу', 'павлу', 'евгению', 'роману', 'денису', 'артему', 'владимиру', 'николаю', 'виктору'].includes(lower)) {
      return 'male';
    }
  }

  return 'unknown';
}

/**
 * Declines male/female surnames according to Russian grammar rules
 */
export function declineSurname(surname: string, targetCase: GrammarCase, gender: 'male' | 'female' | 'unknown'): string {
  if (!surname) return '';
  const s = surname.trim();

  // Hyphenated surname handling (e.g. Иванов-Сидоров)
  if (s.includes('-')) {
    return s.split('-').map(part => declineSurname(part, targetCase, gender)).join('-');
  }

  const lower = s.toLowerCase();

  // Non-declinable surnames (e.g. Шевченко, Бойко, Седых, Глухих, Живаго, Дюма)
  if (
    lower.endsWith('ко') ||
    lower.endsWith('их') ||
    lower.endsWith('ых') ||
    lower.endsWith('во') ||
    lower.endsWith('аго') ||
    lower.endsWith('о') ||
    lower.endsWith('е') ||
    lower.endsWith('и') ||
    lower.endsWith('у') ||
    lower.endsWith('ю')
  ) {
    return s;
  }

  if (targetCase === 'nominative') return s;

  // Already in Dative check
  if (targetCase === 'dative') {
    if (lower.endsWith('ову') || lower.endsWith('еву') || lower.endsWith('ину') || lower.endsWith('ыну') || lower.endsWith('скому') || lower.endsWith('цкому')) {
      return s;
    }
    if (lower.endsWith('овой') || lower.endsWith('евой') || lower.endsWith('иной') || lower.endsWith('ыной') || lower.endsWith('ской') || lower.endsWith('цкой')) {
      return s;
    }
  }

  const isFemale = gender === 'female' || lower.endsWith('а') || lower.endsWith('я');

  if (isFemale) {
    // Female surnames: Ивановой, Заболотской
    if (lower.endsWith('ова') || lower.endsWith('ева') || lower.endsWith('ина') || lower.endsWith('ына')) {
      const stem = s.slice(0, -1);
      switch (targetCase) {
        case 'genitive':
        case 'dative':
        case 'instrumental':
        case 'prepositional':
          return stem + 'ой';
        case 'accusative':
          return stem + 'у';
      }
    }
    if (lower.endsWith('ская') || lower.endsWith('цкая')) {
      const stem = s.slice(0, -2);
      switch (targetCase) {
        case 'genitive':
        case 'dative':
        case 'instrumental':
        case 'prepositional':
          return stem + 'ой';
        case 'accusative':
          return stem + 'ую';
      }
    }
    return s;
  } else {
    // Male surnames: Иванову, Смирнову, Заболотскому
    if (lower.endsWith('ов') || lower.endsWith('ев') || lower.endsWith('ин') || lower.endsWith('ын')) {
      switch (targetCase) {
        case 'genitive':
        case 'accusative':
          return s + 'а';
        case 'dative':
          return s + 'у';
        case 'instrumental':
          return s + 'ым';
        case 'prepositional':
          return s + 'е';
      }
    }
    if (lower.endsWith('ский') || lower.endsWith('цкий')) {
      const stem = s.slice(0, -2);
      switch (targetCase) {
        case 'genitive':
        case 'accusative':
          return stem + 'ого';
        case 'dative':
          return stem + 'ому';
        case 'instrumental':
          return stem + 'им';
        case 'prepositional':
          return stem + 'ом';
      }
    }
    // Hard consonant ending (e.g. Кузнецов -> Кузнецову, Романов -> Романову, Мишкевич -> Мишкевичу)
    if (!/[аеёиоуыэюя]$/i.test(lower)) {
      switch (targetCase) {
        case 'genitive':
        case 'accusative':
          return s + 'а';
        case 'dative':
          return s + 'у';
        case 'instrumental':
          return s + 'ом';
        case 'prepositional':
          return s + 'е';
      }
    }
  }

  return s;
}

/**
 * Declines Russian First Name
 */
export function declineFirstName(firstName: string, targetCase: GrammarCase, gender: 'male' | 'female' | 'unknown'): string {
  if (!firstName) return '';
  const fn = firstName.trim();
  const lower = fn.toLowerCase();

  // Initials (e.g., "А.", "И.") remain unchanged
  if (/^[а-яёa-z]\.?$/i.test(fn)) return fn;
  if (targetCase === 'nominative') return fn;

  // Already in Dative check
  if (targetCase === 'dative') {
    if (['александру', 'ивану', 'роману', 'сергею', 'дмитрию', 'андрею', 'алексею', 'михаилу', 'павлу', 'евгению', 'денису', 'артему', 'владимиру', 'николаю', 'виктору'].includes(lower)) {
      return fn;
    }
    if (['анне', 'елене', 'ирине', 'ольге', 'татьяне', 'марии', 'наталье', 'екатерине', 'светлане', 'юлии', 'анастасии', 'виктории', 'дарье', 'евгении', 'марине', 'надежде'].includes(lower)) {
      return fn;
    }
  }

  const isFemale = gender === 'female' || ['а', 'я'].includes(lower.slice(-1));

  if (isFemale) {
    if (lower.endsWith('ия')) {
      const stem = fn.slice(0, -2);
      switch (targetCase) {
        case 'genitive':
        case 'dative':
        case 'prepositional':
          return stem + 'ии';
        case 'accusative':
          return stem + 'ию';
        case 'instrumental':
          return stem + 'ией';
      }
    }
    if (lower.endsWith('а')) {
      const stem = fn.slice(0, -1);
      switch (targetCase) {
        case 'genitive':
          return stem + (/[гкхжчшщ]$/i.test(stem) ? 'и' : 'ы');
        case 'dative':
        case 'prepositional':
          return stem + 'е';
        case 'accusative':
          return stem + 'у';
        case 'instrumental':
          return stem + 'ой';
      }
    }
    if (lower.endsWith('я')) {
      const stem = fn.slice(0, -1);
      switch (targetCase) {
        case 'genitive':
          return stem + 'и';
        case 'dative':
        case 'prepositional':
          return stem + 'е';
        case 'accusative':
          return stem + 'ю';
        case 'instrumental':
          return stem + 'ей';
      }
    }
  } else {
    if (lower.endsWith('ий')) {
      const stem = fn.slice(0, -2);
      switch (targetCase) {
        case 'genitive':
        case 'accusative':
          return stem + 'ия';
        case 'dative':
          return stem + 'ию';
        case 'instrumental':
          return stem + 'ием';
        case 'prepositional':
          return stem + 'ии';
      }
    }
    if (lower.endsWith('ей') || lower.endsWith('ай')) {
      const stem = fn.slice(0, -1);
      switch (targetCase) {
        case 'genitive':
        case 'accusative':
          return stem + 'я';
        case 'dative':
          return stem + 'ю';
        case 'instrumental':
          return stem + 'ем';
        case 'prepositional':
          return stem + 'е';
      }
    }
    if (lower.endsWith('а') || lower.endsWith('я')) { // Илья, Никита
      const stem = fn.slice(0, -1);
      switch (targetCase) {
        case 'genitive':
          return stem + (lower.endsWith('а') ? 'ы' : 'и');
        case 'dative':
        case 'prepositional':
          return stem + 'е';
        case 'accusative':
          return stem + (lower.endsWith('а') ? 'у' : 'ю');
        case 'instrumental':
          return stem + (lower.endsWith('а') ? 'ой' : 'ей');
      }
    }
    // Hard consonant ending (Иван, Александр, Сергей)
    if (!/[аеёиоуыэюя]$/i.test(lower)) {
      switch (targetCase) {
        case 'genitive':
        case 'accusative':
          return fn + 'а';
        case 'dative':
          return fn + 'у';
        case 'instrumental':
          return fn + 'ом';
        case 'prepositional':
          return fn + 'е';
      }
    }
  }

  return fn;
}

/**
 * Declines Russian Patronymic (Отчество)
 */
export function declinePatronymic(patronymic: string, targetCase: GrammarCase): string {
  if (!patronymic) return '';
  const pat = patronymic.trim();
  const lower = pat.toLowerCase();

  // Initials (e.g. "А.", "И.") remain unchanged
  if (/^[а-яёa-z]\.?$/i.test(pat)) return pat;
  if (targetCase === 'nominative') return pat;

  // Already in Dative check
  if (targetCase === 'dative') {
    if (lower.endsWith('ичу') || lower.endsWith('вне') || lower.endsWith('чне')) {
      return pat;
    }
  }

  // Все русские мужские отчества оканчиваются на -ич (Иванович, Ильич, Кузьмич, Никитич)
  if (lower.endsWith('ич')) {
    switch (targetCase) {
      case 'genitive':
      case 'accusative':
        return pat + 'а';
      case 'dative':
        return pat + 'у';
      case 'instrumental':
        return pat + 'ем';
      case 'prepositional':
        return pat + 'е';
    }
  }

  if (lower.endsWith('вна') || lower.endsWith('чна')) {
    const stem = pat.slice(0, -1);
    switch (targetCase) {
      case 'genitive':
      case 'dative':
      case 'prepositional':
        return stem + 'е';
      case 'accusative':
        return stem + 'у';
      case 'instrumental':
        return stem + 'ой';
    }
  }

  return pat;
}

/**
 * Full FIO declension across all cases
 */
export function declineFio(fullName: string, targetCase: GrammarCase = 'dative'): string {
  if (!fullName || !fullName.trim()) return '';
  const clean = fullName.trim();
  const parts = clean.split(/\s+/);
  const gender = detectGender(clean);

  if (parts.length === 1) {
    return declineSurname(parts[0], targetCase, gender);
  }

  if (parts.length === 2) {
    // Check if one part is initials (e.g. "Романов А.А.", "Романов А. А.", "А.А. Романов")
    const isInitials1 = /^([а-яёa-z]\.\s*){1,2}[а-яёa-z]?\.?$/i.test(parts[0]);
    const isInitials2 = /^([а-яёa-z]\.\s*){1,2}[а-яёa-z]?\.?$/i.test(parts[1]);

    if (isInitials2) {
      const surname = declineSurname(parts[0], targetCase, gender);
      return `${surname} ${parts[1]}`;
    } else if (isInitials1) {
      const surname = declineSurname(parts[1], targetCase, gender);
      return `${parts[0]} ${surname}`;
    } else {
      // Assuming Surname + First name
      const surname = declineSurname(parts[0], targetCase, gender);
      const firstName = declineFirstName(parts[1], targetCase, gender);
      return `${surname} ${firstName}`;
    }
  }

  if (parts.length >= 3) {
    // Surname + First Name + Patronymic
    const surname = declineSurname(parts[0], targetCase, gender);
    const firstName = declineFirstName(parts[1], targetCase, gender);
    const patronymic = declinePatronymic(parts[2], targetCase);

    const rest = parts.slice(3).join(' ');
    return `${surname} ${firstName} ${patronymic}${rest ? ' ' + rest : ''}`;
  }

  return clean;
}

/**
 * Clean trailing artifacts like ")у" or ")а" if present
 */
function cleanupPositionArtifacts(text: string): string {
  return text.replace(/\)([уаеомiыяеи]|\b)/gi, ')').replace(/\)у$/i, ')');
}

/**
 * Automatic Job Title (Должность) declension for Russian official documents
 * Example: "Начальник бюро (бюро автоматики)" -> "Начальнику бюро (бюро автоматики)" (Dative)
 */
export function declineJobPosition(position: string, targetCase: GrammarCase = 'dative'): string {
  if (!position || !position.trim()) return '';
  let clean = cleanupPositionArtifacts(position.trim());

  if (targetCase === 'nominative') return clean;

  // Separate parenthetical suffix if present, e.g. "Начальник бюро (Бюро автоматики)"
  // Parentheses in Russian official titles specify department or details and must remain untouched.
  const parenMatch = clean.match(/^(.*?)\s*(\(.*?\))\s*$/);
  let mainTitle = clean;
  let parenSuffix = '';

  if (parenMatch) {
    mainTitle = parenMatch[1].trim();
    parenSuffix = ' ' + parenMatch[2].trim();
  }

  const words = mainTitle.split(/\s+/);
  let passedPreposition = false;

  const declinedWords = words.map((word, index) => {
    // Extract punctuation around word (e.g. "(инженер," -> prefix="(", clean="инженер", suffix=",")
    const pMatch = word.match(/^([^\wа-яёА-ЯЁ]*)([\wа-яёА-ЯЁ\-]+)([^\wа-яёА-ЯЁ]*)$/u);
    if (!pMatch) return word;

    const prefix = pMatch[1];
    const rawWord = pMatch[2];
    const suffix = pMatch[3];

    const lower = rawWord.toLowerCase();

    // Check prepositions (в, на, по, за, и, для, с, из, от)
    if (['в', 'на', 'по', 'за', 'и', 'для', 'с', 'из', 'от'].includes(lower)) {
      passedPreposition = true;
      return word;
    }

    // Once we pass a preposition or if word is inside punctuation, words stay in their grammar case
    if (passedPreposition) {
      return word;
    }

    // Check hyphenated words e.g. Инженер-программист -> Инженеру-программисту
    if (rawWord.includes('-')) {
      const parts = rawWord.split('-');
      const declinedParts = parts.map(p => declineJobPositionWord(p, targetCase, index === 0));
      return prefix + declinedParts.join('-') + suffix;
    }

    const declinedStem = declineJobPositionWord(rawWord, targetCase, index === 0);
    return prefix + declinedStem + suffix;
  });

  const result = declinedWords.join(' ') + parenSuffix;
  return cleanupPositionArtifacts(result);
}

function declineJobPositionWord(word: string, targetCase: GrammarCase, isFirstWord: boolean): string {
  const lower = word.toLowerCase();

  // Abbreviations and non-declinable nouns
  if (['качества', 'автоматики', 'продаж', 'кадров', 'МТС', 'АХО', 'ПО', 'ИТ', 'ВЭД', 'ОКК', 'ОТК', 'АО', 'НПО', 'ООО', 'ЗАО', 'бюро', 'депо', 'руководство', 'производства', 'разработки', 'проекта', 'цеха', 'предприятия', 'завода', 'службы', 'управления', 'департамента', 'отдела'].includes(word) || word === word.toUpperCase()) {
    return word;
  }

  // Already in Dative check
  if (targetCase === 'dative') {
    if (lower.endsWith('ому') || lower.endsWith('ему') || lower.endsWith('ной') || lower.endsWith('ской') || lower.endsWith('цкой')) {
      return word;
    }
    if (lower.endsWith('нику') || lower.endsWith('тору') || lower.endsWith('еру') || lower.endsWith('сту') || lower.endsWith('телю') || lower.endsWith('ру') || lower.endsWith('цу') || lower.endsWith('гу') || lower.endsWith('ду') || lower.endsWith('лю')) {
      return word;
    }
  }

  // Adjectives e.g. "Генеральный" -> "Генеральному", "Главный" -> "Главному"
  if (lower.endsWith('ный') || lower.endsWith('ый')) {
    const stem = word.slice(0, -2);
    if (targetCase === 'dative') return stem + 'ому';
    if (targetCase === 'genitive') return stem + 'ого';
  }
  if (lower.endsWith('ная') || lower.endsWith('ая')) {
    const stem = word.slice(0, -2);
    if (targetCase === 'dative') return stem + 'ой';
    if (targetCase === 'genitive') return stem + 'ой';
  }
  if (lower.endsWith('ский') || lower.endsWith('цкий')) {
    const stem = word.slice(0, -2);
    if (targetCase === 'dative') return stem + 'ому';
    if (targetCase === 'genitive') return stem + 'ого';
  }
  if (lower.endsWith('щий') || lower.endsWith('ший')) {
    const stem = word.slice(0, -2);
    if (targetCase === 'dative') return stem + 'ему';
    if (targetCase === 'genitive') return stem + 'его';
  }

  // Nouns ending in soft sign -ль e.g. "Руководитель" -> "Руководителю"
  if (lower.endsWith('тель') || lower.endsWith('ль')) {
    const stem = word.slice(0, -1);
    if (targetCase === 'dative') return stem + 'ю';
    if (targetCase === 'genitive') return stem + 'я';
  }

  // Standard masculine noun ending in hard consonant e.g. "Директор" -> "Директору", "Начальник" -> "Начальнику", "Инженер" -> "Инженеру"
  if (!/[аеёиоуыэюя]$/i.test(lower)) {
    if (targetCase === 'dative') return word + 'у';
    if (targetCase === 'genitive') return word + 'а';
  }

  return word;
}
