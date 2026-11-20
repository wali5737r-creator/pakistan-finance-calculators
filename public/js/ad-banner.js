// Adsterra Banner 728x90 — unit options (Pakistan Finance Calculators ONLY;
// the WolfTyping site has its own, different unit — never mix the keys).
//
// The Adsterra snippet for this unit sets an inline `atOptions` object and
// then loads the invoke script. The inline half lives in this external file
// instead, so the CSP script-src needs no 'unsafe-inline' (guarded by
// tests/csp.test.ts). Layout.astro loads this file synchronously, directly
// before the invoke script (https://bauval.org/22/3e76464b4ebe0e045c83a7f62e1f7724),
// which reads window.atOptions and inserts its iframe where the script sits.
window.atOptions = {
  'key': '3e76464b4ebe0e045c83a7f62e1f7724',
  'format': 'iframe',
  'height': 90,
  'width': 728,
  'params': {}
};
