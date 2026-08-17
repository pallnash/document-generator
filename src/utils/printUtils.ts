import { DocumentData } from '../types';

/**
 * Triggers the browser system print dialog for the A4 document sheet (#document-a4-sheet).
 * Uses a dedicated popup window loaded with document styles to bypass iframe sandbox limits.
 */
export function triggerSystemPrint(docData?: DocumentData): boolean {
  const docTitle = docData ? `${docData.docType || 'Документ'} ${docData.refNumber ? '№ ' + docData.refNumber : ''}` : 'Печать документа';
  const element = document.getElementById('document-a4-sheet');

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
                height: 100% !important;
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
                #document-a4-sheet {
                  box-shadow: none !important;
                  margin: 0 !important;
                  border: none !important;
                }
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
                justify-content: center;
                padding: 20px;
              }
              #document-a4-sheet {
                transform: none !important;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
                margin: 0 auto !important;
                width: 210mm !important;
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
