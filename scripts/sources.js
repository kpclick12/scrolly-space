const sources = document.querySelector('.sources-list');

function openSource(hash) {
  if (!hash.startsWith('#source-')) return;
  const entry = document.getElementById(hash.slice(1));
  if (!entry || !sources?.contains(entry)) return;
  const details = entry.querySelector('details');
  if (details) details.open = true;
}

// Open before the browser follows a citation, including repeated visits to the same hash.
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#source-"]');
  if (link) openSource(link.getAttribute('href'));
});
window.addEventListener('hashchange', () => openSource(location.hash));
openSource(location.hash);

// Print the full references and restore the reader's chosen state afterwards.
let closedBeforePrint = [];
window.addEventListener('beforeprint', () => {
  closedBeforePrint = [...(sources?.querySelectorAll('details:not([open])') ?? [])];
  closedBeforePrint.forEach(details => { details.open = true; });
});
window.addEventListener('afterprint', () => {
  closedBeforePrint.forEach(details => { details.open = false; });
  closedBeforePrint = [];
});
