/**
 * Generates a random unique Digital Signature key (e.g. "4F8A-9C12-8B0E-3D77")
 */
export const generateDigitalSignatureKey = (): string => {
  const chars = '0123456789ABCDEF';
  const seg = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

  const existingKeys = new Set<string>();
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('teplomash_registered_docs_registry_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((doc: { digitalSignatureKey?: string }) => {
            if (doc.digitalSignatureKey) existingKeys.add(doc.digitalSignatureKey.trim().toUpperCase());
          });
        }
      }
    } catch {
      // ignore JSON parse errors
    }
  }

  let key = `${seg(4)}-${seg(4)}-${seg(4)}-${seg(4)}`;
  while (existingKeys.has(key)) {
    key = `${seg(4)}-${seg(4)}-${seg(4)}-${seg(4)}`;
  }
  return key;
};

/**
 * Extracts clean raw SVG XML from a data URL or XML string.
 */
export const getRawSvgXml = (svgDataUrlOrXml: string): string => {
  if (!svgDataUrlOrXml) return '';
  if (svgDataUrlOrXml.startsWith('data:image/svg+xml;utf8,')) {
    return decodeURIComponent(svgDataUrlOrXml.replace('data:image/svg+xml;utf8,', ''));
  }
  if (svgDataUrlOrXml.startsWith('data:image/svg+xml;base64,')) {
    try {
      return atob(svgDataUrlOrXml.replace('data:image/svg+xml;base64,', ''));
    } catch {
      return '';
    }
  }
  if (svgDataUrlOrXml.trim().startsWith('<svg')) {
    return svgDataUrlOrXml;
  }
  return svgDataUrlOrXml;
};

/**
 * Triggers a browser file download for an SVG image string or SVG Data URL.
 */
export const downloadSvgFile = (svgContentOrUrl: string, filename: string = 'image.svg'): void => {
  try {
    const rawXml = getRawSvgXml(svgContentOrUrl);
    if (!rawXml) {
      alert('Не удалось прочитать векторный формат SVG');
      return;
    }

    const xmlWithHeader = rawXml.startsWith('<?xml') 
      ? rawXml 
      : `<?xml version="1.0" encoding="UTF-8"?>\n${rawXml}`;

    const blob = new Blob([xmlWithHeader], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.svg') ? filename : `${filename}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error('Error downloading SVG file:', err);
    alert('Произошла ошибка при скачивании файла .svg');
  }
};

