# Carrossel na seção "Onde nossas telas estão"

## O que muda
- A seção passa a mostrar apenas 3 fotos por vez (lado a lado no computador; no celular, 1 por vez para não ficarem pequenas demais).
- A cada ~4 segundos as fotos avançam uma posição, em ciclo pelas 6 fotos, com transição suave de fade.
- Pausa ao passar o mouse; pontinhos abaixo para pular para uma foto.

## Detalhes técnicos
- Só `src/routes/index.tsx`: estado `start` com `setInterval` (limpo no unmount), renderiza `places[(start+i) % places.length]` para i=0..2, com fade via opacidade/transition.
- Mantém aspect-[9/19], object-cover object-bottom, bordas e espaçamento atuais. Nada mais é alterado.
