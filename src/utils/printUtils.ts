import { DocumentData } from '../types';

/**
 * Triggers the browser system print dialog for the A4 document sheets (#document-printable-area).
 * Uses a dedicated popup window loaded with document styles to bypass iframe sandbox limits.
 */
export function triggerSystemPrint(docData?: DocumentData): boolean {
  const docTitle = docData ? `${docData.docType || 'Документ'} ${docData.refNumber ? '№ ' + docData.refNumber : ''}` : 'Печать документа';
  const element = document.getElementById('document-printable-area') || document.getElementById('document-a4-sheet');

  if (!element) {
    try {
      window.focus();
      window.print();
      return true;
    } catch (e) {
      console.error('Failed window.print():', e);
      return false;
    }
  }

  // Method 1: Dedicated top-level printable window (most reliable across all iframe sandboxes)
  try {
    const stylesHtml = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((s) => s.outerHTML)
      .join('\n');

    const printWin = window.open('', '_blank', 'width=950,height=1000,scrollbars=yes,resizable=yes');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(`
        <!DOCTYPE html>
        <html lang="ru">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=210mm, initial-scale=1.0">
            <title>${docTitle}</title>
            ${stylesHtml}
            <style>
              @page {
                size: A4 portrait;
                margin: 0;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #f1f5f9 !important;
                width: 100% !important;
                font-family: system-ui, -apple-system, sans-serif;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              @media print {
                html, body {
                  background: white !important;
                }
                .no-print-wrapper {
                  display: none !important;
                }
                .print-container {
                  padding: 0 !important;
                  margin: 0 !important;
                  box-shadow: none !important;
                }
                #document-printable-area, #document-a4-sheet {
                  box-shadow: none !important;
                  margin: 0 !important;
                  border: none !important;
                  gap: 0 !important;
                }
                .a4-page, #document-a4-sheet {
                  position: relative !important;
                  left: auto !important;
                  top: auto !important;
                  transform: none !important;
                  page-break-before: auto !important;
                  page-break-after: always !important;
                  break-after: page !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  box-shadow: none !important;
                  margin: 0 !important;
                  border: none !important;
                  width: 210mm !important;
                  height: 297mm !important;
                  min-height: 297mm !important;
                  max-height: 297mm !important;
                  overflow: hidden !important;
                  background: white !important;
                }
                .a4-page:last-child {
                  page-break-after: auto !important;
                  break-after: auto !important;
                }
              }
              /* Table styling for printed documents (ГОСТ Р 7.0.97) */
              table {
                width: 100% !important;
                border-collapse: collapse !important;
                margin-top: 8px !important;
                margin-bottom: 12px !important;
                font-size: 9.5pt !important;
              }
              table th, table td {
                border: 1px solid #1e293b !important;
                padding: 5px 6px !important;
                vertical-align: middle !important;
                box-sizing: border-box !important;
              }
              table th {
                background-color: #f1f5f9 !important;
                font-weight: bold !important;
                text-align: center !important;
                color: #0f172a !important;
                font-size: 9pt !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print-wrapper {
                background: #1e293b;
                color: white;
                padding: 12px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: 13px;
                font-weight: 600;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                position: sticky;
                top: 0;
                z-index: 9999;
              }
              .no-print-btn {
                background: #4f46e5;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                font-weight: 700;
                cursor: pointer;
                font-size: 13px;
                display: inline-flex;
                align-items: center;
                gap: 6px;
              }
              .no-print-btn:hover {
                background: #4338ca;
              }
              .print-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 20px;
              }
              .a4-page {
                position: relative !important;
                left: auto !important;
                top: auto !important;
                transform: none !important;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
                margin: 0 auto 24px auto !important;
                width: 210mm !important;
                height: 297mm !important;
                min-height: 297mm !important;
                max-height: 297mm !important;
                box-sizing: border-box !important;
                background: white !important;
                overflow: hidden !important;
              }
            </style>
          </head>
          <body>
            <div class="no-print-wrapper">
              <span>Печать документа: ${docTitle}</span>
              <button type="button" class="no-print-btn" onclick="window.print()">
                🖨️ Открыть диалог печати
              </button>
            </div>
            <div class="print-container">
              ${element.outerHTML}
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.focus();
                  window.print();
                }, 350);
              };
            </script>
          </body>
        </html>
      `);
      printWin.document.close();
      return true;
    }
  } catch (err) {
    console.warn('Print popup window creation failed:', err);
  }

  // Method 2: Direct window.print()
  try {
    window.focus();
    window.print();
    return true;
  } catch (err) {
    console.error('Direct window.print failed:', err);
    return false;
  }
}
