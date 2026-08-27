# runs-smoke/

Execuções de fumaça: `run-battery.ps1 -Scope smoke`.

**Nada aqui é medida.** São execuções de uma aba só, normalmente em modelo barato, feitas para
conferir que o encanamento funciona — protocolo carrega, permissões batem, o POST no dashboard
chega, o veredito é arquivado — antes de gastar uma bateria de verdade.

O scorer não lê este diretório. Isso é deliberado: um veredito parcial, produzido sob um recorte
de percurso e possivelmente em outro modelo, não é comparável com nada e não deve aparecer em
tabela alguma. Se alguma vez fizer sentido pontuar uma execução daqui, mova-a para `runs/` de
propósito e assuma a consequência — a cobertura parcial vai ficar registrada no relatório.

Pode apagar o conteúdo a qualquer momento.
