'use client';

/** The browser's own print, which is also how it is saved as a PDF. */
export function PrintButton() {
  return (
    <button type="button" className="btn-ghost" onClick={() => window.print()}>
      Print / PDF
    </button>
  );
}
