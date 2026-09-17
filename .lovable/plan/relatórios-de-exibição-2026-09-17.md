# Relatórios de exibição

## Objetivo
Criar uma nova aba **Relatórios** no painel administrativo para consultar quando cada anúncio foi exibido e gerar um PDF com o resultado filtrado.

## O que será criado
- Item **Relatórios** no menu lateral, com uma página própria.
- Filtros por:
  - período diário, semanal ou mensal;
  - anúncio específico ou todos;
  - tela específica ou todas.
- Resumo do período com total de exibições, anúncios e telas encontrados.
- Tabela detalhada com anúncio, tela, local, data e horário da exibição em horas e minutos.
- Botão **Exportar PDF**, levando os filtros aplicados, o resumo e todas as linhas do relatório.
- Estados claros para carregamento, ausência de resultados e falha na consulta.

## Regras
- Os períodos usarão o horário de São Paulo.
- Diário: dia atual; semanal: últimos 7 dias; mensal: últimos 30 dias.
- Os dados virão do histórico de exibições já registrado pelos players.
- O PDF terá nome com o período e a data de geração.

## Detalhes técnicos
- Consultar `play_logs` junto de `media` e `screens`, respeitando os filtros selecionados.
- Paginar internamente a leitura para que o PDF não fique limitado às primeiras exibições.
- Gerar o PDF no navegador, sem expor dados públicos e sem alterar o funcionamento do player.
- Adicionar metadados próprios à nova página e validar a navegação em desktop e celular.
