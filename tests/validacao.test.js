'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const V = require('../assets/js/validacao.js');

const okSignup = { name: 'Ana Souza', email: ' Ana@X.com ', password: 'abcd1234', phone: '11988887777', consent: true };

test('signup valido normaliza e-mail e formata telefone', () => {
  const r = V.signup({ ...okSignup });
  assert.equal(r.ok, true);
  assert.equal(r.value.email, 'ana@x.com');
  assert.equal(r.value.phone, '(11) 98888-7777');
  assert.match(r.value.phone, /^[0-9 ()+-]{8,20}$/);
  assert.equal(r.value.name, 'Ana Souza');
});

test('signup aceita telefone fixo de 10 digitos e ja formatado', () => {
  assert.equal(V.signup({ ...okSignup, phone: '1133334444' }).value.phone, '(11) 3333-4444');
  assert.equal(V.signup({ ...okSignup, phone: '(11) 98888-7777' }).value.phone, '(11) 98888-7777');
});

test('signup rejeita senha so com letras, curta ou sem letra', () => {
  assert.ok(V.signup({ ...okSignup, password: 'abcdefgh' }).errors.password);
  assert.ok(V.signup({ ...okSignup, password: 'abc123' }).errors.password);
  assert.ok(V.signup({ ...okSignup, password: '12345678' }).errors.password);
});

test('signup limita a senha a 72 caracteres', () => {
  const ok72 = 'a1' + 'b'.repeat(70);
  assert.equal(ok72.length, 72);
  assert.equal(V.signup({ ...okSignup, password: ok72 }).ok, true);
  assert.equal(V.signup({ ...okSignup, password: ok72 + 'c' }).errors.password, 'Use no máximo 72 caracteres.');
});

test('signup exige consentimento true', () => {
  const r = V.signup({ ...okSignup, consent: false });
  assert.equal(r.ok, false);
  assert.equal(r.errors.consent, 'Aceite a política de privacidade');
  assert.ok(V.signup({ ...okSignup, consent: 'true' }).errors.consent);
});

test('signup valida nome, e-mail e telefone', () => {
  assert.ok(V.signup({ ...okSignup, name: 'A' }).errors.name);
  assert.ok(V.signup({ ...okSignup, name: 'x'.repeat(121) }).errors.name);
  assert.ok(V.signup({ ...okSignup, email: 'ana@' }).errors.email);
  assert.ok(V.signup({ ...okSignup, email: 'ana@x' }).errors.email);
  assert.ok(V.signup({ ...okSignup, email: 'a'.repeat(250) + '@x.com' }).errors.email);
  assert.ok(V.signup({ ...okSignup, phone: '123' }).errors.phone);
  assert.ok(V.signup({ ...okSignup, phone: '119888877770' }).errors.phone);
});

test('signup nao quebra com entrada vazia', () => {
  const r = V.signup({});
  assert.equal(r.ok, false);
  assert.ok(r.errors.name && r.errors.email && r.errors.password && r.errors.phone && r.errors.consent);
});

test('measures aceita virgula, vazio vira ausente, espacos sao removidos', () => {
  const r = V.measures({ busto: '88,5', cintura: '', quadril: ' 99 ' });
  assert.deepEqual(r, { ok: true, value: { busto: 88.5, quadril: 99 } });
});

test('measures rejeita fora da faixa e nao numerico', () => {
  assert.ok(V.measures({ busto: '300' }).errors.busto);
  assert.ok(V.measures({ busto: '39' }).errors.busto);
  assert.ok(V.measures({ cintura: 'abc' }).errors.cintura);
  assert.ok(V.measures({ altura: '119' }).errors.altura);
  assert.ok(V.measures({ altura: '221' }).errors.altura);
  assert.equal(V.measures({ altura: '165,5' }).value.altura, 165.5);
  assert.equal(V.measures({ altura: '220' }).ok, true);
});

test('measures arredonda a 1 casa', () => {
  assert.equal(V.measures({ busto: '88,56' }).value.busto, 88.6);
});

test('profile valida CPF com digitos verificadores', () => {
  assert.ok(V.profile({ full_name: 'Ana', cpf: '111.111.111-11' }).errors.cpf);
  assert.ok(V.profile({ full_name: 'Ana', cpf: '529.982.247-24' }).errors.cpf);
  assert.ok(V.profile({ full_name: 'Ana', cpf: '123' }).errors.cpf);
  const r = V.profile({ full_name: 'Ana', cpf: '529.982.247-25' });
  assert.equal(r.ok, true);
  assert.equal(r.value.cpf, '52998224725');
});

test('profile: cpf e telefone sao opcionais', () => {
  const r = V.profile({ full_name: 'Ana', phone: '', cpf: '' });
  assert.equal(r.ok, true);
  assert.equal(r.value.cpf, null);
  assert.equal(r.value.phone, null);
  assert.equal(V.profile({ full_name: 'Ana', phone: '11988887777' }).value.phone, '(11) 98888-7777');
  assert.ok(V.profile({ full_name: 'Ana', phone: '12' }).errors.phone);
  assert.ok(V.profile({ full_name: 'x'.repeat(121) }).errors.full_name);
});

const okAddr = { label: 'Casa', cep: '01310-100', street: 'Av. Paulista', number: '1000', complement: '', district: 'Bela Vista', city: 'São Paulo', state: 'sp' };

test('address valido normaliza cep e UF', () => {
  const r = V.address({ ...okAddr });
  assert.equal(r.ok, true);
  assert.equal(r.value.cep, '01310100');
  assert.equal(r.value.state, 'SP');
  assert.equal(r.value.complement, null);
});

test('address rejeita UF invalida, CEP ruim e excesso de tamanho', () => {
  assert.ok(V.address({ ...okAddr, state: 'XX' }).errors.state);
  assert.ok(V.address({ ...okAddr, cep: '1234' }).errors.cep);
  assert.ok(V.address({ ...okAddr, street: 'x'.repeat(151) }).errors.street);
  assert.ok(V.address({ ...okAddr, number: '12345678901' }).errors.number);
  assert.ok(V.address({ ...okAddr, complement: 'x'.repeat(81) }).errors.complement);
  assert.ok(V.address({ ...okAddr, district: 'x'.repeat(81) }).errors.district);
  assert.ok(V.address({ ...okAddr, city: 'x'.repeat(81) }).errors.city);
  assert.ok(V.address({ ...okAddr, label: 'x'.repeat(31) }).errors.label);
  assert.ok(V.address({ ...okAddr, street: '' }).errors.street);
});
