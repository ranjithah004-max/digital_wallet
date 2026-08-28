if (typeof window !== 'undefined') {
const state = { token: localStorage.getItem('pulse_token'), mode: null };
const $ = selector => document.querySelector(selector);
const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
const toast = $('.toast');
function notify(message) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2600); }
async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}), ...options.headers } });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Something went wrong.'); return data;
}
function transactionMarkup(tx, index) {
  const kinds = ['coral', 'mint', 'yellow', 'lavender']; const date = new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `<div class="transaction"><span class="merchant ${kinds[index % 4]}">${tx.icon || '•'}</span><div><strong>${tx.merchant}</strong><small>${tx.category} · ${date}</small></div><b class="${tx.amount >= 0 ? 'income' : 'expense'}">${tx.amount >= 0 ? '+' : '−'} ${money(Math.abs(tx.amount))}</b></div>`;
}
function cardMarkup(card) { return `<article class="payment-card ${card.gradient ? 'gradient-card' : 'plain-card'}"><div><span class="chip">▰</span><b>${card.brand}</b></div><p>•••• &nbsp;•••• &nbsp;•••• &nbsp; ${card.last4}</p><footer><span>RANJITHA</span><span>${card.expiry}</span></footer></article>`; }
async function loadWallet() {
  const [summary, transactions] = await Promise.all([api('/api/summary'), api('/api/transactions')]);
  $('#balance').textContent = money(summary.balance); $('#balance').dataset.value = summary.balance;
  $('.topbar h1').innerHTML = `Good morning, ${summary.user.name.split(' ')[0]} <span>✦</span>`;
  $('.profile span').textContent = summary.user.name[0].toUpperCase();
  $('#transaction-list').innerHTML = transactions.map(transactionMarkup).join('');
  $('.insight-panel h2').innerHTML = `${money(summary.spent)} <span class="muted">/ ${money(summary.user.monthlyBudget)}</span>`;
  $('.progress span').style.width = `${Math.min(100, summary.spent / summary.user.monthlyBudget * 100)}%`;
  $('.budget-note').innerHTML = `You have <strong>${money(summary.remaining)}</strong> left to spend this month.`;
  $('#cards-row').innerHTML = summary.user.cards.map(cardMarkup).join('') + `<article class="safe-card"><span class="safe-icon">♧</span><div><h3>Your money is protected</h3><p>Bank-level encryption and secure payments, always.</p></div><button>Learn more →</button></article>`;
}
function openModal(mode) {
  state.mode = mode; const specs = {
    add: ['Add money', `<label>Amount (₹)<input name="amount" type="number" min="1" step="0.01" required placeholder="e.g. 1000" /></label>`, 'Add money'],
    withdraw: ['Withdraw funds', `<label>Transfer to<input name="account" required placeholder="e.g. My bank account" /></label><label>Amount (₹)<input name="amount" type="number" min="1" step="0.01" required placeholder="e.g. 1000" /></label><p class="auth-hint">Demo mode: no money is actually transferred.</p>`, 'Withdraw money'],
    send: ['Send money', `<label>Recipient name<input name="recipient" required placeholder="e.g. Maya Sharma" /></label><label>Amount (₹)<input name="amount" type="number" min="1" step="0.01" required /></label><label>Note (optional)<input name="note" placeholder="What is this for?" /></label>`, 'Send now'],
    card: ['Add a new card', `<label>Card brand<select name="brand"><option>VISA</option><option>mastercard</option><option>RuPay</option></select></label><label>Last 4 digits<input name="last4" pattern="[0-9]{4}" required placeholder="1234" /></label><label>Expiry (MM/YY)<input name="expiry" pattern="[0-9]{2}/[0-9]{2}" required placeholder="08/29" /></label>`, 'Add card'],
    request: ['Request money', `<label>Request from<input name="contact" required placeholder="e.g. Maya Sharma" /></label><label>Amount (₹)<input name="amount" type="number" min="1" step="0.01" required /></label><label>Note (optional)<input name="note" placeholder="What is this for?" /></label>`, 'Send request'],
    bill: ['Pay a bill', `<label>Biller<input name="biller" required placeholder="e.g. Electricity Board" /></label><label>Amount (₹)<input name="amount" type="number" min="1" step="0.01" required /></label>`, 'Pay bill'],
    scan: ['Scan & pay', `<label>Merchant name<input name="merchant" required placeholder="e.g. Local Store" /></label><label>Amount (₹)<input name="amount" type="number" min="1" step="0.01" required /></label><p class="auth-hint">Demo mode: enter the merchant details instead of scanning a QR code.</p>`, 'Pay now']
  }[mode];
  $('#modal-title').textContent = specs[0]; $('#modal-fields').innerHTML = specs[1]; $('#modal-submit').textContent = specs[2]; $('#form-error').textContent = ''; $('#modal-backdrop').hidden = false;
}
function closeModal() { $('#modal-backdrop').hidden = true; }
$('#login-form').addEventListener('submit', async event => { event.preventDefault(); $('#auth-error').textContent = ''; const credentials = { email: $('#email').value.trim(), password: $('#password').value }; try { const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }); state.token = data.token; localStorage.setItem('pulse_token', data.token); $('#auth-screen').hidden = true; $('#wallet-app').hidden = false; await loadWallet(); } catch (error) { $('#auth-error').textContent = error.message; } });
$('#action-form').addEventListener('submit', async event => { event.preventDefault(); $('#form-error').textContent = ''; const values = Object.fromEntries(new FormData(event.currentTarget)); const routes = { add: '/api/add-money', withdraw: '/api/withdraw', send: '/api/transfers', card: '/api/cards', request: '/api/requests', bill: '/api/bills', scan: '/api/scan-pay' }; const messages = { withdraw: 'Withdrawal successful.', send: 'Transfer successful.', request: 'Payment request sent.', bill: 'Bill paid successfully.', scan: 'Payment successful.' }; try { await api(routes[state.mode], { method: 'POST', body: JSON.stringify(values) }); closeModal(); await loadWallet(); notify(messages[state.mode] || 'Wallet updated successfully.'); } catch (error) { $('#form-error').textContent = error.message; } });
document.querySelectorAll('.action').forEach(button => button.addEventListener('click', () => { const text = button.dataset.action || ''; if (/Add money/.test(text)) openModal('add'); else if (/Withdraw funds/.test(text)) openModal('withdraw'); else if (/Send money/.test(text)) openModal('send'); else if (/Request money/.test(text)) openModal('request'); else if (/Pay a bill/.test(text)) openModal('bill'); else if (/Scan and pay/.test(text)) openModal('scan'); else if (/Add a new card/.test(text)) openModal('card'); else notify(`${text} is coming soon.`); }));
$('.modal-close').addEventListener('click', closeModal); $('#modal-backdrop').addEventListener('click', event => { if (event.target === event.currentTarget) closeModal(); });
$('.balance-head button').addEventListener('click', event => { const hidden = $('#balance').dataset.hidden === 'true'; $('#balance').textContent = hidden ? money(Number($('#balance').dataset.value)) : '₹ ••••••••'; $('#balance').dataset.hidden = String(!hidden); event.currentTarget.textContent = hidden ? '◉' : '◌'; });
if (state.token) { $('#auth-screen').hidden = true; $('#wallet-app').hidden = false; loadWallet().catch(() => { localStorage.removeItem('pulse_token'); state.token = null; $('#auth-screen').hidden = false; $('#wallet-app').hidden = true; }); }
}
