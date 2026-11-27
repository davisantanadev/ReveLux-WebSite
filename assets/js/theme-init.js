/* Aplica o tema salvo antes da pintura (evita piscar). Arquivo externo para permitir CSP sem 'unsafe-inline'. */
try { var t = localStorage.getItem('rl-theme'); if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t; } catch (e) {}
