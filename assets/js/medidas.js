/* Rêve Lux — tabela de medidas e recomendação de tamanho (lógica pura).
 * Funciona no navegador (window.RL_MEDIDAS) e no Node (module.exports). */
(function () {
  'use strict';

  // valores de exemplo — ajuste com as medidas reais das peças
  // Cada medida é [mínimo, máximo] em cm.
  var GUIDE = {
    superior: {
      fields: ['busto', 'cintura', 'quadril'],
      sizes: {
        PP: { busto: [80, 84], cintura: [62, 66], quadril: [88, 92] },
        P: { busto: [85, 89], cintura: [67, 71], quadril: [93, 97] },
        M: { busto: [90, 94], cintura: [72, 76], quadril: [98, 102] },
        G: { busto: [95, 100], cintura: [77, 82], quadril: [103, 108] },
        GG: { busto: [101, 106], cintura: [83, 88], quadril: [109, 114] }
      }
    },
    inferior: {
      fields: ['cintura', 'quadril'],
      sizes: {
        '36': { cintura: [64, 67], quadril: [90, 93] },
        '38': { cintura: [68, 71], quadril: [94, 97] },
        '40': { cintura: [72, 75], quadril: [98, 101] },
        '42': { cintura: [76, 79], quadril: [102, 105] },
        '44': { cintura: [80, 84], quadril: [106, 110] }
      }
    }
  };

  function guideFor(category, sizes) {
    switch (category) {
      case 'calcas':
        return 'inferior';
      case 'vestidos':
      case 'conjuntos':
      case 'blusas':
        return 'superior';
      case 'saias':
        if (Array.isArray(sizes) && sizes.length > 0 &&
            sizes.every(function (s) { return /^\d+$/.test(String(s)); })) {
          return 'inferior';
        }
        return 'superior';
      default:
        return null;
    }
  }

  function fieldsFor(kind, category) {
    if (category === 'saias' || category === 'calcas' || kind === 'inferior') {
      return ['cintura', 'quadril'];
    }
    return ['busto', 'cintura', 'quadril'];
  }

  function recommendSize(kind, measures, available) {
    var guide = GUIDE[kind];
    if (!guide || !measures) return null;

    var order = Object.keys(guide.sizes);
    var firstSize = guide.sizes[order[0]];
    var lastSize = guide.sizes[order[order.length - 1]];

    var informed = guide.fields.filter(function (f) {
      var v = Number(measures[f]);
      return measures[f] !== null && measures[f] !== '' && isFinite(v) && v > 0;
    });
    if (informed.length === 0) return null;

    var idx = 0;
    var tooBig = false;
    var allSmall = true;
    informed.forEach(function (f) {
      var v = Number(measures[f]);
      var i = -1;
      for (var k = 0; k < order.length; k++) {
        if (guide.sizes[order[k]][f][1] >= v) { i = k; break; }
      }
      if (i === -1) { tooBig = true; i = order.length - 1; }
      if (v >= firstSize[f][0]) allSmall = false;
      if (i > idx) idx = i;
    });

    var fit = tooBig ? 'justo' : (allSmall ? 'folgado' : 'ok');
    var size = order[idx];

    if (Array.isArray(available)) {
      var avail = available.map(String);
      var pick = null;
      for (var j = idx; j < order.length; j++) {
        if (avail.indexOf(order[j]) !== -1) { pick = order[j]; break; }
      }
      if (pick) {
        size = pick;
      } else {
        var largest = null;
        for (var m = order.length - 1; m >= 0; m--) {
          if (avail.indexOf(order[m]) !== -1) { largest = order[m]; break; }
        }
        if (!largest) return null;
        size = largest;
        fit = 'justo';
      }
    }

    return { size: size, fit: fit };
  }

  var api = {
    GUIDE: GUIDE,
    guideFor: guideFor,
    recommendSize: recommendSize,
    fieldsFor: fieldsFor
  };

  if (typeof window !== 'undefined') window.RL_MEDIDAS = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
