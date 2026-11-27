'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { recommendSize, guideFor, fieldsFor, GUIDE } = require('../assets/js/medidas.js');

test('recommendSize superior: todas as medidas em M', () => {
  assert.deepEqual(recommendSize('superior', { busto: 92, cintura: 74, quadril: 100 }), { size: 'M', fit: 'ok' });
});

test('recommendSize superior: pega o maior tamanho entre as medidas', () => {
  assert.deepEqual(recommendSize('superior', { busto: 92, cintura: 80 }), { size: 'G', fit: 'ok' });
});

test('recommendSize superior: uma medida so', () => {
  assert.deepEqual(recommendSize('superior', { cintura: 70 }), { size: 'P', fit: 'ok' });
});

test('recommendSize superior: acima do maior tamanho => GG justo', () => {
  assert.deepEqual(recommendSize('superior', { busto: 120 }), { size: 'GG', fit: 'justo' });
});

test('recommendSize superior: abaixo do menor tamanho => PP folgado', () => {
  assert.deepEqual(recommendSize('superior', { busto: 70 }), { size: 'PP', fit: 'folgado' });
});

test('recommendSize superior: sem medidas => null', () => {
  assert.equal(recommendSize('superior', {}), null);
});

test('recommendSize inferior: cintura e quadril => 40', () => {
  assert.deepEqual(recommendSize('inferior', { cintura: 73, quadril: 99 }), { size: '40', fit: 'ok' });
});

test('recommendSize com available restringe os tamanhos', () => {
  assert.deepEqual(recommendSize('superior', { busto: 82 }, ['P', 'M', 'G']), { size: 'P', fit: 'ok' });
});

test('recommendSize com available: sobe para o proximo maior disponivel', () => {
  assert.deepEqual(recommendSize('superior', { busto: 82 }, ['M', 'G']), { size: 'M', fit: 'ok' });
});

test('recommendSize com available: nenhum maior => maior disponivel justo', () => {
  assert.deepEqual(recommendSize('superior', { busto: 104 }, ['P', 'M']), { size: 'M', fit: 'justo' });
});

test('recommendSize ignora tipo desconhecido', () => {
  assert.equal(recommendSize('xyz', { busto: 90 }), null);
});

test('guideFor por categoria', () => {
  assert.equal(guideFor('vestidos'), 'superior');
  assert.equal(guideFor('calcas'), 'inferior');
  assert.equal(guideFor('acessorios'), null);
  assert.equal(guideFor('desconhecida'), null);
  assert.equal(guideFor('saias', ['P', 'M', 'G']), 'superior');
  assert.equal(guideFor('saias', ['38', '40']), 'inferior');
});

test('fieldsFor', () => {
  assert.deepEqual(fieldsFor('superior', 'saias'), ['cintura', 'quadril']);
  assert.deepEqual(fieldsFor('inferior', 'calcas'), ['cintura', 'quadril']);
  assert.deepEqual(fieldsFor('superior', 'vestidos'), ['busto', 'cintura', 'quadril']);
});

test('GUIDE tem os tamanhos esperados', () => {
  assert.deepEqual(Object.keys(GUIDE.superior.sizes), ['PP', 'P', 'M', 'G', 'GG']);
  assert.deepEqual(Object.keys(GUIDE.inferior.sizes), ['36', '38', '40', '42', '44']);
});
