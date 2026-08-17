import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface DocumentBarcodeProps {
  date: string;
  refNumber: string;
  id?: string;
  className?: string;
  showText?: boolean;
}

/**
 * Builds a valid 12-digit UPC-A barcode number based on document date, reference number and ID.
 * UPC-A requires exactly 12 numeric digits (11 data digits + 1 checksum digit).
 */
export function buildUpcA12Digits(date: string, refNumber: string, id?: string): string {
  // Extract pure digits from inputs
  const cleanDate = (date || '').replace(/\D/g, '');
  const cleanRef = (refNumber || '').replace(/\D/g, '');
  const cleanId = (id || '').replace(/\D/g, '');

  const combinedDigits = `${cleanDate}${cleanRef}${cleanId}`;
  
  let digits11 = '';
  if (combinedDigits.length >= 11) {
    digits11 = combinedDigits.slice(0, 11);
  } else if (combinedDigits.length > 0) {
    digits11 = combinedDigits.padEnd(11, '0');
  } else {
    digits11 = '20260806001'; // Default 11-digit fallback
  }

  // Calculate standard UPC-A 12th check digit
  let sumOdd = 0;
  let sumEven = 0;
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(digits11[i], 10);
    if (i % 2 === 0) { // 0, 2, 4, 6, 8, 10
      sumOdd += digit;
    } else { // 1, 3, 5, 7, 9
      sumEven += digit;
    }
  }
  const total = sumOdd * 3 + sumEven;
  const rem = total % 10;
  const checkDigit = rem === 0 ? 0 : 10 - rem;

  return `${digits11}${checkDigit}`;
}

export const DocumentBarcode: React.FC<DocumentBarcodeProps> = ({
  date,
  refNumber,
  id,
  className = '',
  showText = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const upcCodeValue = buildUpcA12Digits(date, refNumber, id);

  useEffect(() => {
    if (canvasRef.current && upcCodeValue) {
      try {
        JsBarcode(canvasRef.current, upcCodeValue, {
          format: 'UPC',
          width: 1.3,
          height: 28,
          displayValue: showText,
          text: upcCodeValue,
          fontSize: 10,
          font: 'Arial, monospace',
          margin: 0,
          marginTop: 2,
          marginBottom: 2,
          background: '#ffffff',
          lineColor: '#0f172a',
        });
      } catch (err) {
        console.warn('UPC-A Barcode canvas rendering fallback:', err);
        try {
          JsBarcode(canvasRef.current, upcCodeValue, {
            format: 'CODE128',
            width: 1.2,
            height: 26,
            displayValue: showText,
            fontSize: 9,
            background: '#ffffff',
            lineColor: '#0f172a',
          });
        } catch (e) {
          console.error('Barcode render failed completely:', e);
        }
      }
    }
  }, [upcCodeValue, showText]);

  return (
    <div className={`inline-block select-none ${className}`}>
      <canvas ref={canvasRef} className="max-w-[180px] h-auto block" />
    </div>
  );
};
