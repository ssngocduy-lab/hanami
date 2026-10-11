const config = window.HANAMI;
const translations = window.HANAMI_I18N;
const languageTags = { vi: 'vi', en: 'en', zh: 'zh-CN', ja: 'ja' };
const languageSelect = document.querySelector('#language-select');
const types = document.querySelector('#room-types');
const gallery = document.querySelector('#room-gallery');
const form = document.querySelector('#booking-form');
const summary = document.querySelector('#request-summary');
const contacts = document.querySelector('#contact-links');
const lightbox = document.querySelector('#lightbox');
const largeImage = document.querySelector('#lightbox-image');
const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#navigation');
const sections = [...document.querySelectorAll('main section[id]')];
const navLinks = [...nav.querySelectorAll('a')];

let previousFocus;
let lastSummaryData = null;
let currentLanguage = 'vi';
let copy = translations.vi;

document.querySelector('#year').textContent = new Date().getFullYear();

function fill(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
}

function renderRooms() {
  types.replaceChildren();
  config.rooms.forEach(room => {
    const text = copy.rooms[room.id];
    const article = document.createElement('article');
    article.className = 'room-card';
    article.innerHTML = '<div class="room-top"><p class="eyebrow"></p><span></span></div><h3></h3><p class="room-description"></p><p class="room-details"></p><a href="#booking"></a>';
    article.querySelector('.room-top .eyebrow').textContent = text.count;
    article.querySelector('.room-top span').textContent = room.number;
    article.querySelector('h3').textContent = text.name;
    article.querySelector('.room-description').textContent = text.description;
    article.querySelector('.room-details').textContent = text.details;
    const link = article.querySelector('a');
    link.dataset.room = room.id;
    link.textContent = text.action;
    types.append(article);
  });
}

function renderGallery() {
  gallery.replaceChildren();
  config.gallery.forEach((item, index) => {
    const text = copy.gallery[index];
    const figure = document.createElement('figure');
    const button = document.createElement('button');
    button.className = 'image-button';
    button.dataset.image = 'assets/nyby-' + item.id + '-full.webp';
    button.dataset.caption = text.title + copy.galleryCaptionSuffix;
    button.setAttribute('aria-label', fill(copy.galleryAria, { title: text.title }));

    const img = document.createElement('img');
    img.src = 'assets/nyby-' + item.id + '-640.webp';
    img.srcset = 'assets/nyby-' + item.id + '-640.webp 640w, assets/nyby-' + item.id + '-1200.webp 1200w';
    img.sizes = '(max-width:760px) 86vw, 44vw';
    img.width = 1312;
    img.height = 1199;
    img.loading = 'lazy';
    img.alt = text.alt;
    button.append(img);

    const zoom = document.createElement('span');
    zoom.className = 'zoom';
    zoom.setAttribute('aria-hidden', 'true');
    zoom.textContent = copy.galleryView;
    button.append(zoom);

    const caption = document.createElement('figcaption');
    const number = document.createElement('span');
    number.textContent = '0' + (index + 1);
    caption.append(number, document.createTextNode(text.title));
    figure.append(button, caption);
    gallery.append(figure);
  });
}

function renderContacts() {
  contacts.replaceChildren();
  for (const [key, labelKey] of [['phone', 'contactPhone'], ['zalo', 'contactZalo'], ['email', 'contactEmail']]) {
    const value = config.contact[key];
    if (!value) continue;
    const link = document.createElement('a');
    link.textContent = copy[labelKey] + ': ' + value;
    link.href = key === 'phone' ? 'tel:' + value : key === 'email' ? 'mailto:' + value : value;
    contacts.append(link);
  }
  if (config.contact.address) {
    const address = document.createElement('p');
    address.textContent = config.contact.address;
    contacts.append(address);
  }
}

function applyTranslations() {
  document.documentElement.lang = languageTags[currentLanguage];
  document.title = copy.metaTitle;
  document.querySelector('meta[name="description"]').content = copy.metaDescription;
  document.querySelectorAll('[data-i18n]').forEach(element => {
    element.textContent = copy[element.dataset.i18n];
  });
  document.querySelectorAll('[data-i18n-html]').forEach(element => {
    element.innerHTML = copy[element.dataset.i18nHtml];
  });
  for (const [attribute, datasetKey] of [
    ['aria-label', 'i18nAria'],
    ['alt', 'i18nAlt'],
    ['data-caption', 'i18nCaption'],
    ['placeholder', 'i18nPlaceholder']
  ]) {
    const selector = '[data-' + datasetKey.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase()) + ']';
    document.querySelectorAll(selector).forEach(element => {
      element.setAttribute(attribute, copy[element.dataset[datasetKey]]);
    });
  }
  languageSelect.value = currentLanguage;
  renderRooms();
  renderGallery();
  renderContacts();
  for (const name of ['name', 'phone', 'email', 'checkin', 'checkout', 'adults', 'children', 'units']) {
    error(name, '');
  }
  if (!summary.hidden && lastSummaryData) renderSummary(lastSummaryData);
  updateSection();
}

function setLanguage(language, options = {}) {
  if (!translations[language]) return;
  currentLanguage = language;
  copy = translations[language];
  applyTranslations();
  if (options.persist === false) return;
  try { localStorage.setItem('hanami-language', language); } catch {}
  const url = new URL(location.href);
  if (language === 'vi') url.searchParams.delete('lang');
  else url.searchParams.set('lang', language);
  history.replaceState(null, '', url.pathname + url.search + url.hash);
}

function initialLanguage() {
  const parameter = new URL(location.href).searchParams.get('lang');
  if (translations[parameter]) return parameter;
  try {
    const saved = localStorage.getItem('hanami-language');
    if (translations[saved]) return saved;
  } catch {}
  return 'vi';
}

languageSelect.addEventListener('change', () => setLanguage(languageSelect.value));

function closeMenu() {
  nav.classList.remove('open');
  menu.setAttribute('aria-expanded', 'false');
}
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('open', open);
});
navLinks.forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && nav.classList.contains('open')) {
    closeMenu();
    menu.focus();
  }
});

let scheduled = false;
function updateSection() {
  let active = sections[0].id;
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= window.innerHeight * .38) active = section.id;
  }
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 10) active = 'booking';
  navLinks.forEach(link => {
    if (link.hash === '#' + active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  scheduled = false;
}
window.addEventListener('scroll', () => {
  if (!scheduled) {
    scheduled = true;
    requestAnimationFrame(updateSection);
  }
}, { passive: true });
window.addEventListener('resize', updateSection);

document.addEventListener('click', event => {
  const button = event.target.closest('[data-image]');
  if (!button) return;
  previousFocus = button;
  largeImage.src = button.dataset.image;
  largeImage.alt = button.dataset.caption;
  document.querySelector('#lightbox-caption').textContent = button.dataset.caption;
  lightbox.showModal();
  document.body.style.overflow = 'hidden';
});
document.querySelector('.close-lightbox').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', event => {
  if (event.target === lightbox) {
    const box = lightbox.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) lightbox.close();
  }
});
lightbox.addEventListener('close', () => {
  document.body.style.overflow = '';
  previousFocus?.focus();
});

types.addEventListener('click', event => {
  const link = event.target.closest('[data-room]');
  if (!link) return;
  form.elements.room.value = link.dataset.room;
  summary.hidden = true;
  lastSummaryData = null;
});

function localDate(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}
function tomorrow(value) {
  const date = new Date(value + 'T12:00:00');
  date.setDate(date.getDate() + 1);
  return localDate(date);
}
function displayDate(value) {
  return new Intl.DateTimeFormat(languageTags[currentLanguage], { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value + 'T12:00:00'));
}
form.elements.checkin.min = localDate(new Date());
form.elements.checkout.min = tomorrow(localDate(new Date()));
form.elements.checkin.addEventListener('change', () => {
  form.elements.checkout.min = tomorrow(form.elements.checkin.value || localDate(new Date()));
});

function error(name, message) {
  const input = form.elements[name];
  const node = document.querySelector('#error-' + name);
  if (!node) return;
  node.textContent = message;
  if (message) {
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', node.id);
  } else {
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  }
}

function validate(data) {
  const errors = {};
  if (!data.name.trim()) errors.name = copy.errors.name;
  if (!/^[+\d\s().-]{8,25}$/.test(data.phone.trim()) || data.phone.replace(/\D/g, '').length < 8) errors.phone = copy.errors.phone;
  if (data.email && !form.elements.email.validity.valid) errors.email = copy.errors.email;
  if (!data.checkin) errors.checkin = copy.errors.checkin;
  else if (data.checkin < localDate(new Date())) errors.checkin = copy.errors.checkinPast;
  if (!data.checkout) errors.checkout = copy.errors.checkout;
  else if (data.checkout <= (data.checkin || localDate(new Date()))) errors.checkout = copy.errors.checkoutAfter;
  for (const key of ['adults', 'children', 'units']) {
    const number = Number(data[key]);
    const minimum = key === 'children' ? 0 : 1;
    if (data[key] === '' || !Number.isSafeInteger(number) || number < minimum) {
      errors[key] = fill(copy.errors.integer, { min: minimum });
    }
  }
  return errors;
}

function renderSummary(data) {
  summary.replaceChildren();
  const heading = document.createElement('h3');
  heading.textContent = copy.summary.title;
  summary.append(heading);
  const roomName = data.room === 'consult' ? copy.roomConsult : copy.rooms[data.room].name;
  const rows = [
    [copy.summary.guest, data.name],
    [copy.summary.phone, data.phone],
    ...(data.email ? [[copy.formEmail, data.email]] : []),
    [copy.summary.stay, displayDate(data.checkin) + ' – ' + displayDate(data.checkout)],
    [copy.summary.guests, fill(copy.summary.adults, { count: data.adults }) + ' · ' + fill(copy.summary.children, { count: data.children })],
    [copy.summary.choice, roomName + ' · ' + fill(copy.summary.units, { count: data.units })],
    ...(data.message ? [[copy.summary.message, data.message]] : [])
  ];
  rows.forEach(([label, value]) => {
    const paragraph = document.createElement('p');
    paragraph.textContent = label + ': ' + value;
    summary.append(paragraph);
  });
  const note = document.createElement('p');
  note.textContent = copy.summary.note;
  summary.append(note);
  summary.hidden = false;
}

form.addEventListener('input', event => {
  error(event.target.name, '');
  summary.hidden = true;
  lastSummaryData = null;
});
form.addEventListener('change', () => {
  summary.hidden = true;
  lastSummaryData = null;
});
form.addEventListener('submit', event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  for (const name of ['name', 'phone', 'email', 'checkin', 'checkout', 'adults', 'children', 'units']) error(name, '');
  const errors = validate(data);
  if (Object.keys(errors).length) {
    Object.entries(errors).forEach(([name, message]) => error(name, message));
    form.elements[Object.keys(errors)[0]].focus();
    return;
  }
  lastSummaryData = data;
  renderSummary(data);
  summary.focus();
});

setLanguage(initialLanguage(), { persist: false });