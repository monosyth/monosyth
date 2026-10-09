const grid = document.querySelector('#property-grid');
const dialog = document.querySelector('#property-dialog');
const content = document.querySelector('#dialog-content');
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const propertyHash = id => '#property/' + id;
let currentProperty = null;
let photoIndex = 0;
let returnFocus = null;
const sectionNames = {Essential:'Listing essentials',Construction:'Building & utilities',Dates:'Listing dates & history'};

function render(filter = 'all') {
  const items = properties.filter(p => filter === 'all' || p.kind === filter);
  grid.innerHTML = items.map(p => `<article class="property-card"><a class="card-open" href="${propertyHash(p.id)}" data-property="${p.id}" aria-haspopup="dialog" aria-label="View ${escapeHTML(p.address)}, ${p.price}"><div class="property-photo"><img src="${p.photos[0]}" alt="Exterior of ${escapeHTML(p.address)} in ${p.town}" loading="lazy"><span class="tag">MULTIFAMILY · ${p.kind === 'duplex' ? 'DUPLEX' : p.units + ' UNITS'}</span><span class="photo-count">${p.photos.length} photos</span></div><div class="card-body"><div class="card-top"><h3>${escapeHTML(p.address)}</h3><span class="price">${p.price}</span></div><p class="town">${p.town}, Vermont</p><div class="card-bottom"><span class="features">${p.units} units &nbsp;·&nbsp; ${p.area}</span><span class="detail-button">View property ↗</span></div></div></a></article>`).join('');
  document.querySelector('#result-count').textContent = `${items.length} properties`;
}
render();
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-filter]').forEach(b => {
    b.classList.toggle('selected', b === button);
    b.setAttribute('aria-pressed', String(b === button));
  });
  render(button.dataset.filter);
}));

function factRows(fields) {
  return `<dl class="fact-list">${fields.map(([label, value]) => `<div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>`).join('')}</dl>`;
}
function openProperty(p) {
  if (dialog.open && currentProperty?.id === p.id) return;
  currentProperty = p;
  photoIndex = 0;
  const facts = Object.fromEntries(p.sections.flatMap(section => section.fields));
  const sectionOrder = ['Essential', 'Construction', 'Exterior', 'Location', 'Schools', 'Dates'];
  const sections = [...p.sections].sort((a, b) => sectionOrder.indexOf(a.title) - sectionOrder.indexOf(b.title));
  const email = `mailto:MichelleHebert@kw.com?subject=${encodeURIComponent('Property information: ' + p.address + ' | MLS ' + p.mls)}`;
  content.innerHTML = `<div class="property-gallery" aria-label="Listing photos for ${escapeHTML(p.address)}"><div class="gallery-stage"><img id="gallery-photo" src="${p.photos[0]}" alt="${escapeHTML(p.address)} — MLS listing photo 1 of ${p.photos.length}"><button class="gallery-arrow gallery-prev" data-gallery-step="-1" aria-label="Previous listing photo">‹</button><button class="gallery-arrow gallery-next" data-gallery-step="1" aria-label="Next listing photo">›</button><span class="gallery-counter" id="gallery-counter" aria-live="polite">1 / ${p.photos.length}</span></div><div class="gallery-thumbs" aria-label="Choose a listing photo">${p.photos.map((src, index) => `<button data-photo="${index}" aria-label="Show listing photo ${index + 1}" aria-pressed="${index === 0}"><img src="${src}" alt="" loading="lazy"></button>`).join('')}</div></div>
  <div class="property-detail-body"><header class="property-detail-heading"><div><p class="eyebrow">${escapeHTML(p.town.toUpperCase())}, VERMONT 05641</p><h2 id="dialog-title">${escapeHTML(p.address)}</h2><p class="detail-subtitle"><span class="listing-status">${p.status}</span> Multifamily <span>·</span> MLS #${p.mls}</p></div><p class="detail-price">${p.price}<span>Asking price</span></p></header>
  <dl class="quick-facts"><div><dt>Residences</dt><dd>${p.units} units</dd></div><div><dt>Finished area, approx.</dt><dd>${p.area}</dd></div><div><dt>Lot size</dt><dd>${p.lot}</dd></div><div><dt>Year built</dt><dd>${p.year}</dd></div><div><dt>Annual tax · ${facts['Tax Year']}</dt><dd>${facts['Tax Amount']}</dd></div></dl>
  <div class="property-intro-grid"><section class="property-overview"><h3>At home in ${p.town}.</h3><p>${escapeHTML(p.summary)}</p><span class="source-caption">Overview summarized from the MLS description.</span></section><aside class="property-contact"><p class="eyebrow">YOUR LOCAL CONTACT</p><h3>Michelle Hebert</h3><p>KW Vermont – Montpelier</p><a class="button" href="${email}">Request details or a showing ↗</a><a class="text-link" href="tel:+18022490921">Call 802-249-0921</a></aside></div>
  <section class="layout-section"><div><p class="eyebrow">THE LAYOUT</p><h3>Units & occupancy</h3></div>${factRows(p.layout)}<p class="source-caption">Unit information above comes from the public MLS description. Ask Michelle for current availability, a rent roll, lease details and floor plans; these documents are not included in the public record.</p></section>
  <section class="mls-details" aria-labelledby="mls-details-title"><div class="details-heading"><div><p class="eyebrow">FROM THE LISTING</p><h3 id="mls-details-title">Property details</h3></div><a class="text-link" href="${p.sourceUrl}" target="_blank" rel="noopener">View source on PrimeMLS ↗</a></div><p class="source-caption">All ${p.sections.reduce((n,s)=>n+s.fields.length,0)} fields displayed in the public PrimeMLS details are included below, with their original labels and values. Checked ${p.checked}; MLS latest update ${p.updated}.</p><div class="detail-sections">${sections.map(section => `<section class="detail-section"><h4>${sectionNames[section.title] || section.title}</h4>${factRows(section.fields)}${section.title === 'Dates' && facts['Days On Market'] ? '<p class="source-caption">Days On Market is the value displayed by the source, not a count recalculated today.</p>' : ''}</section>`).join('')}</div></section>
  <footer class="property-source"><p>Listing courtesy of Michelle Hebert, KW Vermont – Montpelier / PrimeMLS. Photographs are the listing’s original images.</p><p>Public listing snapshot checked ${p.checked}. Information is believed reliable but is not guaranteed. Confirm current price, status, measurements, school assignments and property details with Michelle. Financial projections and private agent-only fields are not included.</p><div class="actions"><button class="text-link share-property" type="button">Copy property link ↗</button><span class="copy-status" role="status"></span></div></footer></div>`;
  if (!dialog.open) {
    returnFocus = document.activeElement;
    dialog.showModal();
    document.documentElement.classList.add('property-open');
  }
  dialog.scrollTop = 0;
  document.querySelector('.property-close').focus({preventScroll:true});
}
function changePhoto(index) {
  if (!currentProperty) return;
  photoIndex = (index + currentProperty.photos.length) % currentProperty.photos.length;
  const img = document.querySelector('#gallery-photo');
  img.src = currentProperty.photos[photoIndex];
  img.alt = `${currentProperty.address} — MLS listing photo ${photoIndex + 1} of ${currentProperty.photos.length}`;
  document.querySelector('#gallery-counter').textContent = `${photoIndex + 1} / ${currentProperty.photos.length}`;
  document.querySelectorAll('[data-photo]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.photo) === photoIndex)));
}
function closeView() {
  if (dialog.open) dialog.close();
  document.documentElement.classList.remove('property-open');
  currentProperty = null;
  if (returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
}
function syncRoute() {
  const id = location.hash.startsWith('#property/') ? location.hash.slice(10) : null;
  const p = properties.find(p => p.id === id);
  if (p) openProperty(p); else closeView();
}
function requestClose() {
  if (history.state?.propertyView) history.back();
  else {history.replaceState(null, '', '#properties'); closeView();}
}
grid.addEventListener('click', event => {
  const link = event.target.closest('[data-property]');
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  history.pushState({propertyView:true}, '', link.getAttribute('href'));
  syncRoute();
});
dialog.addEventListener('click', async event => {
  const photo = event.target.closest('[data-photo]');
  const arrow = event.target.closest('[data-gallery-step]');
  if (photo) changePhoto(Number(photo.dataset.photo));
  if (arrow) changePhoto(photoIndex + Number(arrow.dataset.galleryStep));
  if (event.target.closest('.share-property')) {
    const status = dialog.querySelector('.copy-status');
    try {await navigator.clipboard.writeText(location.href); status.textContent = 'Property link copied.';}
    catch {status.textContent = 'Copy this property’s address from your browser’s address bar.';}
  }
  if (event.target === dialog) {
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) requestClose();
  }
});
dialog.addEventListener('keydown', event => {
  if (!event.target.closest('.property-gallery')) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault(); changePhoto(photoIndex + (event.key === 'ArrowRight' ? 1 : -1));
  }
});
document.querySelector('.property-close').addEventListener('click', requestClose);
dialog.addEventListener('cancel', event => {event.preventDefault(); requestClose();});
window.addEventListener('popstate', syncRoute);
window.addEventListener('hashchange', syncRoute);
syncRoute();
const menu = document.querySelector('.menu'), nav = document.querySelector('#navigation');
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open);
});
nav.addEventListener('click', event => {
  if (event.target.closest('a')) {menu.setAttribute('aria-expanded', 'false'); nav.classList.remove('open');}
});
