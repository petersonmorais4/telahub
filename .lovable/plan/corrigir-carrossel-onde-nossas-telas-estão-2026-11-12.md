# Corrigir carrossel "Onde nossas telas estão"

## Problemas
- Os pontinhos não funcionam bem: clicar não reinicia o tempo (a foto muda logo em seguida), não há transição suave no clique e o pontinho ativo nem sempre corresponde ao que aparece.
- As fotos seguem sempre a mesma ordem fixa.

## O que muda
- Ordem aleatória: a cada visita as 6 fotos são embaralhadas (após carregar a página, para não piscar), e cada nova rodada sai em ordem diferente sem repetir foto antes de mostrar todas.
- Pontinhos: clicar mostra aquela foto em primeiro lugar com o mesmo fade, reinicia o contador de 4s e destaca corretamente o pontinho ativo.
- Mantém 3 fotos no desktop, 1 no celular, pausa ao passar o mouse.

## Detalhes técnicos
- `PlacesCarousel` em `src/routes/index.tsx`: estado `order` (índices embaralhados via Fisher-Yates em `useEffect`), reembaralha ao completar o ciclo; função `goTo(i)` com fade e `tick` key no intervalo para reiniciar timer.
