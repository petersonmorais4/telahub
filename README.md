# TelaHUB

Prompt para o Lovable — Painel de Mídia Indoor

Copie e cole o texto abaixo diretamente no Lovable.

Crie um aplicativo web de mídia indoor (digital signage) para exibição de anúncios em telas/TVs instaladas em locais físicos (recepções, elevadores, áreas comuns de condomínios, lojas etc). O sistema deve ter dois painéis completamente separados:

1. Painel Administrativo (com login)

Acesso restrito, protegido por autenticação (e-mail/senha). Funcionalidades:

Login/logout de administradores. Suporte a múltiplos usuários com papéis (admin geral / operador).

Gestão de Telas (Displays): cadastrar cada tela/local físico onde os anúncios serão exibidos (nome, localização, código único, status online/offline, última vez que sincronizou).

Gestão de Anúncios (Mídias):

Upload de imagens (jpg/png) e vídeos (mp4).

Definir título, duração de exibição (em segundos, para imagens), data de início e fim de veiculação.

Ativar/desativar anúncio sem precisar excluir.

Pré-visualização do anúncio antes de publicar.

Playlists/Listas de Reprodução:

Criar listas ordenáveis (drag-and-drop) de anúncios.

Vincular uma playlist a uma ou mais telas específicas.

Definir se a playlist roda em loop contínuo.

Agendamento:

Programar dias da semana e horários em que cada playlist/anúncio deve ser exibido (ex.: campanha só de manhã, ou só às segundas).

Dashboard:

Visão geral de quantas telas estão ativas, quantos anúncios estão no ar, e um histórico simples de exibições.

Configurações gerais: logo da empresa, cores do player (tema padrão de transição), tempo padrão de exibição de imagem.

2. Painel de Exibição (Player Público — sem login)

Esta é a tela que roda nas TVs/monitores, acessada por uma URL pública única por tela (ex.: /player/[codigo-da-tela]), sem necessidade de autenticação.

Requisitos do player:

Modo tela cheia (fullscreen), otimizado para rodar em navegador de Smart TV, Chromecast ou mini-PC conectado ao monitor.

Exibe em carrossel automático os anúncios da playlist vinculada àquela tela, respeitando a ordem, duração e agendamento definidos no admin.

Suporte a imagens e vídeos no mesmo carrossel (vídeo toca por completo antes de passar para o próximo; imagem respeita o tempo configurado).

Transições suaves entre os itens (fade ou slide).

Atualização automática em segundo plano: se um admin publicar, remover ou reordenar um anúncio, o player deve refletir a mudança em poucos minutos, sem precisar recarregar a página manualmente (polling ou realtime).

Se não houver nenhum anúncio ativo/agendado para o momento, exibir uma tela padrão (logo da empresa ou mensagem neutra) — nunca uma tela em branco ou erro.

Deve continuar funcionando mesmo após ficar horas ou dias aberto sem interação humana (sem memory leak, sem travar).

Reconexão automática caso perca conexão com a internet temporariamente.

Modelo de dados sugerido

screens (telas): id, nome, código único, localização, playlist_id, status, last_seen

media (anúncios): id, título, tipo (imagem/vídeo), arquivo/url, duração, ativo, data_inicio, data_fim

playlists: id, nome, loop

playlist_items: playlist_id, media_id, ordem

schedules (agendamentos): playlist_id ou media_id, dias_da_semana, hora_inicio, hora_fim

admins: id, nome, e-mail, papel

Requisitos técnicos

Backend com banco de dados e armazenamento de arquivos (para upload de imagens/vídeos).

Autenticação apenas no painel admin; o player deve ser 100% público, sem tela de login.

Interface admin responsiva (funciona em desktop e tablet).

Interface do player pensada para telas grandes (TV), sem elementos de navegação, menus ou rodapés — só o conteúdo do anúncio em tela cheia.

Design

Painel admin: visual limpo, profissional, estilo dashboard (sidebar com Telas, Anúncios, Playlists, Agendamentos, Configurações).

Painel de exibição: minimalista, foco total na mídia, sem distrações visuais, fundo preto entre transições.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://telahub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c72f69d8-46b1-4504-9846-85ae12a9a290).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
