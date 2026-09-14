let state, simpleSave;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const now = () => new Date().toISOString();
const methodName = v => ({ CASH: 'Dinheiro', PIX: 'PIX', DEBIT: 'Débito', CREDIT: 'Crédito' }[v] || 'Dinheiro');
const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2600); };
const validSales = () => state.sales.filter(s => s.status === 'valid');
const currentUser = () => state.users.find(u => String(u.id) === String(state.currentUserId)) || state.users[0];
const isMaster = () => currentUser()?.role === 'MASTER';
const canManage = () => ['MASTER', 'ADMIN'].includes(currentUser()?.role);
const canOperate = () => ['MASTER', 'ADMIN', 'OPERATOR'].includes(currentUser()?.role);
const audit = action => state.audit.unshift({ at: now(), action, user: currentUser()?.name || 'Usuário autenticado' });
const roundTotal = r => (r.prizes || []).reduce((a, p) => a + Number(p.value || 0), 0);
const saleValue = q => Math.floor(q / 3) * Number(state.settings.triplePrice) + (q % 3) * Number(state.settings.salePrice);
const winnerForPrize = (roundId, prizeId) => state.winners.find(w => String(w.roundId) === String(roundId) && String(w.prizeId) === String(prizeId) && w.status !== 'canceled');

function totals() {
  const sales = validSales().reduce((a, s) => a + Number(s.value || 0), 0);
  const plannedPrizes = state.rounds.reduce((a, r) => a + roundTotal(r), 0);
  const paidPrizes = state.winners.filter(w => w.status === 'paid').reduce((a, w) => a + Number(w.prizeValue || 0), 0);
  const withdrawals = state.withdrawals.reduce((a, w) => a + Number(w.value || 0), 0);
  const cards = validSales().reduce((a, s) => a + Number(s.qty || 0), 0);
  const projectedProfit = sales - plannedPrizes - withdrawals;
  const cashBalance = Number(state.event.initialCash || 0) + sales - paidPrizes - withdrawals;
  return {
    sales, plannedPrizes, paidPrizes, withdrawals, cards,
    projectedProfit,
    projectedBalance: Number(state.event.initialCash || 0) + projectedProfit,
    cashBalance,
    margin: sales ? projectedProfit / sales * 100 : 0,
    ticket: validSales().length ? sales / validSales().length : 0
  };
}

async function persist(msg) {
  try {
    const result = await window.showApp.save(state);
    if (result?.data) state = result.data;
    if (msg) toast(msg);
    renderAll();
    return true;
  } catch (e) {
    try { state = await window.showApp.load(); } catch { /* keep current state */ }
    renderAll();
    toast(e?.message || 'Não foi possível salvar a alteração.');
    return false;
  }
}

function navigate(id) {
  $$('.page').forEach(p => p.classList.toggle('active', p.id === id));
  $$('#nav button').forEach(b => b.classList.toggle('active', b.dataset.page === id));
  $('#pageTitle').textContent = $(`#nav button[data-page="${id}"] span`)?.textContent || 'Show de Prêmios';
}

function applyPermissions() {
  const role = currentUser()?.role;
  const master = role === 'MASTER';
  const manager = ['MASTER', 'ADMIN'].includes(role);
  const operator = ['MASTER', 'ADMIN', 'OPERATOR'].includes(role);
  const hidePage = (page, hidden) => { const b = $(`#nav button[data-page="${page}"]`); if (b) b.style.display = hidden ? 'none' : ''; };
  hidePage('database', !master);
  hidePage('users', !manager);
  hidePage('settings', !manager);
  hidePage('pix', !manager);
  hidePage('sellers', !manager);
  ['#newSale', '#toggleEvent', '#addRound', '#suggestPrizes', '#drawNumber', '#confirmManual', '#undoNumber', '#newWithdrawal', '#closeCash', '#generateCards'].forEach(sel => { const el = $(sel); if (el) el.disabled = !operator; });
  ['#newSeller', '#newUser', '#savePix', '#saveSettings', '#importBackup', '#exportBackup'].forEach(sel => { const el = $(sel); if (el) el.disabled = !manager; });
  const avatar = $('.avatar');
  if (avatar) {
    avatar.textContent = (currentUser()?.name || 'U').split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
    avatar.title = `${currentUser()?.name || ''} — ${role || ''} • clique para sair`;
    avatar.style.cursor = 'pointer';
  }
}

function renderAll() {
  const t = totals(), px = validSales().filter(s => s.method === 'PIX');
  $('#eventName').textContent = state.event.name;
  $('#eventDate').textContent = new Date(`${state.event.date}T12:00`).toLocaleDateString('pt-BR', { dateStyle: 'long' });
  $('#eventStatus').textContent = state.event.status === 'live' ? 'EVENTO EM ANDAMENTO' : state.event.status === 'closed' ? 'EVENTO ENCERRADO' : 'EVENTO EM PLANEJAMENTO';
  $('#mSales').textContent = money(t.sales);
  $('#mSalesCount').textContent = `${validSales().length} vendas confirmadas`;
  $('#mCards').textContent = t.cards;
  $('#mValid').textContent = `${state.cards.filter(c => c.status === 'valid').length} cartelas ativas`;
  $('#mPrizes').textContent = money(t.plannedPrizes);
  $('#mBalance').textContent = money(t.projectedBalance);
  $('#mProfit').textContent = money(t.projectedProfit);
  $('#mMargin').textContent = `${t.margin.toFixed(1)}%`;
  $('#mTicket').textContent = money(t.ticket);
  $('#mPix').textContent = money(px.reduce((a, s) => a + Number(s.value || 0), 0));
  $('#mPixCount').textContent = `${px.length} pagamentos`;
  applyPermissions(); renderChart(); renderActivity(); renderNextRound(); renderDay(); renderSales(); renderCards(); renderRounds(); renderDraw(); renderSellers(); renderCash(); renderReports(); renderUsers(); renderPix(); renderSettings(); renderDatabase();
}

function renderChart() {
  const a = [0, 0, 0, 0, 0, 0, 0];
  validSales().forEach(s => a[new Date(s.at).getDay()] += Number(s.value || 0));
  const max = Math.max(...a, 1), d = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  $('#salesChart').innerHTML = a.map((v, i) => `<div class="bar-item"><b>${v ? money(v) : ''}</b><div class="bar" style="height:${Math.max(3, v / max * 145)}px"></div><small>${d[i]}</small></div>`).join('');
}

function renderActivity() {
  const entries = [
    ...state.sales.map(s => ({ at: s.at, op: `Venda ${s.code}`, user: s.seller, value: s.status === 'valid' ? s.value : 0, status: s.status })),
    ...state.withdrawals.map(w => ({ at: w.at, op: w.description, user: w.user, value: -Number(w.value || 0), status: 'completed' })),
    ...state.winners.filter(w => w.status === 'paid').map(w => ({ at: w.paidAt || w.at, op: `Prêmio pago: ${w.prizeName}`, user: w.paidBy || 'Operação', value: -Number(w.prizeValue || 0), status: 'completed' }))
  ].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 8);
  $('#activityRows').innerHTML = entries.length ? entries.map(x => `<tr><td>${new Date(x.at).toLocaleString('pt-BR')}</td><td>${esc(x.op)}</td><td>${esc(x.user || '—')}</td><td>${money(x.value)}</td><td><span class="pill ${esc(x.status)}">${x.status === 'valid' ? 'Confirmada' : x.status === 'canceled' ? 'Cancelada' : 'Concluída'}</span></td></tr>`).join('') : '<tr><td colspan="5">Nenhuma movimentação.</td></tr>';
}

function renderNextRound() {
  const r = state.rounds.find(x => x.status !== 'completed') || state.rounds.at(-1);
  if (!r) return $('#nextRound').textContent = 'Nenhuma rodada configurada.';
  const names = (r.prizes || []).map(p => p.name).join(' • ');
  $('#nextRound').innerHTML = `<div class="round-badge">${esc(r.name)}<strong>${esc(names || 'Prêmios a definir')}</strong></div><div><small>Premiação total</small><h2>${money(roundTotal(r))}</h2></div><div class="progress"><span style="width:${Math.min(100, r.drawn.length / 75 * 100)}%"></span></div><small>${r.drawn.length} de 75 números sorteados</small>`;
}

function renderDay() {
  const t = totals(), done = state.rounds.filter(r => r.status === 'completed').length;
  $('#dayStatus').textContent = state.event.status === 'live' ? 'Evento em andamento' : state.event.status === 'closed' ? 'Evento encerrado' : 'Planejamento';
  $('#toggleEvent').textContent = state.event.status === 'live' ? '■ Encerrar evento' : '▶ Iniciar evento';
  $('#daySummary').innerHTML = `<div><span>Vendas</span><b>${money(t.sales)}</b></div><div><span>Cartelas vendidas</span><b>${t.cards}</b></div><div><span>Rodadas concluídas</span><b>${done}/${state.rounds.length}</b></div><div><span>Saldo projetado</span><b>${money(t.projectedBalance)}</b></div>`;
  $('#dayRoundProgress').textContent = `${done} de ${state.rounds.length} concluídas`;
  $('#dayRounds').innerHTML = state.rounds.map(r => `<div class="mini-round ${esc(r.status)}"><b>${r.id}</b><span>${esc((r.prizes || []).map(p => p.name).join(', ') || r.name)}</span><small>${money(roundTotal(r))}</small></div>`).join('');
}

function renderSales() {
  const q = ($('#saleSearch').value || '').toLowerCase(), st = $('#saleStatus').value, m = $('#saleMethod').value;
  const rows = state.sales.filter(s => (st === 'all' || s.status === st) && (m === 'all' || (s.method || 'CASH') === m) && [s.buyer, s.cpf, s.phone, s.code, s.seller].join(' ').toLowerCase().includes(q));
  $('#salesRows').innerHTML = rows.length ? rows.map(s => {
    const canCancel = s.status === 'valid' && canManage() && !state.winners.some(w => (w.cardIds || []).some(id => state.cards.some(c => c.id === id && c.saleId === s.id)) && w.status !== 'canceled');
    return `<tr><td><b>${esc(s.code)}</b></td><td>${esc(s.buyer)}</td><td>${esc(s.seller || 'Caixa principal')}</td><td>${Number(s.qty || 0)}</td><td>${methodName(s.method)}</td><td>${money(s.value)}</td><td>${new Date(s.at).toLocaleString('pt-BR')}</td><td><span class="pill ${esc(s.status)}">${s.status === 'valid' ? 'Válida' : 'Cancelada'}</span>${canCancel ? ` <button class="icon-btn danger-text" data-cancel-sale="${esc(s.id)}">Cancelar</button>` : ''}</td></tr>`;
  }).join('') : '<tr><td colspan="8">Nenhuma venda encontrada.</td></tr>';
}

function renderCards() {
  const q = ($('#cardSearch')?.value || '').toLowerCase(), type = $('#cardTypeFilter')?.value || 'all';
  const rows = state.cards.filter(c => (type === 'all' || (c.type || 'DIGITAL') === type) && String(c.code || '').toLowerCase().includes(q));
  $('#cardSummary').innerHTML = `<div><span>Total gerado</span><b>${state.cards.length}</b></div><div><span>Físicas</span><b>${state.cards.filter(c => c.type === 'PHYSICAL').length}</b></div><div><span>Digitais</span><b>${state.cards.filter(c => (c.type || 'DIGITAL') === 'DIGITAL').length}</b></div>`;
  $('#cardRows').innerHTML = rows.length ? rows.map(c => {
    const won = state.winners.some(w => (w.cardIds || []).includes(c.id) && w.status !== 'canceled');
    return `<tr><td><input type="checkbox" class="card-select" value="${esc(c.id)}"></td><td><b>${esc(c.code)}</b></td><td>${c.type === 'PHYSICAL' ? 'Física' : 'Digital'}</td><td>${esc((c.numbers || []).join(', '))}</td><td>${new Date(c.createdAt || Date.now()).toLocaleString('pt-BR')}</td><td><span class="pill ${c.status === 'valid' ? 'valid' : 'canceled'}">${c.status === 'valid' ? (won ? 'Premiada' : 'Válida') : 'Inativa'}</span></td><td><button class="icon-btn" data-print-card="${esc(c.id)}">Imprimir</button>${isMaster() && !won ? ` <button class="icon-btn danger-text" data-delete-card="${esc(c.id)}">Excluir</button>` : ''}</td></tr>`;
  }).join('') : '<tr><td colspan="7">Nenhuma cartela encontrada.</td></tr>';
}
