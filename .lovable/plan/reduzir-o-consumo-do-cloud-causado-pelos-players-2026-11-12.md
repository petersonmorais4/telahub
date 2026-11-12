# Reduzir o consumo do Cloud causado pelos players

Escopo: só a conexão ao vivo e o refresh em `src/routes/player.$code.tsx`. Nada muda no visual, na exibição, nos vídeos, na rotação, no heartbeat nem no play_logs.

## A) Por que os canais caem (já confirmado nos logs do Realtime)

As últimas 3h dos logs do Realtime mostram um ciclo que se repete a cada ~50s:
- `ChannelRateLimitReached: Too many channels` e `SocketJoinRateLimitReached: Too many joins on this socket`
- logo depois, `IncreaseSubscriptionConnectionPool: Too many database timeouts`

Leitura do código (linhas 140-176):
- Cada nova tentativa cria um canal com nome novo (`player-<code>-<Date.now()>`) no mesmo socket, e cada canal tem 6 assinaturas de `postgres_changes`. O servidor conta cada join e cada assinatura, então o limite por socket estoura.
- Quando o limite estoura (ou quando o banco dá timeout ao registrar as 6 assinaturas), o canal recebe CHANNEL_ERROR/TIMED_OUT, é removido e recriado 5s depois. Isso gera mais joins, mais limite estourado e mais timeouts. O ciclo se sustenta sozinho.
- A cada SUBSCRIBED, `refresh()` refaz as 6 consultas. Além disso, o listener de `screens` sem filtro dispara em todo `touch_screen` (8 TVs, 1 por minuto) em todos os players, ou seja, cerca de 64 refreshes por minuto só com isso.

Conclusão: a causa raiz é o loop de reconexão com reassinaturas de 6 tabelas, não a rede das TVs. Se ainda houver queda depois das correções, o passo 1 da implementação registra o motivo (status + erro) para checarmos nos logs.

## Mudanças (todas numa única mensagem, nesta ordem)

1. **Diagnóstico leve**: registrar no console o status e o erro do canal (`subscribe((status, err) => ...)`), sem mudar o comportamento.
2. **D – Canal enxuto** (maior efeito):
   - `screens` com filtro `id=eq.<id da tela>`. O filtro do Realtime aceita qualquer coluna, mas `id` é estável e só fica disponível depois do primeiro carregamento. Se for melhor não esperar o id, uso `code=eq.<código>`, que já está disponível.
   - `screens` só aciona refresh se mudar algo além de `last_seen`/`status` (compara `payload.old` com `payload.new`), para o heartbeat não disparar mais nada.
   - Manter ao vivo só `playlist_items` (filtrado por `playlist_id=eq.<playlist da tela>`) e `screens` filtrado. Tirar `media`, `playlists`, `schedules` e `app_settings` do canal: mudanças nessas tabelas são raras e o polling de 120s já cobre. O canal passa de 6 para 2 assinaturas.
   - Recriar o canal só quando o id da tela ou da playlist mudar.
3. **B – Backoff exponencial**: esperas de 5s, 15s, 60s, 120s e depois 5 min no máximo, com variação aleatória de ±20% para as 8 TVs não reconectarem juntas. O contador zera quando a conexão fica estável por 2 minutos depois do SUBSCRIBED. Um único timer de retry; os eventos CLOSED gerados pelo próprio `removeChannel` são ignorados, para não contar duas vezes.
4. **C – Refresh só depois de queda real**: uma flag `hadDrop` liga em erro/timeout/fechamento inesperado; no SUBSCRIBED, só chama `refresh()` se ela estiver ligada, e depois desliga. A primeira conexão não faz refresh (a consulta inicial já carregou tudo).
5. **Proteção extra no refresh**: debounce de 2s em `refresh()`, para uma rajada de eventos (ex.: reordenar 10 itens) virar uma única recarga.
6. Nome de canal fixo por tela (`player-<code>`), com `removeChannel` antes de recriar, para nunca existirem dois canais da mesma TV no mesmo socket.

## E) Efeito estimado (estimativas, não medições)

| Item | O que reduz | Estimativa |
|---|---|---|
| D filtro + ignorar heartbeat | consultas `media`/`screens` | Corta ~64 refreshes/min (~380 consultas/min) que vêm do heartbeat. Explica a maior parte dos ~330/min de `media`. |
| D 6 → 2 assinaturas | custo por join, leitura do WAL, set_config RLS | ~65% menos trabalho por join e por mudança. Tira o socket do limite de joins. |
| B backoff | joins de canal | De ~100/min para próximo de 0 com conexão estável. No pior caso, cerca de 1 tentativa a cada 5 min por TV. |
| C refresh só após queda | consultas a cada reconexão | Remove as 6 consultas extras por join. |
| Debounce | rajadas | Pequeno, mas evita picos ao editar playlists. |

Esperado no total: consultas de `media`/`screens` caem de ~330/min para algo perto do polling (~4-10/min), e as linhas em `realtime.subscription` ficam em ~16 (8 TVs × 2). Para confirmar, depois de publicar e esperar umas 2h, reler `pg_stat_statements` e os logs do Realtime e comparar com a sua medição de 3h45.

Atenção: as TVs só recebem a mudança depois da publicação (o player recarrega sozinho ao detectar versão nova). Até lá, o consumo antigo continua.

## Detalhes técnicos

- Arquivo único: `src/routes/player.$code.tsx`, só o efeito do Realtime (linhas 140-176) e o `refresh`.
- O polling de 120s, o heartbeat de 60s, a recarga de 6h e o listener de `online` continuam como estão.
- Sem migration. As políticas RLS de `screens` e `playlist_items` já permitem a leitura anônima usada pelo player.
- Trade-off: uma mudança em mídia, agendamento ou configuração passa a aparecer nas TVs em até 2 min, e não mais na hora. Trocar itens da playlist e mudar a playlist da tela continuam ao vivo.
