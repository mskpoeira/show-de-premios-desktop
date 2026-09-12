function normalizePixKey(value, type = 'auto') {
  const raw = String(value || '').trim();
  if (type === 'cpf' || type === 'cnpj' || /^\d[\d.\/-]+$/.test(raw)) return raw.replace(/\D/g, '');
  if (type === 'phone') {
    const digits = raw.replace(/\D/g, '');
    return raw.startsWith('+') ? `+${digits}` : `+55${digits}`;
  }
  return raw;
}

const field = (id, value) => `${id}${String(value.length).padStart(2, '0')}${value}`;
const ascii = (value, max) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9 $%*+\-./:]/g, '').toUpperCase().slice(0, max);

function crc16(payload) {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function createPixPayload(config, amount = 0, reference = '') {
  const key = normalizePixKey(config.key, config.keyType);
  if (!key) throw new Error('Informe uma chave PIX.');
  const merchant = field('00', 'BR.GOV.BCB.PIX') + field('01', key) + (config.description ? field('02', ascii(config.description, 72)) : '');
  const additional = field('05', ascii(reference || '***', 25) || '***');
  let payload = field('00', '01') + field('26', merchant) + field('52', '0000') + field('53', '986');
  if (Number(amount) > 0) payload += field('54', Number(amount).toFixed(2));
  payload += field('58', 'BR') + field('59', ascii(config.name, 25)) + field('60', ascii(config.city, 15)) + field('62', additional) + '6304';
  return payload + crc16(payload);
}

module.exports = { normalizePixKey, crc16, createPixPayload };
