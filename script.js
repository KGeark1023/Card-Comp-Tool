const STORAGE_KEY = 'card-comp-tool-cards';

const compSites = [
  {
    id: 'sportscardpro',
    name: 'Sports Card Pro',
    template: 'https://www.sportscardpro.com/search?q={{card}}',
    description: 'Search Sports Card Pro for the current card set.'
  },
  {
    id: 'cardladder',
    name: 'Card Ladder',
    template: 'https://www.cardladder.com/search?q={{card}}',
    description: 'Open the current set on Card Ladder.'
  },
  {
    id: 'point120',
    name: '120 Point',
    template: 'https://www.120point.com/search?q={{card}}',
    description: 'Search the current grouped set on 120 Point.'
  },
  {
    id: 'foilsnap',
    name: 'Foil Snap',
    template: 'https://www.foilsnap.com/search?q={{card}}',
    description: 'Search Foil Snap for the current card set.'
  },
  {
    id: 'ebay',
    name: 'eBay',
    template: 'https://www.ebay.com/sch/i.html?_nkw={{card}}',
    description: 'Search the current grouped card set on eBay.'
  }
];

const form = document.getElementById('cardForm');
const siteTargets = document.getElementById('siteTargets');
const cardList = document.getElementById('cardList');
const averageComp = document.getElementById('averageComp');
const cardCount = document.getElementById('cardCount');
const cardPhotoInput = document.getElementById('cardPhoto');
const photoPreview = document.getElementById('photoPreview');
const runOcrButton = document.getElementById('runOcr');
const applyOcrButton = document.getElementById('applyOcr');
const ocrText = document.getElementById('ocrText');
const ocrStatus = document.getElementById('ocrStatus');

let cards = loadCards();
let currentPhotoUrl = null;
let currentOcrText = '';

function loadCards() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    return [];
  }
}

function saveCards() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(value);
}

function resetPhotoState() {
  if (currentPhotoUrl) {
    URL.revokeObjectURL(currentPhotoUrl);
    currentPhotoUrl = null;
  }
  photoPreview.hidden = true;
  photoPreview.removeAttribute('src');
  ocrText.value = '';
  currentOcrText = '';
  ocrStatus.textContent = 'No photo scanned yet.';
}

function applyOcrToForm() {
  const lines = currentOcrText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    ocrStatus.textContent = 'No OCR text available to apply.';
    return;
  }

  const existingName = document.getElementById('cardName').value.trim();
  const existingPlayer = document.getElementById('player').value.trim();
  const existingYear = document.getElementById('year').value.trim();
  const existingCardNumber = document.getElementById('cardNumber').value.trim();

  if (!existingName) {
    document.getElementById('cardName').value = lines[0];
  }

  const yearMatch = currentOcrText.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch && !existingYear) {
    document.getElementById('year').value = yearMatch[1];
  }

  const cardNumberMatch = currentOcrText.match(/(?:card\s*#|#)\s*([A-Za-z0-9\-\/]+)/i);
  if (cardNumberMatch && !existingCardNumber) {
    document.getElementById('cardNumber').value = cardNumberMatch[1];
  }

  const playerCandidate = lines.find((line) => {
    const normalized = line.replace(/\s+/g, ' ').trim();
    return /^[A-Z][A-Za-z0-9'\-\.]+(?:\s+[A-Z][A-Za-z0-9'\-\.]+){1,2}$/.test(normalized)
      && !/^(Topps|Panini|Bowman|Fleer|Upper Deck|NBA Hoops|Prizm|Chrome|Donruss|Select|Mosaic|Optic|Foil|Snap|Sports Card Pro|Card Ladder|120 Point|eBay)$/i.test(normalized)
      && !/^(Baseball|Basketball|Football|Soccer|Hockey|WNBA|Pokémon|Other)$/i.test(normalized)
      && !/^(\d{4})$/.test(normalized);
  });

  if (playerCandidate && !existingPlayer) {
    document.getElementById('player').value = playerCandidate;
  }

  ocrStatus.textContent = 'OCR text applied to the form.';
}

function averagePrice() {
  if (!cards.length) return 0;
  return cards.reduce((sum, card) => sum + Number(card.price), 0) / cards.length;
}

function buildSearchTerm(card) {
  const parts = [
    card.player,
    card.name,
    card.manufacturerSet,
    card.year ? `(${card.year})` : '',
    card.cardNumber,
    card.parallel,
    card.serialNumber
  ].filter(Boolean).map(part => String(part).trim());

  return parts.join(' ');
}

function renderSites() {
  siteTargets.innerHTML = '';

  compSites.forEach((site) => {
    const option = document.createElement('label');
    option.className = 'site-option';
    option.innerHTML = `
      <input type="checkbox" checked data-site-id="${site.id}" />
      <span>
        <span class="site-title">${site.name}</span>
        <span class="site-copy">${site.description}</span>
      </span>
    `;
    siteTargets.appendChild(option);
  });
}

function renderCards() {
  cardCount.textContent = String(cards.length);
  averageComp.textContent = formatCurrency(averagePrice());

  if (!cards.length) {
    cardList.innerHTML = '<div class="empty-state">Add a card to start tracking comps and sending them to multiple sites.</div>';
    return;
  }

  cardList.innerHTML = cards.map((card) => {
    const metaParts = [
      card.sport,
      card.manufacturerSet,
      card.year ? `Year ${card.year}` : '',
      card.player,
      card.cardNumber ? `Card # ${card.cardNumber}` : '',
      card.parallel || 'Base',
      card.serialNumber ? `Serial ${card.serialNumber}` : '',
      card.gradeStatus,
      card.autograph,
      card.rookieCard
    ].filter(Boolean);

    const note = card.notes ? `<span class="card-meta">Notes: ${escapeHtml(card.notes)}</span>` : '';

    return `
      <article class="card-item">
        <div class="card-title">
          <span class="card-name">${escapeHtml(card.name || card.player)}</span>
          <span class="card-meta">${escapeHtml(metaParts.join(' • '))}</span>
          ${note}
          <span class="card-meta">Added ${new Date(card.id).toLocaleString()}</span>
        </div>
        <span class="comp-pill">${formatCurrency(Number(card.price))}</span>
        <span class="count-pill">#${cards.indexOf(card) + 1}</span>
        <button class="remove-btn" data-remove-id="${card.id}" type="button">Remove</button>
      </article>
    `;
  }).join('');
}

function sendToSelectedSites() {
  const selectedSites = [...document.querySelectorAll('[data-site-id]:checked')]
    .map((checkbox) => compSites.find((site) => site.id === checkbox.dataset.siteId))
    .filter(Boolean);

  if (!selectedSites.length) {
    window.alert('Select at least one comps destination first.');
    return;
  }

  if (!cards.length) {
    window.alert('Add at least one card before sending.');
    return;
  }

  const combinedQuery = cards
    .map((card) => buildSearchTerm(card).trim())
    .filter(Boolean)
    .join(' ');

  selectedSites.forEach((site) => {
    const url = site.template.replace('{{card}}', encodeURIComponent(combinedQuery));
    window.open(url, '_blank', 'noopener');
  });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = document.getElementById('cardName').value.trim();
  const sport = document.getElementById('sport').value;
  const manufacturerSet = document.getElementById('manufacturerSet').value;
  const year = document.getElementById('year').value;
  const player = document.getElementById('player').value.trim();
  const cardNumber = document.getElementById('cardNumber').value.trim();
  const parallel = document.getElementById('parallel').value;
  const serialNumber = document.getElementById('serialNumber').value.trim();
  const gradeStatus = document.getElementById('gradeStatus').value;
  const autograph = document.getElementById('autograph').value;
  const rookieCard = document.getElementById('rookieCard').value;
  const notes = document.getElementById('notes').value.trim();
  const price = Number(document.getElementById('cardPrice').value);

  if (!sport || !manufacturerSet || !year || !player || !gradeStatus || Number.isNaN(price)) return;

  cards.unshift({
    id: Date.now(),
    name,
    sport,
    manufacturerSet,
    year,
    player,
    cardNumber,
    parallel,
    serialNumber,
    gradeStatus,
    autograph,
    rookieCard,
    notes,
    price
  });

  saveCards();
  renderCards();
  form.reset();
  resetPhotoState();
  cardPhotoInput.value = '';
  document.getElementById('sport').value = '';
  document.getElementById('manufacturerSet').value = '';
  document.getElementById('gradeStatus').value = '';
  document.getElementById('parallel').value = 'Base';
  document.getElementById('autograph').value = 'No auto';
  document.getElementById('rookieCard').value = 'No';
});

document.getElementById('clearCards').addEventListener('click', () => {
  cards = [];
  saveCards();
  resetPhotoState();
  cardPhotoInput.value = '';
  renderCards();
});

cardList.addEventListener('click', (event) => {
  const removeButton = event.target.closest('[data-remove-id]');
  if (!removeButton) return;

  const removeId = Number(removeButton.dataset.removeId);
  cards = cards.filter((card) => card.id !== removeId);
  saveCards();
  renderCards();
});

async function recognizeUploadedPhoto() {
  const file = cardPhotoInput.files[0];

  if (!file) {
    ocrStatus.textContent = 'Upload a card photo first.';
    return;
  }

  if (!window.Tesseract) {
    ocrStatus.textContent = 'OCR is unavailable right now.';
    return;
  }

  if (currentPhotoUrl) {
    URL.revokeObjectURL(currentPhotoUrl);
  }

  currentPhotoUrl = URL.createObjectURL(file);
  photoPreview.src = currentPhotoUrl;
  photoPreview.hidden = false;
  ocrStatus.textContent = 'Reading card text...';
  runOcrButton.disabled = true;
  applyOcrButton.disabled = true;

  try {
    const worker = await Tesseract.createWorker('eng');
    const { data } = await worker.recognize(file);
    await worker.terminate();

    currentOcrText = data.text.trim();
    ocrText.value = currentOcrText;
    ocrStatus.textContent = 'Card text recognized.';
    applyOcrButton.disabled = false;
  } catch (error) {
    ocrStatus.textContent = 'OCR failed. Try a clearer photo.';
    console.error(error);
  } finally {
    runOcrButton.disabled = false;
  }
}

cardPhotoInput.addEventListener('change', recognizeUploadedPhoto);
runOcrButton.addEventListener('click', recognizeUploadedPhoto);
applyOcrButton.addEventListener('click', applyOcrToForm);

applyOcrButton.disabled = true;
resetPhotoState();

document.getElementById('sendToSites').addEventListener('click', sendToSelectedSites);

renderSites();
renderCards();
