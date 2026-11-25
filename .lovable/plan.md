# Fotos alternando ao lado dos formulários

## O que muda
- **Quero anunciar** (`/anunciar`): a página hoje tem só o formulário centralizado. Passa a ter duas colunas no computador: formulário à esquerda e, à direita, as fotos alternando.
- **Seja parceiro** (`/parceiro`): hoje tem textos/benefícios à esquerda e formulário à direita. As fotos entram à direita do formulário (formulário fica no meio, fotos no canto direito); os benefícios continuam acima ou à esquerda.
- Fotos usadas (já existentes no site): Nutrifit Lounge, Fazendinha do Léo (José Valter) e Fazendinha do Léo (Centro), com nome e endereço no rodapé da foto.
- Troca suave a cada ~4 segundos, igual ao carrossel da página inicial, com pontinhos para trocar manualmente.
- No celular, as fotos aparecem abaixo do formulário, para não atrapalhar o preenchimento.
- Nada muda nos campos, textos ou envio dos formulários.

## Detalhes técnicos
- Novo componente `FormSidePhotos` com crossfade (opacity) entre as 3 imagens importadas de `@/assets/locais/*.asset.json`, pausa em hover/focus e respeita `prefers-reduced-motion`.
- `anunciar.tsx`: `max-w-lg` → `max-w-6xl` com `lg:grid-cols-[minmax(0,32rem)_1fr]`.
- `parceiro.tsx`: grid passa a `lg:grid-cols-[1fr_26rem_20rem]` em `xl`, empilhando abaixo em telas menores.
- Verificação com Playwright em desktop e mobile.
