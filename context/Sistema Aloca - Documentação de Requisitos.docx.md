![Desenho de bandeiraO conteúdo gerado por IA pode estar incorreto.][image1]

UNIVERSIDADE FEDERAL DO ESTADO DO RIO DE JANEIRO

CENTRO DE CIÊNCIAS EXATAS E TECNOLOGIA

ESCOLA DE INFORMÁTICA APLICADA

**Sistema Aloca**

PEDRO BRITTO,

Rio de Janeiro, RJ – Brasil

Janeiro de 2026

**Índice**

**[Histórico de Versões	2](#histórico-de-versões)**

[**1\. Introdução	3**](#1.-introdução)

[1.1 Contexto do Trabalho	3](#1.1-contexto-do-trabalho)

[1.2 Objetivos	3](#1.2-objetivos)

[1.3 Minimundo	3](#1.3-minimundo)

[**2\. Visão Geral do Sistema	4**](#2.-visão-geral-do-sistema)

[2.1 Escopo do sistema	4](#2.1-escopo-do-sistema)

[2.1.2 Exclusões do escopo	4](#2.1.2-exclusões-do-escopo)

[2.1.3 Considerações futuras	4](#2.1.3-considerações-futuras)

[2.2 Glossário do Sistema	4](#2.2-glossário-do-sistema)

[2.3 Atores do Sistema	4](#2.3-atores-do-sistema)

[2.4 Requisitos Funcionais do Sistema	5](#2.4-requisitos-funcionais-do-sistema)

[2.5 Requisitos Não Funcionais do Sistema	6](#2.5-requisitos-não-funcionais-do-sistema)

[2.6 Regras de Negócio do Sistema	7](#2.6-regras-de-negócio-do-sistema)

[**3\. Arquitetura do Sistema (Propostas)	9**](#heading=h.h56l6bd9fqln)

# **Histórico de Versões** {#histórico-de-versões}

| Versão | Descrição | Autor(es) |
| ----- | ----- | ----- |
| 0.1 | Esboço inicial | Pedro Britto |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |

## 

# 

# **1\. Introdução** {#1.-introdução}

## **1.1 Contexto do Trabalho** {#1.1-contexto-do-trabalho}

A distribuição semestral de disciplinas em salas é uma atividade crítica para o funcionamento acadêmico da Universidade Federal do Estado do Rio de Janeiro (Unirio), envolvendo múltiplas unidades, diferentes prédios e uma grande quantidade de dados acadêmicos.

Atualmente, o Centro de Ciências Humanas (CCH) utiliza um sistema denominado Aloca, desenvolvido por um ex-integrante da Universidade. Contudo, o sistema apresenta limitações relevantes, como a ausência de código-fonte, inexistência de documentação técnica e dependência de procedimentos manuais, o que dificulta sua manutenção, evolução e confiabilidade.

Além disso, parte significativa do processo depende de planilhas eletrônicas, conversões de formato e ajustes manuais, aumentando o risco de inconsistências, retrabalho e erros operacionais.

Diante desse cenário, surge a necessidade de recriar o sistema Aloca do zero, com uma abordagem moderna, documentada e alinhada às boas práticas de engenharia de software.

## **1.2 Objetivos** {#1.2-objetivos}

O objetivo deste trabalho é projetar um novo sistema de alocação de disciplinas em salas, substituindo o sistema Aloca atualmente utilizado pelo CCH.

O novo sistema deverá:

* Automatizar o processo de alocação de disciplinas;  
* Reduzir intervenções manuais e retrabalho;  
* Garantir rastreabilidade, consistência e validação dos dados;  
* Facilitar manutenções e futuras evoluções;  
* Atender às regras acadêmicas e administrativas da Unirio.

## **1.3 Minimundo** {#1.3-minimundo}

O sistema de alocação de salas será utilizado para organizar a distribuição de espaços físicos da Unirio, não apenas para disciplinas regulares, mas também para outras atividades acadêmicas e institucionais, como eventos, reuniões e atividades administrativas, que não caracterizam aulas.

A Universidade possui uma estrutura hierárquica composta por Reitoria, Centros (como o CCH), Escolas e Faculdades. Cada nível possui diferentes responsabilidades e visões sobre as salas, o que exige que o sistema implemente perfis de acesso distintos, respeitando os limites de visualização e operação de cada ator.

O Centro de Ciências Humanas (CCH) abriga múltiplas Escolas e Faculdades, cada uma responsável por seus cursos e disciplinas. A alocação de salas deve respeitar tanto a autonomia dessas unidades quanto a visão consolidada da gestão central.

O sistema deverá permitir que usuários com diferentes perfis visualizem, editem ou apenas acompanhem as alocações, de acordo com seu papel institucional.

# **2\. Visão Geral do Sistema** {#2.-visão-geral-do-sistema}

## **2.1 Escopo do sistema** {#2.1-escopo-do-sistema}

	

**2.1.1	Restrições iniciais** 

### **2.1.2	Exclusões do escopo**  {#2.1.2-exclusões-do-escopo}

### **2.1.3	Considerações futuras** {#2.1.3-considerações-futuras}

## **2.2 Glossário do Sistema** {#2.2-glossário-do-sistema}

## **2.3 Atores do Sistema** {#2.3-atores-do-sistema}

**Administrador Superior**

* Possui visão completa de todas as salas da Universidade.  
* Responsável por designar papéis e permissões aos usuários.  
* Atua na configuração global do sistema.

**Reitoria**

* Possui visão global de todas as salas da Universidade.  
* Acompanha alocações acadêmicas e não acadêmicas.  
* Não realiza, necessariamente, ajustes operacionais.

**Decano**

* Possui visão restrita às salas e cursos sob sua responsabilidade.  
* Pode solicitar ou aprovar ajustes.

**Diretor de Escola/Faculdade**

* Possui visão das salas associadas aos cursos de sua unidade.  
* Confere e valida as alocações das disciplinas.  
* Interage diretamente no processo de ajustes.  
* Participa da validação das alocações do seu Centro.  
* Executa o processo de alocação.  
* Realiza ajustes manuais quando necessário.  
* Consolida dados e gera relatórios.

**Operador do Sistema (Decania/CCH)**

* Executa o processo de alocação.  
* Realiza ajustes manuais quando necessário.  
* Consolida dados e gera relatórios.

## **2.4 Requisitos Funcionais do Sistema** {#2.4-requisitos-funcionais-do-sistema}

| Nº | Descrição |
| :---: | ----- |
| **RF01** | Permitir o cadastro, edição e exclusão de disciplinas. |
| **RF02** | Permitir o cadastro, edição e exclusão de salas. |
| **RF03** | Importar e exportar dados a partir de planilhas eletrônicas. |
| **RF04** | Consolidar automaticamente dados de múltiplas unidades, através da integração com o SIE. |
| **RF05** | Validar inconsistências (duplicidades, campos obrigatórios, códigos inválidos). |
| **RF06** | Executar o processo automático de alocação. |
| **RF07** | Permitir ajustes manuais após a alocação automática. |
| **RF08** | Gerar relatórios de disciplinas alocadas e não alocadas. |
| **RF09** | Exportar resultados em formato Excel. |
| **RF10** | Registrar versões de alocação por semestre. |
| **RF11** | Permitir a seleção da versão adequada da alocação. |
| **RF11** | Permitir o cadastro e manutenção de perfis de usuário. |
| **RF12** | Controlar o acesso às informações de acordo com o papel do usuário. |
| **RF13** | Permitir visualização global ou restrita das salas, conforme o perfil. |
| **RF14** | Permitir alocação de salas para atividades não relacionadas a aulas. |
| **RF15** | Diferenciar alocações de atividades letivas  e não letivas nos relatórios. |
| **RF16** | Registrar o responsável institucional por cada alocação. |
| **RF17** | Permitir que o Administrador Superior atribua e altere papéis. |

## **o sistema deve aceitar também a alocação de projetos de extensão (matemática tem alguns no sábado)**

**em caso de monitoria, o professor da matéria faz uma requisição para o diretor, e o diretor aloca a sala**

## 

## **2.5 Requisitos Não Funcionais do Sistema** {#2.5-requisitos-não-funcionais-do-sistema}

| Nº | Descrição |
| :---: | ----- |
| **RNF01** | O sistema deve ser de fácil usabilidade. |
| **RNF02** | O sistema deve possuir documentação técnica. |
| **RNF03** | O sistema deve permitir manutenção e evolução. |
| **RNF04** | O sistema deve garantir integridade dos dados. |
| **RNF05** | O sistema deve executar a alocação em tempo aceitável. |
| **RNF06** | O sistema deve ser compatível com ambientes institucionais. |
| **RNF07** | O sistema deve permitir auditoria e rastreabilidade das alterações. |
| **RNF08** | O sistema deve garantir segregação de acesso entre perfis. |
| **RNF09** | O sistema deve registrar logs de acesso e alterações. |
| **RNF10** | O sistema deve suportar crescimento no número de Unidades e salas. |
| **RNF11** | O sistema deve possuir recursos de acessibilidade para usuários com deficiência visual. |

## 

## **2.6 Regras de Negócio do Sistema** {#2.6-regras-de-negócio-do-sistema}

| Nº | Descrição |
| :---: | ----- |
| **RN01**  | Uma disciplina só pode ser alocada em uma sala com capacidade igual ou superior ao número de vagas. |
| **RN02** | Uma sala não pode possuir mais de uma disciplina no mesmo horário. |
| **RN03** | As disciplinas devem respeitar os dias e turnos informados. |
| **RN04** | Toda disciplina deve estar associada a uma Unidade. |
| **RN05** | Disciplinas com dados incompletos não podem ser alocadas automaticamente. |
| **RN06** | Ajustes manuais devem ser registrados |
| **RN07** | O calendário acadêmico deve ser respeitado em todas as etapas do processo. |
| **RN08** | Usuários só podem visualizar salas compatíveis com seu nível hierárquico. |
| **RN09** |  Apenas o Administrador Superior pode atribuir ou alterar papéis. |
| **RN10** | A Reitoria possui acesso de leitura a todas as alocações. |
| **RN11** | O Decano só pode interagir com salas e cursos de sua responsabilidade. |
| **RN12** | Diretores e coordenadores visualizam apenas as salas associadas aos seus cursos. |
| **RN13** | Alocações não acadêmicas não podem conflitar com aulas. |
| **RN14** | Toda alocação deve possuir um responsável institucional definido. |
| **RN15** | A sala alocada deve possuir os recursos necessários para a disciplina. |
| **RN16** | Professores com alguma deficiência necessitam de salas com recursos adicionais (slideshow).  |

quem pode fazer a solicitação de sala são os diretores e os coordenadores da pós

quando alguém solicitar uma sala o responsável pode receber um email, indicando que tem uma solicitação pendente no sistema. ele pode entrar no sistema e dar ou não o aceite na solicitação.

**3\. Arquitetura do Sistema**

**3.1 Visão Gera**l

* O sistema adota uma arquitetura desacoplada com duas aplicações independentes:  
  * Backend desenvolvido em Python com o framework Django, expondo uma API REST;  
  * Frontend desenvolvido com Next.js (React/TypeScript), consumindo essa API via requisições HTTP.  
* Essa abordagem combina a maturidade e os recursos integrados do Django: autenticação, ORM, painel administrativo, validação de dados, com a flexibilidade e modernidade do ecossistema React/Next.js para a interface do usuário.


**3.2 Componentes da Arquitetura**

* **Backend (Django)**  
  * Exposição de endpoints REST;  
  * Implementação das regras de negócio e serviços de alocação;  
  * Autenticação e autorização nativas do Django;  
  * Controle de perfis: Administrador Superior, Reitoria, Decano e Diretor;  
  * Persistência via Django ORM com banco de dados relacional.  
* **Frontend (Next.js / React)**  
  * Interface web moderna, responsiva e componentizada;  
  * Roteamento e renderização gerenciados pelo Next.js App Router;  
  * Consumo da API REST do backend via HTTP;  
  * Controle de navegação por perfil de usuário.  
* **Camada de Persistência**  
  * Django ORM;  
  * Banco de dados relacional (MySQL).  
* **Segurança**  
  * Autenticação gerenciada pelo Django;  
  * Controle de acesso por perfil de usuário;  
  * Comunicação entre frontend e backend via HTTPS.

**3.3 Vantagens**

* Separação clara de responsabilidades entre frontend e backend;  
* Interface moderna e interativa sem abrir mão da solidez do Django;  
* Backend reutilizável por outras aplicações ou integrações futuras;  
* Escalabilidade independente das duas camadas;  
* Ecossistema Django maduro para funcionalidades institucionais (autenticação, admin, ORM).

**3.4 Desvantagens**

* Maior complexidade arquitetural em comparação a uma solução monolítica;  
* Necessidade de manter e configurar duas bases de código;  
* Requer conhecimento em Python/Django e TypeScript/React.

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGYAAABdCAYAAABXYhMMAAAOsElEQVR4Xu2deXQV1R3HL/suUOoBj8cet1NbauuRIkVaNpF900JVVoGI7GELCALt8SBaqh53EBQxYsG4oYBCBMIWZCkQyEYSwpqNkPVlX/n1970z83IzeS95j7wkj2R+53z+yTJv5n7m/ubOnXm/K0T9iVZMY/MPrajbeIjZzUxhmpb/lRV1FV2ZX5ibTBozTVhy6jweZo4LTQrppDM+wpJTZ/FH5qTQpXTu3JmaN29uyMlgXhCWnFoNCAFnhC6lR48edOTIEZo/f75ZzgyhybEE1UJYYrwwHmFCdaSUnj170rnQUMrMK6LU9AxauHChKieTmaXTxL4VKzwakBIuyi7yUkp4eDhFJGXT8A2n6fMT8ZSekUmLFi2iZs2aGX+XpTNbWPc5Ho9HmQihjL4ef/xxioqKovCkLPrLW8eoie8eunP5fvJnOZm2LFq8eDE1bdrULpHJFlrPseR4KLoxUUJJXeDixYtSyp/f+EVKaTI/UNJp2T7yPx5PWdk55OfnJ+XogvD/OcwcYcmpdjzGxAhdCnrJtWtxkjCW8sjaYGrsqwlR6bB0H33GcnJy82jp0qWSJk2aqHJ8hXXNueXoxVwQupTevXtTfHwChSZmSbq+doSllPUUlcbMHUv20qfH4igvv0CyfPlyNbVBzkKmmfJ5VlQRjZg+TCxDjRo1oieeeILi4uIoJMFGv1tzROJMigrkfPJLnMSQowwKIGcR01z5bCucBKT0F3pPgZTBgwdz6rpGp+Iy6aE1h2XqcpS+nNHOb69k49FrMrWtWLGCWrRooQ4I/JgWyj54Tfy6huggtIZ2J4yeItPXwIED6erVq3Q6jnuKTF0VG95VIAc9Jycnl1auXKmmNQyl/YT7aQ0DiI6i4nF7gk6MCGHO1gBHmIHCPTlPM9eFPsSdNGkSpaen089RqdRlRVC1xDRbEEjLd0ZTfkEhbdq0iVq2bGmIKWTeY1oq+1FVYODwHHNCVDxuT4CJWUuM8FIxpUJviBrgEjNIuC4HBzxB6HKQbqZPn05paen0fWgyddbluCOo+QKNhd+dp6y8QvL396dOnToZ+wcp64WWklwN7ON4oZxANUAuo4np0qWLvHHr1auXnT59+lDfvn0l/fv3l6OjAQMG0JNPPinzPy7MQ4YMkYwcOVIyYsQIuueee9QPucIMFu7JGSf0A8f9x7Rp0yg9I4N+CGM5LwdJXJEDIYu3n5dk5RfR5s2bqWPHjsZ+Qco6oV0LXQ1cV3Di3GDkCA9thrZwBNoKbVYV/fr1k20MB9iuUMUsWLCAsrKyypGdnV2BnJyccuTm5lYgKCiIHnzwQVXONeG+nGeFIuf555+njEwb7QhPllSV2losDKSlP0SRjXsJgJT27dsb+1MkNCntlc+sKiBlIpPKyIlSzMmlpKRUaBMVc/tVBlI3ti1UMUuWLKHsgmJa+VMMTfwi1CWe23KO/vH5WQ1/jaWcx29kF9DBgwfp/vvvV+UkCC2tuRpoiLFCPzsbN25MkydPJpstS7JLyjkgbybNUpqzlJd2aFIgBNxxxx2qlA+ZdspnVRU4oSAFT0dlT8EsNk7eZD7Wl3dF07Qvw8rhw8wMCKdZX0U4ZPbXETT/m0gJ5vdKSm/S1KlTK4rBvFJabiE9svZohQN1B1xkJ2wJlds6fPgw3XvvvaqcZKENCFwNNAgGBPIshZyJEydKbNwoP0be0OQoPQfpa9mOaD7JiuRFHkIUKcXMB0xr5TNciUmMTei9F899cIZDyphPQ6ipg3bACePopHH0N+P8z1GxMzE4Azwhxmik8dyj0nKK5AOs++67T5WDFybc6TmIEUKTI286wYQJE3jElkGB51Po7lWanJaLfqYVu2IoO7+QNmzYQG3btlU/F1LeFe7dTOLEmCy0WQI5GEHKz8vLo+tZBfT0pjPUxM3BSLm20nl281kqKimtWTFl7KFJ/w2llJxCKceU1lKY4fqBu3rdwd/LtAYgZ/z48ZzjUykwKoV+u/owrfoxhmy5+bR+/XpVClIXeEe4Pv2CNArwxg1mB2T6Qk+BlERbPv39E01KxeN2HUPMWO51hbUnJlB28albwyhVl2PqOUhro3RcnYaHHAwI5KAAqQ1yricn08WUXMrMzqN169apqQsjr7d1XO0peAyNFzmATF/oKZCCgU1iZj6N2RRSbSnALTGPelAMaMo532dbmLNrTpIOriPuyAEYTEg548aNk1M377//viqlgHlDaNcTV68pkIL3BPC+AJBSfH19y6R84hkpwGUxGXlF2oMnBxupDhgQTGc56blazzHJAYlCG4G5IsdIf5ATx8gLcrdu3VQp+cxapk3Zv1UZmCvDE0458gKQMm/ePE2Kkb7mVz2r7SqGGPTAwmInYtBVa0oMQM+Zvi1cvjRx6NAhc1oz5DwjXJODgJxhzFVRfjt5zOvCfSl4simlGE890VMw+kqy8YX+49MVjqm6GGKe2hhCBZYYh+G9YubOnVujYgBS2owvw8mWX0QHDhyQckyCIAd3/K4+9oXEoUKb9jGkrGHaKn9TVWCkNlcoUiAEZGZmUjIPi0dv9GwKM3BZTDqL6cYX/0bz9lTEd498amjHvKMLNNAzgHknDJoxs/mOGHNXkANMQ2kMBtDYrgbkDBHaCxuvCvd6CgJDYvuFXp6gGRkSSHnqY+fDYow6jeMth/Jz2S7K/0gZehuiTQHEVyqmoLiEvj173f449tNj8XYwbfDFyQQ7W/+XQNtOJ9oJCEmSfKWDu29MjZgPBjuEu/PZX0XwjWCRxOg9+k7hIdkqo9VcDKS1B4Troy8jIHUzI0d3s2bNkkJw8whGb0T6QiNWPI42i/fS6sBY+ib0ejm+Pnfd3gYgIKSsjcDWU4n2NtyicyAm1fmUDO4HQkNDyxEREUGRkZF2oqOj6cKFC3YuXbpEly9fLkdaWhohdobdoFZ8J24+IFXOPJYDICcgIEB9zeif9qar2UDK/Iyh1q1b08mTJ+kGCxnFQkBTKcVxCmu/ZB8FxaTJEVtsbGy5drlVxowZU1EMGgU7p4K753bt2tnB7GyHDh3sYAodzzZUMOyuSowhBzPA4J2DV+QwWn94VSdi2rRpQ2fOnKHtfNZjv4EzKaoYDGTuuuuucu1yqygvipSJ8RQvvviiS2JUXt4VQ8HBwdSqVStso07FfHuuTIx5Px2J2b9/v/xfbMODSDFbmC+qwVYmXugbtcTIl0l2MTurwbfCA4E5KOxIgxSDVGYS86bQ7ouw7epQ7WjQYnBtND1ewPycqzfJNRrlxODlCUuMF4rx8fGxxFhiqh0NRwxeNXJXzLKd0V4hBjeYlhgFvx+ivELMiRMnLDGWmJoPS4wlxuNRbTHHjx+3xNRAVBDzvTKJad5PR2LwP5jgxTZ0LDEeiApidoYnU+vFP0vM+2mJscR4JCwxlhiPhyWmMiwxNRMeEXP06FH5OFtYYjwWDVoM5tcsMZ6Paos5deqU+hVCS4yHouGIwUtrlhgvFDNlyhRLjCWm2mEXg8/GhKQlxgvF4F7KEqOw2BJTI1FtMfO3n79txeAFDrx3jG3o1B8xvrexmJCQELU+jSXGQ2GJqQxLTM2EJcYS4/GwxFSGN4nZHXGjfovZwWJQDcl8QI5wIMbdL8feaqABNwtFzJ7IFPnFV2Dez3ohBgVG2y3Z6/Abv2Yg5tixY3K+SmhiPmK61wI9mB3CTTH4bmanl/ZT8MX020fM6NGj5Td584pKaNXuC9TGb6/8brv54ByJMZWyQj2Y2qBEuCEGUtry7175KVYeI3q6t975o7LEdqHvGKqAoxo4Sn3kF5fSq3svcs/ZV+EAHYnRe0ydgPcN8LprZWJwgrXlE231bpZSWEJXrlyhYcOGydppQuvp4HXheg22Gg3sxEihlRsBUg7q6EMOqgq9deCyXKHCWc+BGHzP3cfHRxYlRTp0BH6Pb6xVBooozJ492ykoNIEqfWZQehJLnzgTY0h5dU8s5RdpUoYPH65KQWUO0LOsaeo+0HWf0pHfYIacZcuWyYKeKCu4PvgqdeS87EjOvO8iqZj/prCoiCl2TnExFRWXVE5JidxWpZQ658dwjMr2SuxSOH0hJb8eGCurh0AKyhgrUiKZv+l4XUAOGC20cr5SDtZugRw0CNZ0wcI7ZjEP/zuYXggId4gPM3lbGE2qiq1hNH5LKI3bcq5KnvU/S8985pi+756QxYiAsX/oPWs5JRdwT0HBOkhBiROhSYlg/ircKyNZq2GJ8VIxRkAO6lxKOSgcjfyN601J6U0KOJ1Idy4rn9KM8lC1hl751RnqSdOa78Xe3H9JVkfCGjamFBYutAWIvFqIGpCDkrxxjKyRgqreGEaXcB5Hnf4uehl4c0N4E5DyFksp5OtKYmKi+WIPKbjQ3zZSjMAOo+6YlGNUYs3Pz5c9ZzePfu5eGSTxNjnGxf9tHk1iVJmcnExDhw5VpSB9PaYe7O0WkDNY6BVfUVQUxT8LCgqolOUExaRKfvOvgzLFmBuoLsDo672DVySQkpqWRoMGDTKPwLDSYL2IAUIbRstK43PmzJGFpUtv3pQEX0qnB1Zry1yZG6q2wImBVZk+PHRVDu8BFlTAih9Cuwk1pPxJPbD6EP2FltZuGtX0jFUgbrKc41czqOtrjpdPrA3a8w3wh4c1KUlJSRIsvyLKpOCagmXq62X0E/poDWkNcoDNZpNyTsXZ6NH/aAuOmkdKNcmvXtpH63QpCQkJcpoFYD+FJiWM+YNyHPUy+gi9JC/kgJkzZ8palJBzLiGLBnxwkh545VCt8Ps1R+ij4GtSSnx8vH04rFxTsOB213JHUI+jr9CWyZJnJUZsM2bMkOuRQQ7KDCfaCmoFFCXFzS+WdMSKUcqNI8DS9PU2fTkLyEE1PLkQKeSg1hmGphi11SYosjpq1ChVyimdBicFYYnx4sD1BmClWDlDgDWVx44dW6t0795dlXJSaEIarBSEMfHXm4kW+jWnjoAUrD9Z70df7gTkYIY2mDlfRwSKBjT6cjdQAh6r7dUFrYQVVlQV/wfPJqQagyWveQAAAABJRU5ErkJggg==>