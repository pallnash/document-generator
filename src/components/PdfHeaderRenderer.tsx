import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { TEPLOMASH_HEADER_PNG_DATA_URL } from '../constants/teplomashHeaderPng';

// Set up PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

interface PdfHeaderRendererProps {
  url: string;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
}

export const PdfHeaderRenderer: React.FC<PdfHeaderRendererProps> = ({
  url,
  className = '',
  style = {},
  alt = 'Фирменный бланк (PDF)'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPdf = url.toLowerCase().includes('.pdf') || url.startsWith('data:application/pdf');

  useEffect(() => {
    let isMounted = true;

    if (!isPdf) {
      setIsRendered(false);
      return;
    }

    const renderPdfToCanvas = async () => {
      try {
        setError(null);
        const loadingTask = pdfjsLib.getDocument({ url } as any);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        if (!isMounted || !canvasRef.current) return;

        // Use a high-density viewport scale (2.5x - 3x) for crisp print rendering
        const scale = 2.5;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas
        };

        await (page.render as any)(renderContext).promise;
        if (isMounted) {
          setIsRendered(true);
        }
      } catch (err: any) {
        console.warn('PDF.js render failed, falling back to object/img:', err);
        if (isMounted) {
          setError(err?.message || 'Error rendering PDF');
        }
      }
    };

    renderPdfToCanvas();

    return () => {
      isMounted = false;
    };
  }, [url, isPdf]);

  if (!isPdf) {
    return (
      <img
        src={url}
        alt={alt}
        className={className}
        style={style}
      />
    );
  }

  return (
    <div className={`relative w-full ${className}`} style={style}>
      <canvas
        ref={canvasRef}
        className={`w-full h-auto block ${isRendered ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150`}
        style={{ width: '100%', height: 'auto' }}
      />
      
      {/* Fallback if canvas rendering encountered an issue */}
      {!isRendered && error && (
        <object
          data={url}
          type="application/pdf"
          className="w-full h-32 block border-0"
        >
          <img
            src={TEPLOMASH_HEADER_PNG_DATA_URL}
            alt={alt}
            className="w-full h-auto block"
          />
        </object>
      )}
    </div>
  );
};
