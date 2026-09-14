const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');

function loadLogic() {
  const context = { console, crypto, state: { sequences: { sale: 0, card: 0 } } };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../src/renderer/renderer-logic.js'), 'utf8'), context);
  return context;
}

const sampleCard = {
  numbers: [
    1, 16, 31, 46, 61,
    2, 17, 32, 47, 62,
    3, 18,     48, 63,
    4, 19, 33, 49, 64,
    5, 20, 34, 50, 65
  ]
};

test('apuração reconhece linha, cantos e cartela cheia', () => {
  const ctx = loadLogic();
  assert.equal(ctx.missingForPattern(sampleCard, [1, 16, 31, 46, 61], 'LINE'), 0);
  assert.equal(ctx.missingForPattern(sampleCard, [1, 61, 5, 65], 'CORNERS'), 0);
  assert.equal(ctx.missingForPattern(sampleCard, sampleCard.numbers, 'FULL'), 0);
  assert.equal(ctx.missingForPattern(sampleCard, [1, 16, 31, 46], 'LINE'), 1);
});

test('gerador cria cartela BINGO 75 com 24 números únicos nas faixas corretas', () => {
  const ctx = loadLogic();
  for (let run = 0; run < 100; run++) {
    const numbers = ctx.standardBingoNumbers();
    assert.equal(numbers.length, 24);
    assert.equal(new Set(numbers).size, 24);
    const grid = ctx.cardGrid({ numbers });
    for (let row = 0; row < 5; row++) {
      assert.ok(grid[row * 5] >= 1 && grid[row * 5] <= 15);
      assert.ok(grid[row * 5 + 1] >= 16 && grid[row * 5 + 1] <= 30);
      if (row !== 2) assert.ok(grid[row * 5 + 2] >= 31 && grid[row * 5 + 2] <= 45);
      assert.ok(grid[row * 5 + 3] >= 46 && grid[row * 5 + 3] <= 60);
      assert.ok(grid[row * 5 + 4] >= 61 && grid[row * 5 + 4] <= 75);
    }
    assert.equal(grid[12], 0);
  }
});

test('sequências são monotônicas e não dependem do tamanho dos arrays', () => {
  const ctx = loadLogic();
  assert.equal(ctx.nextSequence('sale'), 1);
  assert.equal(ctx.nextSequence('sale'), 2);
  assert.equal(ctx.nextSequence('card'), 1);
});
