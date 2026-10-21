# Sistema Aloca

Sistema de alocação de salas da UNIRIO (projeto de extensão da Escola de Informática Aplicada). Recria do zero o antigo Aloca usado pelo Centro de Ciências Humanas (CCH), que não tem código-fonte nem documentação e depende de planilhas e ajustes manuais.

Documentação completa de requisitos: @docs/requisitos.md

## Objetivo

Automatizar a distribuição semestral de disciplinas (e outras atividades) em salas, reduzindo retrabalho manual e garantindo rastreabilidade, consistência dos dados e respeito às regras acadêmicas da UNIRIO.

Além de aulas regulares, o sistema aloca atividades não letivas: eventos, reuniões, atividades administrativas, projetos de extensão (inclusive aos sábados) e monitorias.

## Stack

- **Backend:** Python + Django, expondo API REST (Django REST Framework)
- **Frontend:** Next.js (App Router) + React + TypeScript, consumindo a API via HTTP
- **Banco:** MySQL via Django ORM
- **Auth:** autenticação e autorização nativas do Django; controle de acesso por perfil
- Comunicação frontend ↔ backend via HTTPS

Frontend e backend são aplicações independentes (duas bases de código).

## Estrutura hierárquica

Reitoria → Centros (ex.: CCH) → Escolas/Faculdades → Cursos → Disciplinas.
Salas pertencem a prédios/unidades. A visibilidade de cada usuário depende do seu nível nessa hierarquia.

## Perfis de usuário

- **Administrador Superior:** vê todas as salas; único que atribui/altera papéis; configuração global.
- **Reitoria:** leitura de todas as alocações (acadêmicas e não acadêmicas); não opera ajustes.
- **Decano:** vê e interage só com salas e cursos do seu Centro; solicita/aprova ajustes.
- **Diretor de Escola/Faculdade:** vê salas dos cursos da sua unidade; valida alocações, faz ajustes e aloca salas para monitoria.
- **Coordenador (pós-graduação):** vê salas dos seus cursos; pode solicitar salas.
- **Operador do Sistema (Decania/CCH):** executa a alocação automática, faz ajustes manuais, consolida dados e gera relatórios.

## Funcionalidades principais

- CRUD de disciplinas, salas e perfis de usuário
- Importação/exportação de planilhas (Excel)
- Integração com o SIE para consolidar dados de múltiplas unidades
- Validação de inconsistências (duplicidades, campos obrigatórios, códigos inválidos)
- Alocação automática + ajustes manuais posteriores
- Versionamento de alocações por semestre, com seleção da versão ativa
- Relatórios de disciplinas alocadas/não alocadas, diferenciando atividades letivas e não letivas
- Fluxo de solicitação de sala: diretores e coordenadores de pós solicitam; o responsável recebe e-mail de solicitação pendente e aceita ou recusa no sistema
- Monitoria: professor pede ao diretor, que aloca a sala

## Regras de negócio (resumo)

- Capacidade da sala ≥ número de vagas da disciplina.
- Uma sala não pode ter duas alocações no mesmo horário.
- Respeitar dias, turnos e o calendário acadêmico.
- Toda disciplina pertence a uma Unidade.
- Disciplinas com dados incompletos não entram na alocação automática.
- A sala deve ter os recursos exigidos pela disciplina; professores com deficiência precisam de salas com recursos adicionais.
- Alocações não acadêmicas não podem conflitar com aulas.
- Toda alocação tem um responsável institucional.
- Ajustes manuais devem ser registrados (auditoria).
- Usuários só veem salas compatíveis com seu nível hierárquico.

## Requisitos não funcionais relevantes para o código

- Logs de acesso e de alterações; trilha de auditoria completa
- Segregação de acesso entre perfis aplicada no backend (não confiar só no frontend)
- Integridade dos dados (constraints no banco + validação no Django)
- Alocação em tempo aceitável e suporte a crescimento de unidades/salas
- Acessibilidade para usuários com deficiência visual no frontend
- Código documentado e fácil de manter

## Pontos em aberto na especificação

- Escopo, exclusões, glossário e considerações futuras ainda não foram preenchidos.
- RF11 aparece duplicado (versão de alocação e perfis de usuário); numeração dos RFs precisa ser revista.
- As responsabilidades do Diretor e do Operador se sobrepõem no documento.
- Detalhes da integração com o SIE e do algoritmo de alocação ainda não estão definidos.

Na dúvida sobre uma regra, pergunte antes de assumir.