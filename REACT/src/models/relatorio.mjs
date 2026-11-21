// Relatório de indicadores: a mesma estrutura alimenta a prévia na tela e o PDF.
import { PERIODOS } from './dashboard.mjs';

const CORES_CONDICAO = ['#c3c7d0', '#3ea67a', '#f0b04a', '#e0605a'];
const CORES_MOVIMENTO = ['#2a78d6', '#eb6834', '#1baf7a'];

const variacaoTexto = x => (x == null ? '—' : (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x) + '%');
const porcentagem = (n, total) => (total ? Math.round((n / total) * 100) : 0) + '%';

export function relatorioSecoes(dash) {
  const segundos = dash.localizacao.segundos;
  const alertas = [...dash.alertas.urgente, ...dash.alertas.revisar];
  const mov = dash.movimentacoes;
  return {
    cabecalho: {
      marca: 'MIDNIGHTTRAIN · ARMAZÉM DE DORMENTES',
      titulo: 'Relatório de indicadores',
      sub: `Período: ${dash.periodo}${dash.patio ? ` · ${dash.patio}` : ''} · Gerado em ${new Date(dash.geradoEm).toLocaleDateString('pt-BR')}`,
    },
    indicadores: {
      titulo: 'INDICADORES',
      colunas: ['Indicador', 'Atual', 'vs período anterior'],
      linhas: [
        ['Avaliados', `${dash.avaliados.pct}%`, variacaoTexto(dash.avaliados.variacao)],
        ['Taxa de perdas', `${String(dash.perdas.taxa).replace('.', ',')}%`, variacaoTexto(dash.perdas.variacao)],
        ['Tempo de localização', segundos == null ? '—' : `${segundos} s`, variacaoTexto(dash.localizacao.variacao)],
        ['Eficiência operacional', dash.eficiencia.pct == null ? '—' : `${dash.eficiencia.pct}%`, variacaoTexto(dash.eficiencia.variacao)],
      ],
    },
    condicao: {
      titulo: `CONDIÇÃO DOS DORMENTES (${dash.total})`,
      linhas: dash.condicoes.map((c, i) => ({ cor: CORES_CONDICAO[i], nome: c.nome, n: c.n, extra: porcentagem(c.n, dash.total) })),
    },
    movimentacoes: {
      titulo: `MOVIMENTAÇÕES · ${mov.total} ${mov.total === 1 ? 'movimentação' : 'movimentações'} ${PERIODOS[dash.periodo].texto}`,
      linhas: mov.tipos.map((t, i) => ({ cor: CORES_MOVIMENTO[i], nome: t.nome, n: t.n })),
    },
    pendencias: {
      titulo: `PENDÊNCIAS (${dash.alertas.total})`,
      linhas: alertas.length ? alertas.map(a => ({ nome: a.titulo, n: a.n })) : [{ nome: 'Nenhuma pendência', n: '' }],
    },
  };
}

const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function relatorioHtml(dash) {
  const s = relatorioSecoes(dash);
  const linhasTabela = (linhas, colunas) => linhas.map(l => `<tr>${
    colunas(l).map(([html, estilo]) => `<td style="${estilo}">${html}</td>`).join('')}</tr>`).join('');
  const quadrado = cor => `<span style="display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:7px;background:${cor}"></span>`;
  const secao = (titulo, corpo) => `<h2>${esc(titulo)}</h2><table>${corpo}</table>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
    @page { margin: 28px; }
    body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #1c1c1e; font-size: 13px; }
    .topo { border-bottom: 2px solid #1c1c1e; padding-bottom: 12px; margin-bottom: 22px; }
    .marca { font-size: 11px; font-weight: 600; letter-spacing: .04em; color: #55555c; }
    h1 { margin: 4px 0; font-size: 22px; } .sub { font-size: 12px; color: #55555c; }
    h2 { margin: 22px 0 6px; font-size: 11px; letter-spacing: .04em; color: #55555c; }
    table { width: 100%; border-collapse: collapse; } td, th { padding: 7px 8px 7px 0; border-top: .5px solid #d8d8de; text-align: left; }
    th { font-weight: 400; color: #55555c; font-size: 12px; border-top: 0; }
  </style></head><body>
  <div class="topo"><div class="marca">${esc(s.cabecalho.marca)}</div><h1>${esc(s.cabecalho.titulo)}</h1><div class="sub">${esc(s.cabecalho.sub)}</div></div>
  ${secao(s.indicadores.titulo, `<tr>${s.indicadores.colunas.map(c => `<th>${esc(c)}</th>`).join('')}</tr>${
    linhasTabela(s.indicadores.linhas, l => [[esc(l[0]), 'font-weight:600'], [esc(l[1]), 'font-weight:700'], [esc(l[2]), '']])}`)}
  ${secao(s.condicao.titulo, linhasTabela(s.condicao.linhas, l => [[quadrado(l.cor) + esc(l.nome), ''], [esc(l.n), 'text-align:right;font-weight:700'], [esc(l.extra), 'text-align:right;color:#55555c']]))}
  ${secao(s.movimentacoes.titulo, linhasTabela(s.movimentacoes.linhas, l => [[quadrado(l.cor) + esc(l.nome), ''], [esc(l.n), 'text-align:right;font-weight:700']]))}
  ${secao(s.pendencias.titulo, linhasTabela(s.pendencias.linhas, l => [[esc(l.nome), ''], [esc(l.n), 'text-align:right;font-weight:700']]))}
  </body></html>`;
}
