import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

const MAX_PAGES = 100;

/**
 * Shows a PDF's pages as images, so PDFs can be read inside the app on every
 * device (most phone browsers can't show PDFs inline). pdf.js is loaded only
 * when a PDF is opened; its "legacy" build is used because it includes
 * polyfills that older phone browsers need. Calls `onError` if the file can't be displayed.
 */
export function PdfPreview({ blob, onError }) {
  const container = useRef(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [truncated, setTruncated] = useState(0);
  const onErrorRef = useRef(onError);
  useLayoutEffect(() => {
    onErrorRef.current = onError;
  });

  useEffect(() => {
    let cancelled = false;
    let task;

    (async () => {
      try {
        const [pdfjs, worker] = await Promise.all([
          import("pdfjs-dist/legacy/build/pdf.min.mjs"),
          import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
        ]);
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false });
        const pdf = await task.promise;

        const el = container.current;
        if (cancelled || !el) return;
        el.replaceChildren();
        const width = el.clientWidth;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const pages = Math.min(pdf.numPages, MAX_PAGES);

        for (let n = 1; n <= pages; n++) {
          const page = await pdf.getPage(n);
          if (cancelled) return;
          const scale = (width / page.getViewport({ scale: 1 }).width) * ratio;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = "100%";
          canvas.className = "rounded-md bg-white shadow-md";
          canvas.setAttribute("aria-label", `Page ${n} of ${pdf.numPages}`);
          canvas.setAttribute("role", "img");
          el.appendChild(canvas);
          await page.render({ canvas, viewport }).promise;
          if (n === 1 && !cancelled) setStatus("ready");
        }
        if (!cancelled) setTruncated(Math.max(0, pdf.numPages - pages));
      } catch (err) {
        if (!cancelled) {
          console.warn("PDF preview failed", err);
          setStatus("error");
          onErrorRef.current?.();
        }
      }
    })();

    return () => {
      cancelled = true;
      task?.destroy().catch(() => {});
    };
  }, [blob]);

  if (status === "error") return null;

  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-6">
      {status === "loading" && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500 dark:text-slate-400" aria-label="Loading PDF" />
        </div>
      )}
      <div ref={container} className="flex flex-col gap-3" />
      {truncated > 0 && (
        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          {truncated} more pages — use Download to see the whole PDF.
        </p>
      )}
    </div>
  );
}
