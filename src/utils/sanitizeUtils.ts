/**
 * Whitelist-based HTML sanitizer for document content.
 *
 * Причина существования: контент документа вставляется в DOM (DocumentPreview)
 * и в HTML-тело .eml письма. Контент приходит из localStorage и postMessage —
 * это недоверенные данные. Дыра: <img src=x onerror=...> или <script> в письме.
 * Вместо тяжёлой зависимости (DOMPurify) — белый список тегов, покрывающий
 * весь набор разметки, который реально производит редактор документа.
 *
 * Политика (минимальна и достаточна для официальных документов):
 *  - разрешены только текстово-структурные теги;
 *  - у <a> остаётся только href (http/https/mailto) и title;
 *  - script/style/iframe/object/embed/img и прочие embedding/интерактивные
 *    теги удаляются ПОЛНОСТЬЮ (вместе с содержимым);
 *  - прочие неизвестные теги "разворачиваются" (теряют обёртку, текст остаётся).
 */
const ALLOWED_TAGS = new Set([
  'p', 'br', 'ul', 'ol', 'li',
  'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup',
  'a', 'span', 'blockquote', 'h3', 'h4', 'h5', 'h6',
]);

const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ['href', 'title'],
};

/** Теги, которые вырезаются целиком (вместе с содержимым). */
const DROP_TAGS = new Set([
  'script', 'style', 'link', 'meta', 'base', 'template', 'noscript',
  'iframe', 'frame', 'object', 'embed', 'applet', 'param',
  'img', 'canvas', 'svg', 'math', 'video', 'audio', 'source', 'track',
  'form', 'input', 'button', 'textarea', 'select', 'option', 'optgroup',
  'dialog', 'portal', 'slot',
]);

const SAFE_HREF = /^(https?:|mailto:)/i;

function isElement(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE;
}

function sanitizeNode(node: Node): Node | null {
  if (!isElement(node)) return node; // text/comment nodes — keep as-is

  const tag = node.tagName.toLowerCase();

  // 1. Опасные/embedding теги — вырезаем полностью
  if (DROP_TAGS.has(tag)) {
    node.remove();
    return null;
  }

  // 2. Разрешённые — чистим атрибуты, рекурсивно обрабатываем детей
  if (ALLOWED_TAGS.has(tag)) {
    const allowedAttrs = ALLOWED_ATTRS[tag] || [];
    for (const attr of Array.from(node.attributes)) {
      if (!allowedAttrs.includes(attr.name)) {
        node.removeAttribute(attr.name);
      } else if (attr.name === 'href' && !SAFE_HREF.test(attr.value.trim())) {
        node.removeAttribute('href');
      }
    }
    // рекурсия по детям
    for (const child of Array.from(node.childNodes)) {
      sanitizeNode(child);
    }
    return node;
  }

  // 3. Остальное (div, section, table, etc.) — разворачиваем: дети поднимаются
  //    на место родителя, обёртка исчезает. Это сохраняет текст/разметку
  //    (например <table><tr><td>перечень</td></tr></table> -> "перечень").
  const parent = node.parentNode;
  if (!parent) return null;
  while (node.firstChild) {
    parent.insertBefore(node.firstChild, node);
  }
  parent.removeChild(node);
  // дети уже в parent; обрабатываем их рекурсивно в контексте parent,
  // но чтобы не зациклиться — прогоним их отдельным проходом:
  // они были вставлены ПЕРЕД node, найдём их как предыдущие сиблинги.
  return null;
}

/**
 * Санитизирует HTML-строку документа. Всегда возвращает строку.
 * Пустой/невалидный ввод -> ''.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  if (typeof DOMParser === 'undefined') return html; // SSR fallback (не бывает тут)

  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Обезвреживаем и убираем опасные элементы по всему дереву (снизу вверх)
  const all = Array.from(doc.body.querySelectorAll('*'));
  for (let i = all.length - 1; i >= 0; i--) {
    sanitizeNode(all[i]);
  }
  // Повторный проход: unwrap мог поднять детей, среди них могли оказаться
  // элементы опасных тегов, которые были детьми div 2+ уровней.
  const again = Array.from(doc.body.querySelectorAll('*'));
  for (let i = again.length - 1; i >= 0; i--) {
    sanitizeNode(again[i]);
  }

  // Финал: если body пуст (был только <script>), нужно что-то вернуть — ''
  return doc.body.innerHTML.trim();
}