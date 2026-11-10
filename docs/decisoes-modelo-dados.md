# Modelo de dados: registro de decisões

Histórico das decisões sobre o modelo de dados do Aloca: o que veio de cada fonte, o que foi decidido e o que ainda está pendente. Não descreve a implementação.

## Fontes

Duas fontes, escritas em momentos diferentes e por pessoas diferentes. Elas divergem em alguns pontos.

- **Script V2** (`SCRIPTS_V2.sql` e `V2_DIAGRAMA.jpg`): modelo relacional em SQL com 9 tabelas: `Papel`, `Usuario`, `Escola_Programa`, `Predio`, `Sala`, `Curso`, `Espaco_Grade`, `Disciplina` e `Grade_Horaria`.
- **Documento de requisitos** ("Sistema Aloca - Documentação de Requisitos", v0.1): RFs, RNFs, regras de negócio e arquitetura.
- **Dados reais de entrada** (`backend/entrada/*.csv`): prédios, salas e disciplinas de 2025.2, usados hoje pelo alocador. Serviram para tirar dúvidas sobre o significado dos campos.

## Decisão de abordagem

**O schema é definido pelo ORM do Django, não pelo script SQL.** O script entra como modelo lógico de referência.

- O projeto já é Django, e os requisitos (seção 3.2) preveem "Persistência via Django ORM".
- Manter um `.sql` separado dos models criaria duas fontes de verdade, que tenderiam a se desencontrar.
- Com migrations, o schema fica versionado no git e é aplicado automaticamente no deploy.
- Ressalva: SQL versionado (Flyway, Liquibase) continua sendo prática válida em outros contextos. Aqui o motivo é a fonte única de verdade em um projeto Django.

**Os models ficam no app `alocador`**, que é o domínio da alocação e ainda não tinha models. O app `contas` continua restrito a login e papéis.

**Escopo desta entrega:** só o básico em que as fontes concordam ou que tem correção óbvia. O que diverge muito ou depende de definição foi tirado do escopo e listado em [Pendências](#pendências).

## Estado anterior à entrega

- A única migration existente era a de `contas`, que cria o `Perfil` (papel do usuário). Nenhuma tabela do script V2 existia.
- O alocador lia os CSVs e trabalhava em memória, sem gravar nada no banco.
- O banco é SQLite provisório. O MySQL ainda não foi configurado.

## Decisões por entidade

### Papel e Usuario

- **Script:** tabelas próprias `Papel` e `Usuario`. Os papéis citados são Decano, Diretor, Coordenador e Professor.
- **Requisitos:** perfis Administrador Superior, Reitoria, Decano, Diretor, Coordenador (pós) e Operador. Professor não aparece como perfil.
- **Sistema atual:** usuário do Django mais `Perfil` com os seis papéis dos requisitos. O login usa Google `@edu.unirio.br`.
- **Decisão:** não criar `Papel` nem `Usuario`. Todo vínculo com pessoa que usa o sistema aponta para o usuário do Django. Uma segunda tabela de usuários quebraria o login.

### Professor

- **Script:** professor é um `Usuario` com papel. A disciplina tem um único professor.
- **Requisitos:** professor não é perfil do sistema. Aparece na monitoria (pede sala ao diretor) e na RN16 (professor com deficiência precisa de sala com recursos).
- **Dados:** 217 nomes distintos e nenhum e-mail. O SIAPE está zerado em 382 de 405 linhas, e os poucos preenchidos têm repetições entre pessoas diferentes (por exemplo, `1234567` para dois professores). Há campos com vários professores, como "Claudia Andrade e Gabriela Scramingnon".
- **Opções avaliadas:**
  - *Professor como usuário (como no script).* A favor: uma entidade só para pessoas, e o professor já poderia logar no futuro fluxo de monitoria. Contra: não dá para importar do CSV, porque as contas nascem do login Google pelo e-mail e o CSV não tem e-mail. Exigiria um papel "Professor", e hoje papel significa acesso ao sistema.
  - *Tabela própria.* A favor: importa direto do CSV, não depende de login, pode ser vinculada a um usuário depois e é o lugar natural para a RN16. Contra: uma tabela a mais, e a mesma pessoa pode aparecer como professor e como usuário (ligados por vínculo opcional).
- **Decisão:** tabela própria `Professor`, com nome, SIAPE opcional (não único, porque os dados não permitem) e vínculo opcional com um usuário. **Uma disciplina pode ter vários professores**, correção feita a partir dos dados.

### Escola/Programa

- **Script:** tem o Decano como campo da Escola.
- **Requisitos:** a hierarquia é Reitoria → Centro → Escola/Faculdade → Curso → Disciplina. O Decano é do **Centro**. O Diretor é da Escola.
- **Decisão:** a Escola entra com código e nome. **O Decano sai do escopo**, porque está modelado no nível errado e o Centro não existe no script (ver pendências).

### Curso

- **Script:** nome, departamento e coordenador. **Não tem vínculo com a Escola.**
- **Requisitos:** o curso pertence a uma Escola. Pela RN12, diretores e coordenadores veem as salas dos seus cursos.
- **Decisão:** mantém nome, departamento e coordenador (usuário do Django, opcional). **Passa a ter vínculo obrigatório com a Escola**, porque sem ele não dá para aplicar a visibilidade por unidade.

### Prédio

- **Script:** código, nome, abreviação e endereço.
- **Decisão:** entra como está. O código do CSV vira um campo único, e o identificador interno é automático.

### Sala

- **Script:** código, capacidade e prédio.
- **Dados:** o CSV também tem o nome da sala ("202", "IDIOMAS"). O código (91202) sozinho não identifica a sala para o usuário.
- **Decisão:** entra como está, **mais o nome da sala**. Código único, capacidade obrigatória e maior que zero.

### Disciplina

- **Script:** nome, período, vagas oferecidas, curso, escola e professor.
- **Requisitos:** toda disciplina pertence a uma Unidade (RN04). Disciplinas com dados incompletos não entram na alocação automática (RN05).
- **Dados sobre `Periodo`:**
  - Os valores vão de 0 a 11 e não indicam o semestre: o semestre já está no nome do arquivo (`...-20252.csv`).
  - Turismo e Filosofia só têm períodos pares em 2025.2, o padrão de curso com entrada anual. Isso indica que se trata do **período curricular** (1º, 2º…).
- **Dados sobre o significado da linha:** a mesma disciplina aparece em várias linhas com professores e períodos diferentes. Por exemplo, "Dinâmica e Org Escolar" aparece 4 vezes. Na prática, cada linha é uma **turma**.
- **Decisão:**
  - `Periodo` é o período curricular, numérico e opcional.
  - Vagas são opcionais, como no script. A ausência caracteriza dado incompleto (RN05).
  - A disciplina mantém vínculo com o Curso **e** com a Escola, porque uma escola pode oferecer disciplina para curso de outra.
  - Os professores passam a ser vários (ver Professor).
  - Por ora, a entidade Disciplina funciona como turma (ver pendências).

### Espaço na Grade

- **Script:** dia da semana em texto livre, horário de início e horário de fim.
- **Dados:** os dias são números (2 = segunda … 6 = sexta). Os requisitos pedem atividades aos sábados (projetos de extensão).
- **Decisão:** dia da semana numérico de 2 (segunda) a 7 (sábado), seguindo a convenção do CSV. O fim tem que ser depois do início, e não pode haver dois espaços idênticos.

### Grade Horária

- **Script:** liga disciplina, espaço e sala. Não tem nenhuma regra contra conflito.
- **Requisitos:** RN01 (capacidade ≥ vagas) e RN02 (sala sem duas alocações no mesmo horário).
- **Decisão:**
  - Entra como está, sem semestre (ver pendências).
  - **RN02 no banco:** uma sala só pode ter uma alocação por espaço de grade.
  - **RN02 na validação:** também bloqueia espaços diferentes que se sobrepõem no mesmo dia (por exemplo, 8h–10h e 9h–11h), o que uma constraint simples não cobre.
  - **RN01 na validação:** a capacidade da sala deve ser maior ou igual às vagas da disciplina.

### Regras gerais

- Chaves estrangeiras protegem contra exclusão: não se apaga um prédio que tem salas, nem uma sala que tem alocações. Esse é o comportamento padrão do SQL do script.
- Todas as tabelas ficam disponíveis no admin do Django, o que já dá um CRUD básico (RF01 e RF02).

## Fora do escopo desta entrega

Itens dos requisitos que o script não cobre ou que dependem de definição. Ficam para entregas futuras.

- Centro e a hierarquia completa (Reitoria → Centro → Escola), incluindo Decano e Diretor.
- Semestre e versionamento de alocações (RF10 e RF11).
- Atividades não letivas: eventos, reuniões, extensão e monitoria (RF14 e RF15).
- Responsável institucional pela alocação (RN14).
- Recursos de sala e acessibilidade (RN15 e RN16).
- Fluxo de solicitação de sala com aceite e e-mail.
- Auditoria e registro de ajustes manuais (RN06, RNF07 e RNF09).
- Migração do SQLite para MySQL.
- Importação dos CSVs para o banco e uso do banco pelo alocador.

## Pendências

Decisões ainda não tomadas. Cada uma precisa de confirmação de alguém que conheça o processo ou de uma definição da equipe.

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
