// Regras críticas isoladas para manter a apuração determinística e conservadora.
function patternGroups(pattern) {
  if (pattern === 'CORNERS') return [[0, 4, 20, 24]];
  if (pattern === 'LINE') return [
    [0, 1, 2, 3, 4],
    [5, 6, 7, 8, 9],
    [10, 11, 12, 13, 14],
    [15, 16, 17, 18, 19],
    [20, 21, 22, 23, 24]
  ];
  return [[...Array(25).keys()].filter(i => i !== 12)];
}

function missingForPattern(card, drawn, pattern = 'FULL') {
  if (card.layout === 'LEGACY' && pattern !== 'FULL') return 99;
  const set = new Set(drawn), grid = cardGrid(card);
  return Math.min(...patternGroups(pattern).map(group => group.reduce((missing, idx) => idx === 12 || set.has(grid[idx]) ? missing : missing + 1, 0)));
}

function createCard(code, saleId, type = 'DIGITAL') {
  return { id: crypto.randomUUID(), saleId, code, numbers: standardBingoNumbers(), layout: 'BINGO75', type, createdAt: now(), status: 'valid' };
}

function evaluateWinners(round) {
  const prize = (round.prizes || []).find(p => !winnerForPrize(round.id, p.id));
  if (!prize) return [];

  const alreadyWonSamePattern = new Set(
    state.winners
      .filter(w => String(w.roundId) === String(round.id) && w.pattern === prize.pattern && w.status !== 'canceled')
      .flatMap(w => w.cardIds || [])
  );

  const cards = state.cards.filter(c =>
    c.status === 'valid' &&
    !alreadyWonSamePattern.has(c.id) &&
    (prize.pattern === 'FULL' || c.layout !== 'LEGACY') &&
    missingForPattern(c, round.drawn, prize.pattern) === 0
  );
  if (!cards.length) return [];

  const award = {
    id: crypto.randomUUID(), roundId: round.id, roundName: round.name, prizeId: prize.id, prizeName: prize.name,
    pattern: prize.pattern, prizeValue: Number(prize.value || 0), cardIds: cards.map(c => c.id), cardCodes: cards.map(c => c.code),
    tie: cards.length > 1, shareValue: cards.length ? Number(prize.value || 0) / cards.length : 0,
    status: 'pending', at: now(), drawIndex: round.drawn.length, drawNumber: round.drawn.at(-1), operator: currentUser()?.name
  };
  state.winners.unshift(award);
  audit(`Vencedor apurado: ${prize.name} — ${cards.map(c => c.code).join(', ')}${cards.length > 1 ? ' (empate)' : ''}`);

  if ((round.prizes || []).length && (round.prizes || []).every(p => winnerForPrize(round.id, p.id))) {
    round.status = 'completed';
    round.completedAt = now();
    const next = state.rounds.find(r => r.id > round.id && r.status !== 'completed');
    if (next && next.status === 'waiting') next.status = 'ready';
  }
  return [award];
}

function renderDraw() {
  const sel = $('#drawRound');
  const selectedId = Number(sel.value);
  const selectedRound = state.rounds.find(r => r.id === selectedId);
  const active = selectedRound && selectedRound.status !== 'completed'
    ? selectedRound
    : state.rounds.find(r => r.status === 'ready') || state.rounds.find(r => r.status !== 'completed') || state.rounds.at(-1) || state.rounds[0];
  const id = active?.id;
  sel.innerHTML = state.rounds.map(r => `<option value="${r.id}" ${r.id === id ? 'selected' : ''}>${esc(r.name)} — ${(r.prizes || []).length} prêmio(s)</option>`).join('');
  $('#drawMode').value = state.settings.drawMode || 'automatic';
  const r = state.rounds.find(x => x.id === id) || state.rounds[0];
  if (!r) return;
  $('#currentBall').textContent = r.drawn.at(-1) || '—';
  $('#drawCount').textContent = `${r.drawn.length}/75`;
  $('#numberGrid').innerHTML = Array.from({ length: 75 }, (_, i) => `<span class="number ${r.drawn.includes(i + 1) ? 'drawn' : ''}">${i + 1}</span>`).join('');
  const prize = (r.prizes || []).find(p => !winnerForPrize(r.id, p.id)) || (r.prizes || [])[0];
  const pattern = prize?.pattern || 'FULL';
  const ranked = state.cards
    .filter(c => c.status === 'valid' && (pattern === 'FULL' || c.layout !== 'LEGACY'))
    .map(c => ({ ...c, missing: missingForPattern(c, r.drawn, pattern) }))
    .sort((a, b) => a.missing - b.missing || String(a.code).localeCompare(String(b.code))).slice(0, 10);
  const legacyNotice = pattern !== 'FULL' && state.cards.some(c => c.status === 'valid' && c.layout === 'LEGACY') ? '<p class="muted">Cartelas antigas sem grade BINGO 75 são ignoradas neste padrão.</p>' : '';
  $('#ranking').innerHTML = legacyNotice + (ranked.length ? `<p class="muted">Apuração para: <b>${esc(prize?.name || 'Cartela cheia')}</b> (${pattern === 'FULL' ? 'cartela cheia' : pattern === 'LINE' ? 'linha horizontal' : 'quatro cantos'})</p>` + ranked.map((c, i) => `<div class="rank-row ${c.missing === 0 ? 'winner' : ''}"><b>#${i + 1}</b><span>${esc(c.code)}</span><strong>${c.missing === 0 ? 'VENCEDORA' : c.missing <= 3 ? `Faltam ${c.missing}` : `${c.missing} faltantes`}</strong></div>`).join('') : '<p class="muted">A classificação aparecerá após a geração ou venda das cartelas.</p>');
  const manual = $('#drawMode').value === 'manual';
  $('.manual-draw').style.display = manual ? 'flex' : 'none';
  $('#drawNumber').style.display = manual ? 'none' : 'inline-block';
  $('#drawNumber').disabled = !canOperate() || r.drawn.length >= 75 || r.status === 'completed';
  $('#confirmManual').disabled = !canOperate() || r.drawn.length >= 75 || r.status === 'completed';
}
