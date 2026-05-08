// ── Night Lend — ZK DeFi Lending ──────────────────────────────

const NIGHT_ID_API = 'https://night-markets-94-production.up.railway.app';
async function recordAction(points) {
  const addr = walletState?.address;
  if (!addr) return;
  try {
    await fetch(`${NIGHT_ID_API}/api/nightid/record-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ holderAddress: addr, appId: 'night-lend', points }),
    });
  } catch (_) {}
}

var NL_API = 'http://127.0.0.1:3001';
var _apiReady = null;
async function apiCheck() {
  if (_apiReady !== null) return _apiReady;
  try { await fetch(NL_API + '/health', { signal: AbortSignal.timeout(2000) }); _apiReady = true; } catch { _apiReady = false; }
  return _apiReady;
}
async function apiPost(path, body) {
  const r = await fetch(NL_API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

var POOLS = [
  { asset: 'NIGHT', icon: '🌙', apy: '18.4', borrowRate: '22.1', tvl: '$1.2M', price: 0.04 },
  { asset: 'sUSD',  icon: '💵', apy: '8.2',  borrowRate: '11.5', tvl: '$3.8M', price: 1.00 },
  { asset: 'tDUST', icon: '⚡', apy: '12.1', borrowRate: '16.3', tvl: '$620K', price: 0.012 },
];

var _lendState = JSON.parse(localStorage.getItem('nl_state') || 'null') || { deposited: 0, borrowed: 0, depositAsset: 'NIGHT' };
var _borrowAsset = 'sUSD';
function saveLendState() { localStorage.setItem('nl_state', JSON.stringify(_lendState)); }

var walletState = { connected: false, demo: false, address: null };

async function connectLace() {
  if (typeof nightWallet === 'undefined') { connectDemo(); return; }
  try {
    const state = await nightWallet.connect('lace');
    walletState = { connected: state.connected, demo: state.demo, address: state.address };
    closeModal('ov-wallet'); updateWalletUI();
    toast(state.demo ? '🎭 Demo mode' : '✓ Lace connected', 'success');
    await syncPosition(); renderPosition();
  } catch { connectDemo(); }
}

function connectDemo() {
  walletState = { connected: true, demo: true, address: 'mn_addr_preprod1' + Math.random().toString(36).slice(2, 14) };
  closeModal('ov-wallet'); updateWalletUI();
  toast('🎭 Demo mode — no real funds', 'success');
  renderPosition();
}

function handleWalletClick() {
  if (walletState.connected) {
    if (confirm('Disconnect?')) { walletState = { connected: false, demo: false, address: null }; updateWalletUI(); }
  } else { openModal('ov-wallet'); }
}

async function syncPosition() {
  if (!walletState.address) return;
  try {
    const r = await fetch(NL_API + `/api/nightlend/state/${encodeURIComponent(walletState.address)}`, { signal: AbortSignal.timeout(3000) });
    if (r.ok) {
      const data = await r.json();
      _lendState.deposited = data.totalDepUSD ?? _lendState.deposited;
      _lendState.borrowed  = data.totalBorUSD  ?? _lendState.borrowed;
      saveLendState();
    }
  } catch { /* use local state */ }
}

function updateWalletUI() {
  const dot = document.getElementById('wallet-dot');
  const lbl = document.getElementById('wallet-label');
  if (!dot || !lbl) return;
  dot.style.background = walletState.connected ? '#00d68f' : '#ef4444';
  lbl.textContent = walletState.connected ? (walletState.demo ? '🎭 Demo' : walletState.address.slice(0, 14) + '…') : 'Sign in';
}

function renderPosition() {
  const deposited = _lendState.deposited;
  const borrowed  = _lendState.borrowed;
  const hf = borrowed > 0 ? (deposited * 0.8) / borrowed : Infinity;
  const hfPct = Math.min(100, isFinite(hf) ? (hf / 3) * 100 : 100);

  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  set('nl-deposited', deposited > 0 ? `$${deposited.toFixed(2)}` : '$0.00');
  set('nl-borrowed',  borrowed  > 0 ? `$${borrowed.toFixed(2)}`  : '$0.00');
  set('nl-hf',        isFinite(hf) ? hf.toFixed(2) + 'x' : '∞');

  const bar = document.getElementById('nl-hbar-fill');
  if (bar) bar.style.width = hfPct + '%';

  const hfStatus = document.getElementById('nl-hf-status');
  if (hfStatus) {
    hfStatus.textContent = isFinite(hf) ? (hf > 2 ? `Safe (${Math.round(hfPct)}%)` : hf > 1.2 ? `Caution (${Math.round(hfPct)}%)` : 'At risk') : 'No borrows';
    hfStatus.style.color = !isFinite(hf) || hf > 2 ? 'var(--green)' : hf > 1.2 ? 'var(--gold)' : 'var(--red)';
  }
}

async function nightLendDeposit(asset, apy) {
  if (!walletState.connected) { openModal('ov-wallet'); return; }
  const amount = parseFloat(prompt(`Deposit ${asset} — enter amount:`) || '0');
  if (amount <= 0) return;
  toast(`Depositing ${amount} ${asset} at ${apy}% APY…`, 'info');
  try {
    const result = await apiPost('/api/nightlend/deposit', { asset, amount, address: walletState.address });
    if (result.position) {
      _lendState.deposited = result.position.totalDepUSD ?? (_lendState.deposited + amount * (POOLS.find(p=>p.asset===asset)?.price||0));
    } else {
      _lendState.deposited += amount * (POOLS.find(p => p.asset === asset)?.price || 0);
    }
  } catch {
    _lendState.deposited += amount * (POOLS.find(p => p.asset === asset)?.price || 0);
  }
  _lendState.depositAsset = asset;
  saveLendState(); renderPosition();
  toast(`✓ ${amount} ${asset} deposited — earning ${apy}% APY`, 'success');
}

function selectBorrowAsset(asset) {
  _borrowAsset = asset;
  document.querySelectorAll('.nl-asset-btn').forEach(el => el.classList.remove('selected'));
  const btn = document.getElementById(`borrow-${asset}`);
  if (btn) btn.classList.add('selected');
  nightLendBorrowUpdate();
}

function nightLendBorrowUpdate() {
  const amount = parseFloat(document.getElementById('nl-borrow-amount')?.value || '0');
  const pool   = POOLS.find(p => p.asset === _borrowAsset);
  const preview = document.getElementById('nl-borrow-preview');
  if (!preview || !pool) return;
  if (amount > 0) {
    const rate = pool.borrowRate;
    const maxBorrow = _lendState.deposited * 0.75;
    const usdVal = amount * pool.price;
    preview.textContent = `≈ $${usdVal.toFixed(2)} · ${rate}% borrow APR · max $${maxBorrow.toFixed(2)}`;
    preview.style.color = usdVal > maxBorrow ? 'var(--red)' : 'var(--muted)';
  } else {
    preview.textContent = '';
  }
}

async function nightLendBorrow() {
  if (!walletState.connected) { openModal('ov-wallet'); return; }
  const amount = parseFloat(document.getElementById('nl-borrow-amount')?.value || '0');
  if (amount <= 0) { toast('Enter borrow amount', 'error'); return; }
  const pool = POOLS.find(p => p.asset === _borrowAsset);
  const usdVal = amount * (pool?.price || 1);
  const maxBorrow = _lendState.deposited * 0.75;
  if (usdVal > maxBorrow) { toast('Exceeds max borrow — deposit more collateral', 'error'); return; }
  toast(`Borrowing ${amount} ${_borrowAsset}…`, 'info');
  try {
    await apiPost('/api/nightlend/borrow', { asset: _borrowAsset, amount, address: walletState.address });
  } catch {}
  _lendState.borrowed += usdVal;
  saveLendState(); renderPosition();
  toast(`✓ ${amount} ${_borrowAsset} borrowed — check your wallet`, 'success');
  recordAction(30);
}

async function nightLendRepay() {
  if (_lendState.borrowed <= 0) { toast('No outstanding borrows', 'info'); return; }
  toast('Repaying all borrows…', 'info');
  try { await apiPost('/api/nightlend/repay', { address: walletState.address }); } catch {}
  _lendState.borrowed = 0; saveLendState(); renderPosition();
  toast('✓ All positions repaid', 'success');
}

async function nightLendWithdraw() {
  if (_lendState.deposited <= 0) { toast('No deposits to withdraw', 'info'); return; }
  if (_lendState.borrowed > 0)   { toast('Repay borrows before withdrawing', 'error'); return; }
  toast('Withdrawing deposits…', 'info');
  try { await apiPost('/api/nightlend/withdraw', { address: walletState.address }); } catch {}
  _lendState.deposited = 0; saveLendState(); renderPosition();
  toast('✓ Deposits withdrawn', 'success');
}

function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function toast(msg, type = 'info') {
  const wrap = document.getElementById('toast-wrap');
  if (!wrap) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`; t.textContent = msg;
  wrap.appendChild(t); setTimeout(() => t.remove(), 3500);
}

document.addEventListener('DOMContentLoaded', () => {
  updateWalletUI();
  renderPosition();
  selectBorrowAsset('sUSD');
});
