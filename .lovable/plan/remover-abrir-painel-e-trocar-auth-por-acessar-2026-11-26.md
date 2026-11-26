# Remover "Abrir painel" e trocar /auth por /acessar

1. Página inicial: remover o botão "Abrir painel" do rodapé (`src/routes/index.tsx`).
2. Renomear a página de login de `/auth` para `/acessar` (`src/routes/auth.tsx` → `src/routes/acessar.tsx`).
3. Atualizar todos os redirecionamentos de login para `/acessar`: AdminShell (sair), verificação MFA, proteção do painel e tela de consentimento OAuth.
4. Manter `/auth` como redirecionamento para `/acessar` (preservando `next`), para links antigos e e-mails já enviados continuarem funcionando.
