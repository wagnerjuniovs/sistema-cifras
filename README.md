# Sistema de Cifras

Sistema web em React, Vite e TypeScript para organizar, editar, visualizar, pesquisar, apresentar e imprimir cifras musicais. Os dados ficam no Firebase Authentication e Cloud Firestore, usando a estrutura `users/{uid}/folders` e `users/{uid}/songs`.

## Como executar localmente

```bash
npm install
npm run dev
```

O Vite mostrará o endereço local, normalmente `http://localhost:5173/`.

## Testes e build

```bash
npm run test
npm run build
```

O build de produção será criado em `dist/`.

## Firebase

O projeto já usa a configuração do Firebase em `src/lib/firebase.ts` para o projeto `cifras-a7ad7`.

No painel do Firebase:

1. Abra Authentication.
2. Vá em Sign-in method.
3. Ative Email/Password.
4. Abra Firestore Database.
5. Crie o banco em modo de produção.
6. Em Rules, publique o conteúdo de `firestore.rules`.

Para publicar as regras pelo Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase use cifras-a7ad7
firebase deploy --only firestore:rules
```

As regras impedem leitura e escrita sem autenticação e garantem que cada usuário acesse somente `users/{uid}` correspondente ao próprio login.

## GitHub Pages

O roteamento usa hash (`#/...`), então atualizar a página no GitHub Pages não gera erro 404.

O workflow `.github/workflows/deploy.yml` publica automaticamente quando houver push na branch `main`. Ele define `VITE_BASE_PATH` como `/${{ github.event.repository.name }}/`, que é o caminho correto para Pages de projeto.

No GitHub:

1. Abra Settings.
2. Vá em Pages.
3. Em Build and deployment, selecione GitHub Actions.
4. Faça push para a branch `main`.

No Firebase Authentication, adicione o domínio do GitHub Pages em Authorized domains, se o login indicar domínio não autorizado. O domínio costuma ser:

```text
seu-usuario.github.io
```

Se este repositório for publicado como site de usuário ou organização (`seu-usuario.github.io`), altere `VITE_BASE_PATH` no workflow para `/`.

## Funcionalidades

- Login, criação de conta, recuperação de senha e logout.
- Pastas e subpastas ilimitadas.
- Criação, edição, movimentação e exclusão de pastas e cifras.
- Exclusão de pasta com remoção de descendentes.
- Busca global por música, cantor, pasta, caminho e conteúdo.
- Editor monoespaçado com destaque de acordes em tempo real.
- Preservação de espaços, alinhamento e quebras de linha.
- Visualização com acordes destacados.
- Rolagem automática com velocidade ajustável.
- Modo de apresentação em tela cheia com colunas adaptativas no computador.
- Impressão e salvamento em PDF pelo `window.print()`.
- Layout responsivo em computador e celular.
