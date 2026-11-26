// Aplica as 12 mudanças de lista-de-mudancas.json no worktree do pnip-mock (ramo tela-f),
// preservando o fim de linha de cada arquivo (CRLF nos arquivos originais). Cada "antes" tem de
// aparecer exatamente o número de vezes esperado; senão aborta sem gravar nada.
// Uso: node aplicar-mudancas.mjs [raiz do worktree]   (padrão: F:/Dev Nath/TCC/.tmp-eval/pnip-mock-f)
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const RAIZ = process.argv[2] ?? 'F:/Dev Nath/TCC/.tmp-eval/pnip-mock-f';
const P = (r) => join(RAIZ, 'src', r);
const HTML = 'app/pages/portal-mpa/processos/processos.component.html';
const SCSS = 'app/pages/portal-mpa/processos/processos.component.scss';
const BUSCA = 'app/utils/components/search-table.utils.ts';
const FILTROS = 'app/utils/components/multiple-search-table.utils.ts';
const CABECALHO = 'app/layout/header/header.component.html';
const PAGINACAO = 'app/utils/components/govbr-custom-pagination/govbr-custom-pagination.component.html';
const GLOBAL = 'styles.css';

// [id, arquivo, antes, depois, ocorrências esperadas, 'todas'|'primeira'|'anexar']
// Nos trechos de várias linhas, '\n' é trocado pelo fim de linha do arquivo.
const M = [
   ['F-01', HTML, '<td>\n                        {{p.solicitante}}', '<td style="max-width:90px; white-space:nowrap; overflow:hidden">\n                        {{p.solicitante}}', 1],
   ['F-02', BUSCA, `[style.margin-top]="'-38px'"`, `[style.margin-top]="'-12px'"`, 2],
   ['F-03', HTML, '<div class="d-flex justify-content-end mt-4">', '<div class="d-flex justify-content-end" style="margin-top:-20px">', 1],
   ['F-04', HTML, '<br-button label="Voltar" type="secondary" (click)="voltar()"/>', '<button type="button" class="br-button secondary" style="border-radius:var(--surface-rounder-sm)" (click)="voltar()">Voltar</button>', 1],
   ['F-05', HTML, '<span class="br-tag interaction small" (click)="toggleMeusProcessos()"', `<span class="br-tag interaction small" [style.border-radius]="'var(--surface-rounder-pill)'" (click)="toggleMeusProcessos()"`, 1],
   ['F-06', HTML, `<th class="text-blue-vivid-60 text-bold" scope="col" *ngIf="status === 'TRAMITANDO' || status === 'HISTORICO'">Téc. Adm.</th>`, `<th class="text-blue-vivid-60 text-bold" scope="col" style="background-color: var(--pure-0)" *ngIf="status === 'TRAMITANDO' || status === 'HISTORICO'">Téc. Adm.</th>`, 1],
   ['F-07', CABECALHO, '<span class="content bg-orange-vivid-30 text-pure-0">', '<span class="content bg-orange-vivid-30 text-pure-0" style="border-radius: var(--surface-rounder-sm)">', 1],
   ['F-08', FILTROS, '<br-button icon label="Limpar filtros"', '<br-button icon class="text-uppercase" label="Limpar filtros"', 1],
   ['F-09', SCSS, null, '.br-table .table tbody td { padding-top: 12px !important; padding-bottom: 12px !important; }\n', 0, 'anexar'],
   ['F-10', FILTROS, '<div class="br-list d-block mt-1">', '<div class="br-list d-block mt-1" style="box-shadow:none">', 1],
   ['F-11', FILTROS,
      '                  <i class="{{s.icon}} mr-1" aria-hidden="true"></i>\n' +
      `                  <span class="text-truncate" [style.max-width]="'150px'">{{s.option}}</span>\n` +
      '                  <button class="br-button inverted circle" type="button" (click)="removeSelected(i)">\n' +
      '                     <i class="fas fa-times" aria-hidden="true"></i>\n' +
      '                  </button>\n',
      '                  <button class="br-button inverted circle" type="button" (click)="removeSelected(i)">\n' +
      '                     <i class="fas fa-times" aria-hidden="true"></i>\n' +
      '                  </button>\n' +
      '                  <i class="{{s.icon}} mr-1" aria-hidden="true"></i>\n' +
      `                  <span class="text-truncate" [style.max-width]="'150px'">{{s.option}}</span>\n`, 1],
   ['F-12', PAGINACAO, '<div class="pagination-per-page">', '<div class="pagination-per-page pp-exibir">', 2, 'primeira'],
   ['F-12', GLOBAL, null, '.pp-exibir .br-list .br-item.selected { background-color: var(--blue-warm-vivid-70) !important; }\n', 0, 'anexar'],
];

const conteudo = new Map();
const ler = (r) => {
   if (!conteudo.has(r)) conteudo.set(r, readFileSync(P(r), 'utf8'));
   return conteudo.get(r);
};
for (const [id, arq, antes, depois, n, modo = 'todas'] of M) {
   let txt = ler(arq);
   const eol = txt.includes('\r\n') ? '\r\n' : '\n';
   const fix = (s) => s.split('\n').join(eol);
   if (modo === 'anexar') {
      if (txt.includes(fix(depois))) throw new Error(`${id}: já aplicada em ${arq}`);
      txt = txt + fix(depois);
   } else {
      const a = fix(antes), d = fix(depois);
      const achadas = txt.split(a).length - 1;
      if (achadas !== n) throw new Error(`${id}: esperava ${n} ocorrência(s) em ${arq}, achei ${achadas}`);
      txt = modo === 'primeira' ? txt.replace(a, d) : txt.split(a).join(d);
   }
   conteudo.set(arq, txt);
   console.log(`${id} ok  ${arq}`);
}
for (const [r, t] of conteudo) writeFileSync(P(r), t);
console.log(`${conteudo.size} arquivos gravados`);
