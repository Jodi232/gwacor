/* =============================================
   GWACOR — SISTEM KASIR
   app.js
   ============================================= */

// =============================================
// DATA MENU — tambah atau ubah item di sini
// =============================================
const MENU = [
  { id: 1, name: 'Es Cendol',   price: 20000, emoji: '🥤' },
  { id: 2, name: 'Ayam Tjilik', price: 30000, emoji: '🍗' },
];

// =============================================
// STATE
// =============================================
let cart         = [];
let transactions = JSON.parse(localStorage.getItem('gwacor_trx') || '[]');
let totalBayar   = 0;

// =============================================
// INIT
// =============================================
function init() {
  renderMenu();
  updateClock();
  setInterval(updateClock, 1000);
  updateStats();
  renderRiwayat();

  const today = new Date();
  const opts  = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const tgl   = today.toLocaleDateString('id-ID', opts);

  document.getElementById('tanggal-display').textContent  = tgl;
  document.getElementById('tanggal-riwayat').textContent  = tgl;
}

function updateClock() {
  const now = new Date();
  document.getElementById('clock-display').textContent =
    now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

// =============================================
// RENDER MENU CARDS
// =============================================
function renderMenu() {
  const grid = document.getElementById('menu-grid');
  grid.innerHTML = MENU.map(item => `
    <div class="menu-card" onclick="addToCart(${item.id})">
      <div class="menu-add-btn">+</div>
      <span class="menu-emoji">${item.emoji}</span>
      <div class="menu-name">${item.name}</div>
      <div class="menu-price">${formatRp(item.price)}</div>
    </div>
  `).join('');
}

// =============================================
// CART — TAMBAH / UBAH QTY
// =============================================
function addToCart(id) {
  const item     = MENU.find(m => m.id === id);
  const existing = cart.find(c => c.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...item, qty: 1 });
  }
  renderCart();
}

function changeQty(id, delta) {
  const idx = cart.findIndex(c => c.id === id);
  if (idx === -1) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  renderCart();
}

function renderCart() {
  const container = document.getElementById('order-items');

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="order-empty">
        <span class="empty-icon">🛒</span>
        Belum ada pesanan.<br>Pilih menu untuk menambahkan.
      </div>`;
    document.getElementById('total-display').textContent    = 'Rp 0';
    document.getElementById('bayar-btn').disabled           = true;
    document.getElementById('kembalian-result').style.display = 'none';
    document.getElementById('bayar-input').value            = '';
    return;
  }

  const total = getTotal();

  container.innerHTML = cart.map(item => `
    <div class="order-item">
      <span class="order-item-emoji">${item.emoji}</span>
      <div class="order-item-info">
        <div class="order-item-name">${item.name}</div>
        <div class="order-item-price">${formatRp(item.price)} / pcs</div>
      </div>
      <div class="qty-control">
        <button class="qty-btn minus" onclick="changeQty(${item.id}, -1)">−</button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
      </div>
      <div class="item-subtotal">${formatRp(item.price * item.qty)}</div>
    </div>
  `).join('');

  document.getElementById('total-display').textContent = formatRp(total);
  document.getElementById('bayar-btn').disabled        = false;
  hitungKembalian();
}

function getTotal() {
  return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function clearOrder() {
  cart = [];
  renderCart();
}

// =============================================
// KALKULATOR KEMBALIAN
// =============================================
function setBayar(amount) {
  document.getElementById('bayar-input').value = amount;
  hitungKembalian();
}

function hitungKembalian() {
  const total     = getTotal();
  const bayar     = parseInt(document.getElementById('bayar-input').value) || 0;
  const kembalian = bayar - total;
  const resultEl  = document.getElementById('kembalian-result');
  const valEl     = document.getElementById('kembalian-val');
  totalBayar      = bayar;

  if (bayar === 0) {
    resultEl.style.display = 'none';
    return;
  }

  resultEl.style.display = 'flex';
  valEl.textContent       = formatRp(Math.abs(kembalian));
  valEl.className         = 'kembalian-val ' + (kembalian >= 0 ? 'positive' : 'negative');
  document.getElementById('bayar-btn').disabled = cart.length === 0 || kembalian < 0;
}

// =============================================
// PROSES PEMBAYARAN
// =============================================
function prosesBayar() {
  const total = getTotal();
  const bayar = parseInt(document.getElementById('bayar-input').value) || 0;

  if (bayar < total) {
    showToast('⚠️ Uang bayar kurang!');
    return;
  }

  const customer  = document.getElementById('customer-name').value.trim() || 'Umum';
  const kembalian = bayar - total;
  const now       = new Date();

  const trx = {
    id:       Date.now(),
    no:       transactions.length + 1,
    time:     now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    date:     now.toLocaleDateString('id-ID'),
    customer,
    items:    cart.map(i => ({
      name:     i.name,
      qty:      i.qty,
      price:    i.price,
      subtotal: i.price * i.qty,
      emoji:    i.emoji,
    })),
    total,
    bayar,
    kembalian,
  };

  transactions.push(trx);
  localStorage.setItem('gwacor_trx', JSON.stringify(transactions));

  showReceipt(trx);
  clearOrder();

  document.getElementById('customer-name').value = '';
  document.getElementById('bayar-input').value   = '';
  updateStats();
  renderRiwayat();
}

// =============================================
// RECEIPT MODAL
// =============================================
function showReceipt(trx) {
  const overlay       = document.createElement('div');
  overlay.className   = 'modal-overlay';
  overlay.innerHTML   = `
    <div class="receipt-modal">
      <div class="receipt-title">
        <h3>✅ Pembayaran Berhasil</h3>
        <p>${trx.date} — ${trx.time}</p>
      </div>
      <div class="receipt-customer">👤 ${trx.customer}</div>
      <hr class="receipt-divider">
      ${trx.items.map(i => `
        <div class="receipt-row">
          <span>${i.emoji} ${i.name} × ${i.qty}</span>
          <span style="font-family:var(--mono)">${formatRp(i.subtotal)}</span>
        </div>
      `).join('')}
      <hr class="receipt-divider">
      <div class="receipt-row bold">
        <span>Total</span>
        <span style="font-family:var(--mono); color:var(--accent2)">${formatRp(trx.total)}</span>
      </div>
      <div class="receipt-row" style="color:var(--muted); font-size:13px">
        <span>Dibayar</span>
        <span style="font-family:var(--mono)">${formatRp(trx.bayar)}</span>
      </div>
      <div class="receipt-row kembalian-row-receipt">
        <span>Kembalian</span>
        <span>${formatRp(trx.kembalian)}</span>
      </div>
      <div class="receipt-btn-row">
        <button class="btn-close-receipt" onclick="closeReceipt()">Tutup Struk</button>
        <button class="btn-primary" style="flex:1; padding:11px; font-size:14px" onclick="closeReceipt()">✓ Selesai</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function closeReceipt() {
  const overlay = document.querySelector('.modal-overlay');
  if (overlay) overlay.remove();
}

// =============================================
// RIWAYAT TRANSAKSI
// =============================================
function renderRiwayat() {
  const tbody = document.getElementById('riwayat-tbody');
  const empty = document.getElementById('empty-riwayat');

  if (transactions.length === 0) {
    tbody.innerHTML      = '';
    empty.style.display  = 'block';
    return;
  }

  empty.style.display = 'none';
  tbody.innerHTML = [...transactions].reverse().map(trx => `
    <tr>
      <td class="td-no">#${trx.no}</td>
      <td class="td-time">${trx.time}</td>
      <td class="td-customer">${trx.customer}</td>
      <td class="td-items">${trx.items.map(i => `${i.emoji} ${i.name} ×${i.qty}`).join(', ')}</td>
      <td class="td-total">${formatRp(trx.total)}</td>
      <td class="td-mono">${formatRp(trx.bayar)}</td>
      <td class="td-mono-grn">${formatRp(trx.kembalian)}</td>
      <td><span class="badge">✓ Lunas</span></td>
    </tr>
  `).join('');
}

function updateStats() {
  const total = transactions.reduce((s, t) => s + t.total, 0);
  const items = transactions.reduce((s, t) => s + t.items.reduce((si, i) => si + i.qty, 0), 0);
  const avg   = transactions.length ? total / transactions.length : 0;

  document.getElementById('stat-trx').textContent        = transactions.length;
  document.getElementById('stat-pendapatan').textContent = formatRp(total);
  document.getElementById('stat-item').textContent       = items;
  document.getElementById('stat-avg').textContent        = formatRp(Math.round(avg));
}

function clearRiwayat() {
  if (!confirm('Hapus semua riwayat transaksi hari ini?')) return;
  transactions = [];
  localStorage.setItem('gwacor_trx', JSON.stringify(transactions));
  updateStats();
  renderRiwayat();
  showToast('🗑 Riwayat berhasil dihapus');
}

// =============================================
// EXPORT EXCEL
// =============================================
function exportExcel() {
  if (transactions.length === 0) {
    showToast('⚠️ Belum ada transaksi!');
    return;
  }

  const wb    = XLSX.utils.book_new();
  const today = new Date().toLocaleDateString('id-ID');

  // ----- Sheet 1: Detail Transaksi -----
  const detailData = [[
    'No', 'Tanggal', 'Waktu', 'Customer',
    'Item', 'Qty', 'Harga Satuan', 'Subtotal',
    'Total Transaksi', 'Bayar', 'Kembalian',
  ]];

  transactions.forEach(trx => {
    trx.items.forEach((item, idx) => {
      detailData.push([
        idx === 0 ? trx.no       : '',
        idx === 0 ? trx.date     : '',
        idx === 0 ? trx.time     : '',
        idx === 0 ? trx.customer : '',
        item.name,
        item.qty,
        item.price,
        item.subtotal,
        idx === 0 ? trx.total     : '',
        idx === 0 ? trx.bayar     : '',
        idx === 0 ? trx.kembalian : '',
      ]);
    });
  });

  const ws1       = XLSX.utils.aoa_to_sheet(detailData);
  ws1['!cols']    = [8, 12, 10, 16, 16, 6, 16, 14, 18, 14, 14].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws1, 'Detail Transaksi');

  // ----- Sheet 2: Ringkasan -----
  const totalPendapatan = transactions.reduce((s, t) => s + t.total, 0);
  const totalItem       = transactions.reduce((s, t) => s + t.items.reduce((si, i) => si + i.qty, 0), 0);

  const summaryData = [
    ['RINGKASAN PENJUALAN GWACOR'],
    ['Tanggal', today],
    [''],
    ['Total Transaksi',   transactions.length],
    ['Total Pendapatan',  totalPendapatan],
    ['Total Item Terjual', totalItem],
    ['Rata-rata Transaksi', Math.round(totalPendapatan / (transactions.length || 1))],
    [''],
    ['Penjualan per Menu'],
    ['Menu', 'Qty Terjual', 'Total Penjualan'],
  ];

  MENU.forEach(menu => {
    let qty = 0, revenue = 0;
    transactions.forEach(trx => {
      const found = trx.items.find(i => i.name === menu.name);
      if (found) { qty += found.qty; revenue += found.subtotal; }
    });
    summaryData.push([menu.name, qty, revenue]);
  });

  const ws2    = XLSX.utils.aoa_to_sheet(summaryData);
  ws2['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Ringkasan');

  const filename = `Gwacor_${today.replace(/\//g, '-')}.xlsx`;
  XLSX.writeFile(wb, filename);
  showToast('📊 File Excel berhasil diunduh!');
}

// =============================================
// UTILITIES
// =============================================
function formatRp(n) {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const t       = document.createElement('div');
  t.className   = 'toast success';
  t.innerHTML   = `<span class="toast-icon">✓</span><span>${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function switchView(view, e) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');
  e.target.classList.add('active');

  if (view === 'riwayat') {
    updateStats();
    renderRiwayat();
  }
}

// =============================================
// START
// =============================================
init();
