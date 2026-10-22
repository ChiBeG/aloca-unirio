| # | Pendência | Contexto |
|---|---|---|
| P1 | O que significa período **0**? | Aparece só em Ciências Sociais, em 6 disciplinas (como "Antropologia da Religião"). Hipótese: optativa sem período fixo. |
| P2 | O que significam os períodos **10 e 11** em Pedagogia? | Trazem disciplinas introdutórias ("Introdução a Psicologia", "Libras"), o que não combina com fim de curso. A mesma disciplina aparece em 10 e em 11 com professores diferentes. Hipóteses: outra grade curricular, outro turno ou código interno do antigo Aloca. Em Museologia, o período 10 parece legítimo (inclui Estágio Curricular). |
| P3 | Onde ficam Centro, Decano e Diretor? | O script põe o Decano na Escola, mas os requisitos põem no Centro. O Diretor não aparece no script. É preciso definir a hierarquia antes de implementar a visibilidade por perfil (RN08, RN11 e RN12). |
| P4 | Disciplina ou turma? | Cada linha do CSV é uma turma (a mesma disciplina com professores e horários diferentes). Falta decidir se o modelo separa Disciplina (catálogo) de Turma/Oferta (semestre, vagas, professores). |
| P5 | Como entra o semestre? | Hoje a grade é única. O versionamento por semestre (RF10 e RF11) depende de P4. |
| P6 | A escola da disciplina deve ser igual à escola do curso? | As duas coisas existem no modelo. Falta definir se divergir é permitido (disciplina de serviço) ou se é inconsistência a ser validada (RF05). |
| P7 | Como identificar o professor? | O SIAPE não é confiável nos dados atuais, e a importação teria que deduplicar pelo nome, o que é frágil. Campos com vários professores ("A e B") precisam ser separados na importação. Seria bom confirmar se o SIE fornece SIAPE confiável. |
| P8 | O ajuste manual pode violar a RN01? | Hoje a validação de capacidade vale sempre. Falta confirmar se o operador pode forçar uma alocação em sala menor (com registro na auditoria). |
| P9 | Uma disciplina pode estar em duas salas no mesmo horário? | Não há regra no script nem nos requisitos. Hoje isso não é bloqueado. |
| P10 | Prédio de origem e sala fixa | O CSV e o alocador usam "prédio de origem" e "sala fixa" da disciplina, mas o script não tem esses campos. Precisam entrar quando o alocador passar a ler do banco. |
