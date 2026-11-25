# Fotos maiores, de cima a baixo

## O que muda
- Em **Quero anunciar** e **Seja parceiro**, as fotos da Nutrifit Lounge e da Fazendinha do Léo deixam de ser um quadro pequeno. Passam a ocupar toda a faixa direita da página, do topo (logo abaixo do cabeçalho) até o fim da tela, sem bordas arredondadas.
- Ao rolar a página, as fotos ficam paradas no lugar e continuam preenchendo a altura da tela.
- A troca entre as duas fotos a cada 4 segundos, o nome/endereço e os pontinhos continuam iguais.
- Em telas médias e no celular, as fotos aparecem abaixo do formulário, numa faixa alta de largura total, para não apertar os campos.
- Nada muda nos campos nem no envio dos formulários.

## Detalhes técnicos
- `FormSidePhotos`: nova variante "full" com `h-[calc(100vh-81px)]` (altura menos o cabeçalho), `sticky top-0`, sem `aspect-[3/4]`, sem borda/arredondamento; mobile com `h-[70vh]`.
- `anunciar.tsx` e `parceiro.tsx`: a seção deixa de usar `max-w-6xl` centralizado para a coluna das fotos; layout em `lg:grid-cols-[1fr_minmax(0,40%)]`, com o conteúdo (textos + formulário) num container próprio à esquerda e as fotos encostadas na borda direita da janela.
- Em `/parceiro`, benefícios e formulário ficam empilhados/lado a lado na coluna esquerda, e as fotos na direita.
- Verificação com Playwright em 1440px e 390px.
