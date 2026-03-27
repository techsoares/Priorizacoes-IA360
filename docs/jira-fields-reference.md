# Referência de Campos do Jira

Este documento registra os campos do Jira usados pelo dashboard e o significado de cada um, com base no payload compartilhado da issue `EF-121`.

## Projeto de origem

- Projeto Jira analisado: `EF`
- Chave de exemplo: `EF-121`
- Nome do projeto: `Eficiência Operacional com IA e Automações`

## Mapeamento de campos

| Campo no dashboard | Origem no Jira | Tipo esperado | Exemplo no payload |
| --- | --- | --- | --- |
| Chave do Jira | `key` | texto | `EF-121` |
| Centro de custo | `customfield_10201` | lista de opções | `Despesas Gerais Comunicação e Marketing` |
| Responsável | `fields.assignee.displayName` | texto | `Tiago Moreira Eduardo` |
| Responsável email | `fields.assignee.emailAddress` | texto | `tiago.moreira@pgmais.com.br` |
| Categoria | `customfield_10951` | opção | `Automação` |
| Tipo de item | `issuetype.name` | texto | `Tarefa` |
| Tipo de ganho | `customfield_10950` | opção | `Eficiência liberada` |
| Ganho | `customfield_10949` | opção | `Combinado` |
| Área responsável | `customfield_10934` | opção | `Governança` |
| Ferramenta | `customfield_10935` | opção | `N8N` |
| Reduz quanto tempo/dia | `customfield_10936` | número | `1` |
| Qtde profissionais afetados | `customfield_10937` | número | `1` |
| Dias de execução da atividade no mês | `customfield_10938` | número | `5` |
| Tempo de desenvolvimento estimado | `timeoriginalestimate` | segundos | `18000` |
| Descrição | `description` | texto longo | texto livre |
| Data de início | `customfield_10015` | data | `2026-04-01` |
| Data limite | `duedate` | data | `2026-04-01` |
| Data da última atualização de status | `statuscategorychangedate` | data/hora | `2026-03-16T16:45:45.113-0300` |
| Prioridade | `priority.name` | texto | `Média` |
| Status | `status.name` | texto | `Pausado` |
| Tempo já gasto | `aggregateprogress.progress` | segundos | `22500` |
| Tempo total agregado | `aggregateprogress.total` | segundos | `22500` |
| Projeto | `project.key` / `project.name` | texto | `EF` / `Eficiência Operacional com IA e Automações` |
| Criado em | `created` | data/hora | `2026-01-22T10:45:07.509-0300` |
| Atualizado em | `updated` | data/hora | `2026-03-16T16:57:28.209-0300` |
| Data de resolução | `resolutiondate` | data/hora ou nulo | `null` neste exemplo |

## Observações importantes

- `Área responsável` no payload compartilhado retorna valores como `Governança`.
- Pelo contexto de negócio informado, este campo também pode retornar `Produto`.
- `Responsável` deve ser lido de `fields.assignee.displayName`.
- O identificador técnico do usuário responsável vem em `fields.assignee.self`.
- O tempo estimado de desenvolvimento (`timeoriginalestimate`) vem em segundos e precisará ser convertido para horas ou dias na interface, conforme a necessidade da tela.
- `customfield_10201` vem como lista; o dashboard deve considerar pelo menos o primeiro valor quando precisar de uma única dimensão de centro de custo.
- `aggregateprogress` também vem em segundos.

## Campos já usados ou previstos no dashboard

- `summary`
- `status`
- `assignee`
- `customfield_10934`
- `customfield_10015`
- `duedate`
- `priority`
- `timeoriginalestimate`
- `aggregateprogress`

## Próximos ajustes esperados

- Ampliar o sync do Jira para buscar todos os campos acima.
- Persistir os novos campos no banco para filtros, tabela, Gantt e visão de entregas.
- Converter tempos em segundos para unidades legíveis no frontend.
