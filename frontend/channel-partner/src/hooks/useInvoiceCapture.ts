import { useCallback, useRef, useState } from 'react';
import type { InvoiceData } from '../utils/generateInvoicePdf';

export function useInvoiceCapture() {
  const [pendingDownload, setPendingDownload] = useState<{
    data: InvoiceData;
    type: 'GUEST' | 'PARTNER';
    resolve: () => void;
  } | null>(null);

  const captureRef = useRef<HTMLDivElement>(null);

  const captureAndDownloadInternal = useCallback(async (
    data: InvoiceData,
    type: 'GUEST' | 'PARTNER',
    forBlob?: boolean
  ): Promise<void | Blob> => {
    // Current implementation is a placeholder
    console.log('Capture and download internal', { data, type, forBlob });
    return;
  }, []);

  // Use a temporary approach for overloads if needed, but for now just a single function
  const captureAndDownload = captureAndDownloadInternal;

  return { captureRef, captureAndDownload, pendingDownload, setPendingDownload };
}
