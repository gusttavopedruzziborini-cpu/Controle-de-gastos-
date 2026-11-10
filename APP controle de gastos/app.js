// Categorias: [emoji, cor]
const CATS = {
  'Alimentação': ['🍔', '#e8833a'],
  'Transporte':  ['🚌', '#3b82c4'],
  'Moradia':     ['🏠', '#8b6fd1'],
  'Lazer':       ['🎮', '#d9528f'],
  'Saúde':       ['💊', '#2fa37a'],
  'Educação':    ['📚', '#c9a227'],
  'Outros':      ['🧾', '#7b8a8d']
};
const KEY = 'gastos-v1';
const $ = s => document.querySelector(s);
const cat = c => CATS[c] || CATS['Outros'];
const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hoje = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);

// Dados guardados no próprio celular (localStorage)
let gastos = [];
try { gastos = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) {}
const salvar = () => { try { localStorage.setItem(KEY, JSON.stringify(gastos)); } catch (e) {} };

let mesAtual = new Date();
mesAtual.setDate(1);
const chaveMes = () => mesAtual.getFullYear() + '-' + String(mesAtual.getMonth() + 1).padStart(2, '0');

function render() {
  $('#monthLabel').textContent = mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const mes = gastos
    .filter(g => g.data.slice(0, 7) === chaveMes())
    .sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id);
  const total = mes.reduce((s, g) => s + g.valor, 0);

  $('#total').textContent = brl(total);
  $('#count').textContent = mes.length
    ? mes.length + (mes.length > 1 ? ' gastos neste mês' : ' gasto neste mês')
    : 'Nenhum gasto neste mês';

  // Total por categoria
  const por = {};
  mes.forEach(g => por[g.cat] = (por[g.cat] || 0) + g.valor);
  const ord = Object.entries(por).sort((a, b) => b[1] - a[1]);
  $('#bar').innerHTML = ord.map(([c, v]) => `<i style="flex:${v};background:${cat(c)[1]}"></i>`).join('');
  $('#legend').innerHTML = ord.map(([c, v]) =>
    `<li><b style="background:${cat(c)[1]}"></b><span>${esc(c)}</span><em>${brl(v)}</em><small>${Math.round(v / total * 100)}%</small></li>`).join('');

  // Lista agrupada por dia
  let html = '', ultimo = '';
  mes.forEach(g => {
    if (g.data !== ultimo) {
      ultimo = g.data;
      html += `<li class="day">${new Date(g.data + 'T00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}</li>`;
    }
    html += `<li class="item" data-id="${g.id}">
      <span class="ico" style="background:${cat(g.cat)[1]}22">${cat(g.cat)[0]}</span>
      <div><strong>${esc(g.desc)}</strong><small>${esc(g.cat)}</small></div>
      <span class="val">${brl(g.valor)}</span>
      <button class="del" data-del="${g.id}" aria-label="Excluir gasto">✕</button>
    </li>`;
  });
  $('#list').innerHTML = html;
  $('#empty').hidden = mes.length > 0;
}

function abrir(g) {
  $('#dlgTitle').textContent = g ? 'Editar gasto' : 'Novo gasto';
  $('#id').value = g ? g.id : '';
  $('#desc').value = g ? g.desc : '';
  $('#valor').value = g ? String(g.valor).replace('.', ',') : '';
  $('#data').value = g ? g.data : hoje();
  $('#erro').textContent = '';
  document.querySelector(`input[name=cat][value="${g ? g.cat : 'Alimentação'}"]`).checked = true;
  $('#dlg').showModal();
}

// Categorias como botões
$('#chips').innerHTML = Object.keys(CATS).map(c =>
  `<label><input type="radio" name="cat" value="${c}"><span>${CATS[c][0]} ${c}</span></label>`).join('');

$('#form').addEventListener('submit', e => {
  e.preventDefault();
  let t = $('#valor').value.trim();
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const valor = parseFloat(t);
  if (!(valor > 0)) { $('#erro').textContent = 'Digite um valor maior que zero.'; return; }

  const obj = {
    desc: $('#desc').value.trim(),
    valor,
    cat: document.querySelector('input[name=cat]:checked').value,
    data: $('#data').value
  };
  const id = $('#id').value;
  if (id) Object.assign(gastos.find(g => g.id == id), obj);
  else gastos.push({ id: Date.now(), ...obj });
  salvar();

  const [a, m] = obj.data.split('-');           // mostra o mês do gasto salvo
  mesAtual = new Date(+a, +m - 1, 1);
  $('#dlg').close();
  render();
});

$('#fab').onclick = () => abrir();
$('#cancel').onclick = () => $('#dlg').close();
$('#dlg').addEventListener('click', e => { if (e.target === $('#dlg')) $('#dlg').close(); });
$('#prev').onclick = () => { mesAtual.setMonth(mesAtual.getMonth() - 1); render(); };
$('#next').onclick = () => { mesAtual.setMonth(mesAtual.getMonth() + 1); render(); };

$('#list').addEventListener('click', e => {
  const del = e.target.closest('[data-del]');
  if (del) {
    if (confirm('Excluir este gasto?')) {
      gastos = gastos.filter(g => g.id != del.dataset.del);
      salvar(); render();
    }
    return;
  }
  const item = e.target.closest('.item');
  if (item) abrir(gastos.find(g => g.id == item.dataset.id));
});

render();

// Registra o service worker (faz o app funcionar offline)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js'));
}
