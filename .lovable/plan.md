# Conteúdos automáticos de clima e Ibovespa

## Objetivo
Adicionar à tela **Anúncios** duas novas opções, além de imagem e vídeo:
- **Clima**: temperatura atual e condições de São Paulo, com atualização automática.
- **Ibovespa**: cotação atual, variação percentual e horário da última atualização.

Esses conteúdos poderão ser ativados, pausados, removidos e incluídos nas playlists como qualquer anúncio.

## Experiência no painel
- Separar a criação em **Arquivo**, **Clima** e **Ibovespa**.
- Exibir uma prévia visual de cada conteúdo automático na biblioteca de anúncios.
- Permitir escolher a duração na TV; para clima, permitir também informar a cidade.
- Identificar claramente cada cartão como “Clima” ou “Ibovespa”.

## Exibição nas TVs
- Renderizar clima e mercado em tela cheia, mantendo o visual preto e verde da TelaHUB.
- Buscar informações gratuitas em segundo plano e atualizar periodicamente.
- Manter o último dado válido durante falhas temporárias de internet, sem deixar a TV em branco.
- Preservar ordem, duração, agendamento, transições e histórico já existentes.

## Detalhes técnicos
- Ampliar os registros de mídia para guardar o tipo de conteúdo e sua configuração.
- Usar Open-Meteo para clima, sem chave ou conta.
- Usar uma fonte pública gratuita para o Ibovespa, com indicação de possível atraso.
- Fazer as consultas externas pelo servidor e aplicar cache para reduzir limites e aumentar estabilidade.
- Atualizar os tipos locais, o painel, as prévias e o player.
- Validar a criação no painel e a renderização no player em desktop e TV.
