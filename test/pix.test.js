const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePixKey, createPixPayload, crc16 } = require('../src/services/pix');

test('normaliza CPF/CNPJ e telefone PIX', () => {
  assert.equal(normalizePixKey('12.345.678/0001-90', 'cnpj'), '12345678000190');
  assert.equal(normalizePixKey('(12) 99999-0000', 'phone'), '+5512999990000');
  assert.equal(normalizePixKey('+55 12 99999-0000', 'phone'), '+5512999990000');
});

test('gera payload PIX com CRC válido e valor', () => {
  const payload = createPixPayload({ keyType: 'email', key: 'teste@example.com', name: 'Show de Premios', city: 'Ubatuba', description: 'Cartela' }, 5, 'JDA-0001');
  assert.match(payload, /^000201/);
  assert.match(payload, /5303986/);
  assert.match(payload, /54045\.00/);
  assert.match(payload, /5802BR/);
  assert.equal(payload.slice(-4), crc16(payload.slice(0, -4)));
});

test('recusa gerar PIX sem chave', () => {
  assert.throws(() => createPixPayload({ key: '', keyType: 'email', name: 'Teste', city: 'Ubatuba' }, 1, 'X'), /chave PIX/i);
});
