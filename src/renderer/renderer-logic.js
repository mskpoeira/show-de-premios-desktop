function renderRounds() {
  $('#roundRows').innerHTML = state.rounds.map(r => `<article class="panel round-edit-card"><div class="round-edit-head"><div><b>RODADA ${r.id}</b><input class="editable" data-round-name="${r.id}" value="${esc(r.name)}" ${canOperate() ? '' : 'disabled'}></div><span class="pill ${esc(r.status)}">${r.status === 'ready' ? 'Pronta' : r.status === 'completed' ? 'Concluída' : 'Aguardando'}</span>${canOperate() ? `<button class="btn ghost" data-add-prize="${r.id}">＋ Prêmio</button>` : ''}${isMaster() && !state.winners.some(w => String(w.roundId) === String(r.id) && w.status !== 'canceled') ? `<button class="icon-btn danger-text" data-delete-round="${r.id}">Excluir</button>` : ''}</div><div class="prize-list">${(r.prizes || []).map((p, i) => { const winner = winnerForPrize(r.id, p.id); return `<div class="prize-row"><b>${i + 1}º</b><input class="editable" data-prize-name="${r.id}:${p.id}" value="${esc(p.name)}" placeholder="Nome do prêmio" ${winner || !canOperate() ? 'disabled' : ''}><input class="editable" type="number" data-prize-value="${r.id}:${p.id}" value="${Number(p.value || 0)}" min="0" step="10" ${winner || !canOperate() ? 'disabled' : ''}><select data-prize-pattern="${r.id}:${p.id}" ${winner || !canOperate() ? 'disabled' : ''}><option value="FULL" ${p.pattern === 'FULL' ? 'selected' : ''}>Cartela cheia</option><option value="LINE" ${p.pattern === 'LINE' ? 'selected' : ''}>Linha</option><option value="CORNERS" ${p.pattern === 'CORNERS' ? 'selected' : ''}>Quatro cantos</option></select>${winner ? `<span class="pill valid">${esc((winner.cardCodes || []).join(', '))}</span>` : isMaster() ? `<button class="icon-btn danger-text" data-delete-prize="${r.id}:${p.id}">×</button>` : ''}</div>`; }).join('') || '<p class="muted">Nenhum prêmio cadastrado.</p>'}</div><footer>${r.drawn.length} números sorteados • Total ${money(roundTotal(r))}</footer></article>`).join('');
}

function cardGrid(card) {
  const grid = Array(25).fill(null); let j = 0;
  for (let i = 0; i < 25; i++) { if (i === 12) grid[i] = 0; else grid[i] = Number(card.numbers?.[j++] || 0); }
  return grid;
}

function patternGroups(pattern) {
  if (pattern === 'CORNERS') return [[0, 4, 20, 24]];
  if (pattern === 'LINE') return [
    [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
    [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
    [0, 6, 12, 18, 24], [4, 8, 12, 16, 20]
  ];
  return [[...Array(25).keys()].filter(i => i !== 12)];
}

function missingForPattern(card, drawn, pattern = 'FULL') {
  const set = new Set(drawn), grid = cardGrid(card);
  return Math.min(...patternGroups(pattern).map(group => group.reduce((missing, idx) => idx === 12 || set.has(grid[idx]) ? missing : missing + 1, 0)));
}

function evaluateWinners(round) {
  const awards = [];
  for (const prize of round.prizes || []) {
    if (winnerForPrize(round.id, prize.id)) continue;
    const cards = state.cards.filter(c => c.status === 'valid' && missingForPattern(c, round.drawn, prize.pattern) === 0);
    if (!cards.length) continue;
    const award = {
      id: crypto.randomUUID(), roundId: round.id, roundName: round.name, prizeId: prize.id, prizeName: prize.name,
      pattern: prize.pattern, prizeValue: Number(prize.value || 0), cardIds: cards.map(c => c.id), cardCodes: cards.map(c => c.code),
      tie: cards.length > 1, shareValue: cards.length ? Number(prize.value || 0) / cards.length : 0,
      status: 'pending', at: now(), drawIndex: round.drawn.length, drawNumber: round.drawn.at(-1), operator: currentUser()?.name
    };
    state.winners.unshift(award); awards.push(award);
    audit(`Vencedor apurado: ${prize.name} — ${cards.map(c => c.code).join(', ')}${cards.length > 1 ? ' (empate)' : ''}`);
  }
  if ((round.prizes || []).length && (round.prizes || []).every(p => winnerForPrize(round.id, p.id))) {
    round.status = 'completed';
    const next = state.rounds.find(r => r.id > round.id && r.status !== 'completed'); if (next && next.status === 'waiting') next.status = 'ready';
  }
  return awards;
}

function renderDraw() {
  const sel = $('#drawRound');
  const id = Number(sel.value) || state.rounds.find(r => r.status !== 'completed')?.id || state.rounds[0]?.id;
  sel.innerHTML = state.rounds.map(r => `<option value="${r.id}" ${r.id === id ? 'selected' : ''}>${esc(r.name)} — ${(r.prizes || []).length} prêmio(s)</option>`).join('');
  $('#drawMode').value = state.settings.drawMode || 'automatic';
  const r = state.rounds.find(x => x.id === id) || state.rounds[0];
  if (!r) return;
  $('#currentBall').textContent = r.drawn.at(-1) || '—';
  $('#drawCount').textContent = `${r.drawn.length}/75`;
  $('#numberGrid').innerHTML = Array.from({ length: 75 }, (_, i) => `<span class="number ${r.drawn.includes(i + 1) ? 'drawn' : ''}">${i + 1}</span>`).join('');
  const prize = (r.prizes || []).find(p => !winnerForPrize(r.id, p.id)) || (r.prizes || [])[0];
  const pattern = prize?.pattern || 'FULL';
  const ranked = state.cards.filter(c => c.status === 'valid').map(c => ({ ...c, missing: missingForPattern(c, r.drawn, pattern) })).sort((a, b) => a.missing - b.missing || String(a.code).localeCompare(String(b.code))).slice(0, 10);
  $('#ranking').innerHTML = ranked.length ? `<p class="muted">Apuração para: <b>${esc(prize?.name || 'Cartela cheia')}</b> (${pattern === 'FULL' ? 'cartela cheia' : pattern === 'LINE' ? 'linha' : 'quatro cantos'})</p>` + ranked.map((c, i) => `<div class="rank-row ${c.missing === 0 ? 'winner' : ''}"><b>#${i + 1}</b><span>${esc(c.code)}</span><strong>${c.missing === 0 ? 'VENCEDORA' : c.missing <= 3 ? `Faltam ${c.missing}` : `${c.missing} faltantes`}</strong></div>`).join('') : '<p class="muted">A classificação aparecerá após a geração ou venda das cartelas.</p>';
  const manual = $('#drawMode').value === 'manual'; $('.manual-draw').style.display = manual ? 'flex' : 'none'; $('#drawNumber').style.display = manual ? 'none' : 'inline-block';
  $('#drawNumber').disabled = !canOperate() || r.drawn.length >= 75 || r.status === 'completed';
  $('#confirmManual').disabled = !canOperate() || r.drawn.length >= 75 || r.status === 'completed';
}

function renderSellers() {
  const stats = state.sellers.map(s => { const sales = validSales().filter(v => String(v.sellerId) === String(s.id) || v.seller === s.name), revenue = sales.reduce((a, v) => a + Number(v.value || 0), 0); return { ...s, count: sales.length, cards: sales.reduce((a, v) => a + Number(v.qty || 0), 0), revenue, earned: revenue * Number(s.commission || 0) / 100 }; }).sort((a, b) => b.revenue - a.revenue);
  $('#sellerActive').textContent = state.sellers.filter(s => s.active).length;
  $('#sellerTop').textContent = stats[0]?.name || '—';
  $('#sellerRevenue').textContent = money(stats.reduce((a, s) => a + s.revenue, 0));
  $('#sellerCommission').textContent = money(stats.reduce((a, s) => a + s.earned, 0));
  $('#sellerRows').innerHTML = stats.map(s => `<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.phone || '—')}<small>${esc(s.email || '—')}</small></td><td>${s.count}</td><td>${s.cards}</td><td>${money(s.revenue)}</td><td>${money(s.earned)} (${Number(s.commission || 0)}%)</td><td><span class="pill ${s.active ? 'valid' : 'canceled'}">${s.active ? 'Ativo' : 'Inativo'}</span></td><td>${canManage() ? `<button class="icon-btn" data-edit-seller="${s.id}">Editar</button>` : ''}${isMaster() && s.id !== 1 ? ` <button class="icon-btn danger-text" data-delete-seller="${s.id}">Excluir</button>` : ''}</td></tr>`).join('');
  $('#saleSeller').innerHTML = state.sellers.filter(s => s.active).map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
}

function renderCash() {
  const t = totals();
  $('#cashInitial').textContent = money(state.event.initialCash);
  $('#cashIncome').textContent = money(t.sales);
  $('#cashOut').textContent = money(t.paidPrizes + t.withdrawals);
  $('#cashBalance').textContent = money(t.cashBalance);
  $('#paymentStrip').innerHTML = ['CASH', 'PIX', 'DEBIT', 'CREDIT'].map(m => `<div><span>${methodName(m)}</span><b>${money(validSales().filter(s => (s.method || 'CASH') === m).reduce((a, s) => a + Number(s.value || 0), 0))}</b></div>`).join('');
  const rows = [
    ...validSales().map(s => ({ at: s.at, type: 'Entrada', desc: `Venda ${s.code}`, method: methodName(s.method), value: Number(s.value || 0), html: false })),
    ...state.withdrawals.map(w => ({ at: w.at, type: 'Retirada', desc: w.description, method: 'Caixa', value: -Number(w.value || 0), html: false })),
    ...state.winners.map(w => ({ at: w.status === 'paid' ? (w.paidAt || w.at) : w.at, type: w.status === 'paid' ? 'Prêmio pago' : 'Prêmio pendente', desc: w.prizeName, method: w.status === 'paid' ? 'Caixa' : 'Aguardando', value: w.status === 'paid' ? -Number(w.prizeValue || 0) : 0, html: true, winner: w }))
  ].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  $('#cashRows').innerHTML = rows.length ? rows.map(r => `<tr><td>${new Date(r.at).toLocaleString('pt-BR')}</td><td>${esc(r.type)}</td><td>${esc(r.desc)}${r.winner ? `<small>Cartela(s): ${esc((r.winner.cardCodes || []).join(', '))}${r.winner.tie ? ` • empate: ${money(r.winner.shareValue)} por cartela` : ''}</small>` : ''}</td><td>${esc(r.method)}${r.winner?.status === 'pending' && canManage() ? ` <button class="icon-btn" data-pay-winner="${esc(r.winner.id)}">Pagar prêmio</button>` : ''}</td><td>${money(r.value)}</td></tr>`).join('') : '<tr><td colspan="5">Nenhuma movimentação.</td></tr>';
}

function tableHtml(headers, rows) {
  return `<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${headers.length}">Nenhum registro.</td></tr>`}</tbody></table></div>`;
}

function reportHtml(type) {
  const t = totals(), head = x => `<article class="panel printable-report" data-report="${type}"><h2>${esc(x)}</h2><small>${esc(state.event.name)} • ${new Date().toLocaleString('pt-BR')}</small>`;
  if (type === 'summary') return head('Resumo financeiro') + `<div class="summary-list"><div>Receita <b>${money(t.sales)}</b></div><div>Prêmios previstos <b>${money(t.plannedPrizes)}</b></div><div>Prêmios pagos <b>${money(t.paidPrizes)}</b></div><div>Resultado projetado <b>${money(t.projectedProfit)}</b></div><div>Saldo de caixa <b>${money(t.cashBalance)}</b></div><div>Margem <b>${t.margin.toFixed(1)}%</b></div></div></article>`;
  if (type === 'sales') return head('Vendas') + tableHtml(['Código', 'Comprador', 'Vendedor', 'Cartelas', 'Pagamento', 'Valor', 'Status'], state.sales.map(s => [s.code, s.buyer, s.seller || '', String(s.qty || 0), methodName(s.method), money(s.value), s.status])) + '</article>';
  if (type === 'rounds') return head('Rodadas e prêmios') + tableHtml(['Rodada', 'Prêmio', 'Padrão', 'Valor', 'Vencedora(s)'], state.rounds.flatMap(r => (r.prizes || []).map(p => { const w = winnerForPrize(r.id, p.id); return [r.name, p.name, p.pattern, money(p.value), (w?.cardCodes || []).join(', ')]; }))) + '</article>';
  if (type === 'sellers') return head('Vendedores') + tableHtml(['Nome', 'Telefone', 'E-mail', 'Comissão'], state.sellers.map(s => [s.name, s.phone || '', s.email || '', `${Number(s.commission || 0)}%`])) + '</article>';
  if (type === 'cash') return head('Fechamentos de caixa') + tableHtml(['Data', 'Esperado', 'Contado', 'Diferença', 'Responsável'], state.cashClosings.map(c => [new Date(c.at).toLocaleString('pt-BR'), money(c.expected), money(c.counted), money(c.difference), c.user || ''])) + '</article>';
  if (type === 'audit') return head('Auditoria') + tableHtml(['Data/hora', 'Ação', 'Usuário'], state.audit.map(a => [new Date(a.at).toLocaleString('pt-BR'), a.action, a.user])) + '</article>';
  return '';
}
function renderReports() { if (!$('#selectedReports').innerHTML) buildReports(); }
function buildReports() { $('#selectedReports').innerHTML = $$('.report-picker input:checked').map(c => reportHtml(c.value)).join('') || '<div class="panel">Selecione pelo menos um relatório.</div>'; }

function renderUsers() {
  const roles = { MASTER: 'Acesso total', ADMIN: 'Gerenciamento', OPERATOR: 'Vendas e operação', VIEWER: 'Somente consulta' };
  $('#userRows').innerHTML = state.users.map(u => `<tr><td><b>${esc(u.name)}</b></td><td>${esc(u.phone || '—')}<small>${esc(u.email || '—')}</small></td><td>${esc(u.login)}</td><td>${esc(u.role)}</td><td>${esc(roles[u.role] || 'Personalizado')}</td><td><span class="pill ${u.active ? 'valid' : 'canceled'}">${u.active ? 'Ativo' : 'Inativo'}</span></td><td>${u.role === 'MASTER' ? '<span class="locked">Protegido</span>' : canManage() ? `<button class="icon-btn" data-edit-user="${u.id}">Editar</button>${isMaster() ? ` <button class="icon-btn danger-text" data-delete-user="${u.id}">Excluir</button>` : ''}` : ''}</td></tr>`).join('');
}

function renderPix() {
  const p = state.settings.pix;
  $('#pixEnabled').checked = !!p.enabled; $('#pixType').value = p.keyType; $('#pixKey').value = p.key; $('#pixName').value = p.name; $('#pixCity').value = p.city; $('#pixDescription').value = p.description; $('#pixBanner').value = p.banner; $('#pixPreviewBanner').textContent = p.banner || 'PAGUE COM PIX DIRETO DO SEU LUGAR';
}
function renderSettings() { $('#cfgName').value = state.event.name; $('#cfgDate').value = state.event.date; $('#cfgPrefix').value = state.settings.prefix; $('#cfgRounds').value = state.event.rounds; $('#cfgCash').value = state.event.initialCash; $('#cfgUnit').value = state.settings.salePrice; $('#cfgTriple').value = state.settings.triplePrice; $('#cfgPrizePercent').value = state.settings.prizePercent; $('#cfgFirstShare').value = state.settings.firstPrizeShare; $('#cfgSecondShare').value = state.settings.secondPrizeShare; $('#cfgMode').value = state.settings.cardMode; }

function renderDatabase() {
  const allowed = isMaster(); $('#databaseDenied').style.display = allowed ? 'none' : 'block'; $('#databaseContent').style.display = allowed ? 'block' : 'none'; if (!allowed) return;
  const table = $('#dbTable').value || 'sales', data = state[table] || [], q = ($('#dbSearch').value || '').toLowerCase();
  const rows = data.map((row, index) => ({ row, index })).filter(x => JSON.stringify(x.row).toLowerCase().includes(q));
  $('#dbRecords').textContent = Object.values(state).filter(Array.isArray).reduce((a, x) => a + x.length, 0); $('#dbVersion').textContent = state.version;
  const lastBackup = state.audit.find(a => /backup/i.test(a.action)); $('#dbBackup').textContent = lastBackup ? new Date(lastBackup.at).toLocaleDateString('pt-BR') : '—';
  $('#dbRows').innerHTML = rows.slice(0, 200).map(({ row, index }) => `<div class="db-record"><code>${esc(JSON.stringify(row, null, 2))}</code>${table === 'audit' || (table === 'users' && row.role === 'MASTER') ? '<span class="locked">Protegido</span>' : `<button class="icon-btn" data-db-edit="${table}:${index}">Editar JSON</button><button class="icon-btn danger-text" data-db-delete="${table}:${index}">Excluir</button>`}</div>`).join('') || '<p>Nenhum registro.</p>';
}

function sampleRange(min, max, count) {
  const pool = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, count).sort((a, b) => a - b);
}
function standardBingoNumbers() {
  const columns = [sampleRange(1, 15, 5), sampleRange(16, 30, 5), sampleRange(31, 45, 4), sampleRange(46, 60, 5), sampleRange(61, 75, 5)];
  const ptr = [0, 0, 0, 0, 0], numbers = [];
  for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) { if (row === 2 && col === 2) continue; numbers.push(columns[col][ptr[col]++]); }
  return numbers;
}
function nextSequence(kind) { state.sequences ||= { sale: 0, card: 0 }; state.sequences[kind] = Number(state.sequences[kind] || 0) + 1; return state.sequences[kind]; }
function createCard(code, saleId, type = 'DIGITAL') { return { id: crypto.randomUUID(), saleId, code, numbers: standardBingoNumbers(), type, createdAt: now(), status: 'valid' }; }

function simpleDialog(title, fields, save) {
  $('#simpleTitle').textContent = title;
  $('#simpleFields').innerHTML = fields.map(f => `<label>${esc(f.label)}${f.type === 'select' ? `<select id="sf_${esc(f.id)}">${f.options.map(o => `<option value="${esc(o.value)}" ${String(o.value) === String(f.value) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>` : `<input id="sf_${esc(f.id)}" type="${esc(f.type || 'text')}" ${f.required ? 'required' : ''} ${f.minlength ? `minlength="${Number(f.minlength)}"` : ''} value="${esc(f.value || '')}">`}</label>`).join('');
  simpleSave = save; $('#simpleDialog').showModal();
}

async function addDraw(number, mode) {
  if (!canOperate()) return toast('Seu perfil não permite operar o sorteio.');
  const r = state.rounds.find(x => x.id === Number($('#drawRound').value)), n = Number(number);
  if (!r) return toast('Rodada não localizada.');
  if (r.status === 'completed') return toast('Esta rodada já foi concluída.');
  if (r.drawn.length >= 75) return toast('Todos os 75 números já foram sorteados.');
  if (!Number.isInteger(n) || n < 1 || n > 75) return toast('Informe um número entre 1 e 75.');
  if (r.drawn.includes(n)) return toast('Este número já foi sorteado.');
  r.drawn.push(n); r.drawLog.push({ number: n, index: r.drawn.length, at: now(), mode, user: currentUser().name }); r.status = 'ready';
  audit(`Número ${n} sorteado por ${mode}`); const awards = evaluateWinners(r);
  await persist(awards.length ? `Temos ${awards.reduce((a, w) => a + w.cardCodes.length, 0)} cartela(s) vencedora(s).` : undefined);
}

function printableCard(c) {
  const grid = cardGrid(c), cells = grid.map((n, i) => i === 12 ? '<span class="free">★</span>' : `<span>${n}</span>`).join('');
  return `<article class="bingo-card"><header><b>${esc(state.event.name)}</b><strong>${esc(c.code)}</strong></header><div class="bingo-head"><b>B</b><b>I</b><b>N</b><b>G</b><b>O</b></div><div class="bingo-grid">${cells}</div><footer>${c.type === 'PHYSICAL' ? 'CARTELA FÍSICA' : 'CARTELA DIGITAL'} • ${new Date(c.createdAt).toLocaleString('pt-BR')}</footer></article>`;
}
function printChosenCards(ids) { const cards = state.cards.filter(c => ids.includes(c.id)); if (!cards.length) return toast('Selecione pelo menos uma cartela.'); $('#cardPrintArea').className = `print-cards per-${$('#genPerPage').value}`; $('#cardPrintArea').innerHTML = cards.map(printableCard).join(''); document.body.classList.add('printing-cards'); window.print(); setTimeout(() => document.body.classList.remove('printing-cards'), 500); }
