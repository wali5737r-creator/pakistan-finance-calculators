// Shared copy/print behaviour for every tool page. No user input is
// ever placed in a URL, analytics event, or storage (SRS G3).
//
// This file is served as an external script (public/js/shared.js) so the
// Content-Security-Policy can drop 'unsafe-inline' from script-src. It
// used to be an inline <script> in Layout.astro; Astro inlines scripts
// without imports, which forced script-src 'unsafe-inline' on every page.
document.addEventListener('click', async (event) => {
  const target = event.target;
  const copyBtn = target.closest('[data-copy-result]');
  if (copyBtn) {
    const source = document.querySelector('[data-result-text]');
    const text = source ? source.textContent.trim() : '';
    const status = document.querySelector('[data-copy-status]');
    try {
      await navigator.clipboard.writeText(text);
      if (status) status.textContent = 'Result copied.';
      copyBtn.textContent = 'Copied ✓';
      setTimeout(() => { copyBtn.textContent = 'Copy result'; }, 2000);
    } catch {
      if (status) status.textContent = 'Copy did not work in this browser. Select the result text and copy it manually.';
    }
    return;
  }
  const printBtn = target.closest('[data-print-result]');
  if (printBtn) window.print();
});
