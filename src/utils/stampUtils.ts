export const buildStampSvg = (
  orgName: string = 'АКЦИОНЕРНОЕ ОБЩЕСТВО «НПО «ТЕПЛОМАШ»',
  cityOgrn: string = 'САНКТ-ПЕТЕРБУРГ * ОГРН 1027809212573',
  department: string = 'Бюро автоматики',
  position: string = 'Инженер-программист',
  centerSub: string = 'ДЛЯ ДОКУМЕНТОВ',
  color: string = '#1d4ed8'
): string => {
  const hexColor = color.startsWith('#') ? color : '#1d4ed8';
  const safeColor = `%23${hexColor.slice(1)}`;
  const safeOrg = (orgName || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeCity = (cityOgrn || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeDept = (department || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safePos = (position || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeSub = (centerSub || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const getFontSize = (text: string, baseSize: number) => {
    if (text.length > 32) return Math.max(6.5, baseSize - 4.5);
    if (text.length > 24) return Math.max(7.5, baseSize - 3.5);
    if (text.length > 16) return Math.max(8.5, baseSize - 2);
    return baseSize;
  };

  const deptFontSize = getFontSize(safeDept, 11);
  const posFontSize = getFontSize(safePos, 10);

  // Note: Inside XML/SVG string, the href MUST be #stampArcTop, not %23stampArcTop
  const svgXml = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 240 240" width="240" height="240"><circle cx="120" cy="120" r="112" stroke="${hexColor}" stroke-width="4.5" fill="none" opacity="0.88"/><circle cx="120" cy="120" r="66" stroke="${hexColor}" stroke-width="2.5" fill="none" opacity="0.88"/><path id="stampArcTop" d="M 28,120 A 92,92 0 1,1 212,120" fill="none"/><path id="stampArcBottom" d="M 212,120 A 92,92 0 0,1 28,120" fill="none"/><text fill="${hexColor}" font-family="Arial, sans-serif" font-size="10.5" font-weight="bold" opacity="0.92"><textPath href="#stampArcTop" startOffset="50%" text-anchor="middle">${safeOrg}</textPath></text><text fill="${hexColor}" font-family="Arial, sans-serif" font-size="10" font-weight="bold" opacity="0.92"><textPath href="#stampArcBottom" startOffset="50%" text-anchor="middle">${safeCity}</textPath></text><text x="120" y="98" font-family="Arial, sans-serif" font-size="${deptFontSize}" font-weight="bold" fill="${hexColor}" text-anchor="middle" opacity="0.95">${safeDept}</text><text x="120" y="120" font-family="Arial, sans-serif" font-size="${posFontSize}" font-weight="bold" fill="${hexColor}" text-anchor="middle" opacity="0.9">${safePos}</text><text x="120" y="142" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="${hexColor}" text-anchor="middle" opacity="0.92">${safeSub}</text></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgXml)}`;
};

/**
 * Directly renders a crisp, high-resolution round seal stamp PNG with transparent background on a 2D Canvas.
 * Bypasses all SVG rendering or browser img load quirks, producing a guaranteed PNG data URL.
 */
export const renderStampToCanvasPng = (
  orgName = 'АКЦИОНЕРНОЕ ОБЩЕСТВО «НПО «ТЕПЛОМАШ»',
  cityOgrn = 'САНКТ-ПЕТЕРБУРГ * ОГРН 1027809212573',
  department = 'ОТДЕЛ ПРОДАЖ',
  position = 'Сотрудник',
  centerSub = 'ДЛЯ ДОКУМЕНТОВ',
  color = '#1d4ed8'
): string => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const cx = 150;
    const cy = 150;
    const themeColor = color.startsWith('#') ? color : '#1d4ed8';

    ctx.clearRect(0, 0, 300, 300);

    // Outer circle ring
    ctx.strokeStyle = themeColor;
    ctx.lineWidth = 5.5;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(cx, cy, 138, 0, Math.PI * 2);
    ctx.stroke();

    // Inner circle ring
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 82, 0, Math.PI * 2);
    ctx.stroke();

    // Draw text along curved top arc
    ctx.fillStyle = themeColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const drawArcText = (
      text: string,
      radius: number,
      startAngle: number,
      endAngle: number,
      isTop: boolean,
      fontSize: number
    ) => {
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      const cleanText = text.trim();
      const len = cleanText.length;
      if (len === 0) return;

      const angleRange = endAngle - startAngle;
      const angleStep = angleRange / (len + 1);

      for (let i = 0; i < len; i++) {
        const char = cleanText[i];
        const angle = isTop
          ? startAngle + (i + 1) * angleStep
          : endAngle - (i + 1) * angleStep;

        ctx.save();
        ctx.translate(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
        ctx.rotate(angle + (isTop ? Math.PI / 2 : -Math.PI / 2));
        ctx.fillText(char, 0, 0);
        ctx.restore();
      }
    };

    // Draw Organization on top arc (-150 deg to -30 deg)
    drawArcText(orgName, 114, -Math.PI * 0.86, -Math.PI * 0.14, true, 12);

    // Draw City/OGRN on bottom arc (+30 deg to +150 deg)
    drawArcText(cityOgrn, 114, Math.PI * 0.14, Math.PI * 0.86, false, 11);

    // Draw center text
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillText(department || 'ОТДЕЛ ПРОДАЖ', cx, cy - 24);

    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillText(position || 'Сотрудник', cx, cy + 2);

    ctx.font = 'bold 13.5px Arial, sans-serif';
    ctx.fillText(centerSub || 'ДЛЯ ДОКУМЕНТОВ', cx, cy + 28);

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Error rendering stamp to Canvas PNG:', err);
    return '';
  }
};

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

