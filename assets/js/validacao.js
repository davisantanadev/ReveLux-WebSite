/* Rêve Lux - validação pura dos formulários da conta da cliente.
   Sem DOM e sem dependências. Navegador: window.RL_VALID. Node: module.exports.
   Cada função retorna { ok: true, value } ou { ok: false, errors: { campo: 'mensagem' } }.
   Os limites seguem as colunas de public.profiles e public.addresses. */
(function (root) {
  'use strict';

  var UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
    'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

  function str(v) { return v == null ? '' : String(v).trim(); }
  function digits(v) { return str(v).replace(/\D/g, ''); }
  function done(errors, value) {
    return Object.keys(errors).length ? { ok: false, errors: errors } : { ok: true, value: value };
  }

  // Retorna telefone formatado, '' se vazio, ou null se inválido (10-11 dígitos).
  function phone(v) {
    var d = digits(v);
    if (!d) return '';
    if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
    return null;
  }

  function nameOk(n) { return n.length >= 2 && n.length <= 120; }

  function cpfOk(c) {
    if (!/^\d{11}$/.test(c) || /^(\d)\1{10}$/.test(c)) return false;
    for (var t = 9; t <= 10; t++) {
      var s = 0;
      for (var i = 0; i < t; i++) s += Number(c[i]) * (t + 1 - i);
      var dv = (s * 10) % 11 % 10;
      if (dv !== Number(c[t])) return false;
    }
    return true;
  }

  function signup(d) {
    d = d || {};
    var e = {};
    var name = str(d.name);
    var email = str(d.email).toLowerCase();
    var password = d.password == null ? '' : String(d.password);
    var tel = phone(d.phone);

    if (!nameOk(name)) e.name = 'Informe seu nome (2 a 120 caracteres)';
    if (email.length > 254 || !/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) e.email = 'Informe um e-mail válido';
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      e.password = 'A senha precisa de 8 caracteres, com letra e número';
    } else if (password.length > 72) {
      e.password = 'Use no máximo 72 caracteres.'; // limite do bcrypt no Supabase Auth
    }
    if (!tel) e.phone = 'Informe um telefone com DDD';
    if (d.consent !== true) e.consent = 'Aceite a política de privacidade';

    return done(e, { name: name, email: email, password: password, phone: tel, consent: true });
  }

  function profile(d) {
    d = d || {};
    var e = {};
    var name = str(d.full_name);
    var tel = phone(d.phone);
    var cpf = digits(d.cpf);

    if (!nameOk(name)) e.full_name = 'Informe seu nome (2 a 120 caracteres)';
    if (tel === null) e.phone = 'Telefone inválido. Use DDD + número';
    if (cpf && !cpfOk(cpf)) e.cpf = 'CPF inválido';

    return done(e, { full_name: name, phone: tel || null, cpf: cpf || null });
  }

  var MEDIDAS = {
    busto: [40, 200, 'Busto'],
    cintura: [40, 200, 'Cintura'],
    quadril: [40, 200, 'Quadril'],
    altura: [120, 220, 'Altura']
  };

  function measures(d) {
    d = d || {};
    var e = {};
    var out = {};
    Object.keys(MEDIDAS).forEach(function (k) {
      var raw = str(d[k]).replace(',', '.');
      if (raw === '') return;
      var lim = MEDIDAS[k];
      var n = /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : NaN;
      if (isNaN(n) || n < lim[0] || n > lim[1]) {
        e[k] = lim[2] + ' deve ficar entre ' + lim[0] + ' e ' + lim[1] + ' cm';
        return;
      }
      out[k] = Math.round(n * 10) / 10;
    });
    return done(e, out);
  }

  function address(d) {
    d = d || {};
    var e = {};
    var label = str(d.label) || 'Casa';
    var cep = digits(d.cep);
    var street = str(d.street);
    var number = str(d.number);
    var complement = str(d.complement);
    var district = str(d.district);
    var city = str(d.city);
    var state = str(d.state).toUpperCase();

    if (label.length > 30) e.label = 'Apelido com no máximo 30 caracteres';
    if (cep.length !== 8) e.cep = 'CEP deve ter 8 números';
    if (!street || street.length > 150) e.street = 'Informe a rua (até 150 caracteres)';
    if (!number || number.length > 10) e.number = 'Informe o número (até 10 caracteres)';
    if (complement.length > 80) e.complement = 'Complemento com no máximo 80 caracteres';
    if (!district || district.length > 80) e.district = 'Informe o bairro (até 80 caracteres)';
    if (!city || city.length > 80) e.city = 'Informe a cidade (até 80 caracteres)';
    if (UFS.indexOf(state) === -1) e.state = 'Selecione um estado válido';

    return done(e, {
      label: label, cep: cep, street: street, number: number,
      complement: complement || null, district: district, city: city, state: state
    });
  }

  var api = { signup: signup, profile: profile, measures: measures, address: address, UFS: UFS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.RL_VALID = api;
})(typeof window !== 'undefined' ? window : globalThis);
