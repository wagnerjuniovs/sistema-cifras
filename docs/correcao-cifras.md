# Correção da colagem e da apresentação

Validação local realizada em 7 de setembro de 2026.

## Causas encontradas

O CodeMirror recebia texto simples sem interceptar o HTML do clipboard. O reparador local anterior agia depois da corrupção, tentava reconstruir posições e deduplicava blocos globalmente. Não havia no projeto um importador ou extensão, nem evidência suficiente para atribuir a origem externa dos fragmentos a uma regex específica.

A apresentação calculava larguras com uma estimativa de caracteres, permitia candidatos que não cabiam, aplicava o ajuste de fonte depois da escolha e usava altura da janela sem descontar a barra fixa. O CSS preservava linhas sem quebra nas colunas estreitas. O modo móvel tinha largura max-content. A detecção de F11 também confundia redimensionamentos comuns com tela cheia.

## Implementação

- Extração de uma única cifra por pre[data-chord-content="true"], com fallback para fragmentos reconhecidos. Parsing em documento isolado e template inerte; nada do HTML copiado é montado no DOM ativo. Scripts, recursos e elementos auxiliares são descartados. O texto visível do acorde tem prioridade sobre os atributos.
- Reparo conservador e idempotente: preserva recuos, frases em negrito e repetições legítimas; só propõe deduplicação com evidência local. Posições ambíguas não são inventadas. A comparação Original/Corrigido requer aplicação explícita.
- Colagem automática, aviso, Corrigir colagem e Desfazer integrado ao histórico do CodeMirror. Nenhuma migração de cifras salvas.
- Grid adaptativo por blocos musicais. Medição real de largura e altura usando a fonte carregada; ResizeObserver, fullscreenchange e requestAnimationFrame. Fonte mínima de 14 px; quebra compartilhada entre acordes e letra; tablaturas agrupadas. Barra em linha própria do grid e rolagem vertical na área da cifra.
- Rolagem acumula frações de pixel. Solicitação de fullscreen e atalhos não se reinstalam quando velocidade ou estado de rolagem mudam. F11 exige intenção pelo teclado para não ativar em um resize comum.

## Arquivos

- Editor: src/components/ChordEditor.tsx, src/components/SongEditorView.tsx.
- Extração e gramática: src/utils/cifraClubCleaner.ts, src/utils/chords.ts.
- Apresentação: src/components/PresentationMode.tsx, src/components/SongView.tsx, src/utils/layout.ts, src/hooks/useAutoScroll.ts, src/styles.css.
- Testes: src/utils/cifraClubCleaner.test.ts, src/utils/chords.test.ts, src/utils/layout.test.ts, tests/cifra.spec.ts, tests/smoke.spec.ts, tests/harness.html, tests/harness.tsx, tests/fixtures/cifra-club.html, scripts/browser-save-smoke.mjs.
- Dependências e publicação: package.json, package-lock.json, .github/workflows/deploy.yml.

## Evidências

- 39 testes unitários aprovados.
- 21 testes Playwright aprovados em Chromium, incluindo clipboard nativo com Ctrl+V, HTML e texto simples, revisão e desfazer.
- Geometria verificada em 1366×768, 1920×1080, 2560×1440, 390×844 e 844×390: sem overflow horizontal, colunas/blocos sem interseção, rodapé fora da área rolável, ordem e pares musicais preservados. Verificados fonte, resize, colunas, rolagem e saída.
- Capturas geradas em test-results e inspecionadas visualmente. O workflow também guarda capturas e rastros como artefato browser-tests.
- Fluxo real no navegador com conta temporária: colar, salvar, recarregar, editar, imprimir/PDF e entrar/sair de tela cheia. Dados e conta removidos ao terminar.
- Teste existente firebase:smoke aprovado, com limpeza verificada.
- TypeScript e build de produção aprovados. Não existe script de lint. A build mantém o aviso de bundle principal maior que 500 kB; não é erro de compilação.

Firebase, autenticação, regras, serviços e estrutura dos documentos não foram modificados. Os testes usam músicas sintéticas; não dependem de letras de terceiros nem da disponibilidade do Cifra Club.

O script node scripts/browser-save-smoke.mjs valida persistência com conta temporária. SMOKE_URL permite repetir o mesmo fluxo na URL publicada. A suíte comum de navegador usa os componentes reais num harness servido apenas pelo Vite de desenvolvimento, não incluído na build publicada.

## Validação adicional: iPhone 11 emulado com WebKit

Foram adicionados dois projetos Playwright com toque habilitado, escala 2 e viewport/screen de 414×896 e 896×414. O WebKit utilizado localmente é a versão 26.5 distribuída pelo Playwright; isso não equivale ao Safari de um iPhone físico.

Os 14 testes passaram nas duas orientações: login local e publicado, evento de colagem HTML/fragmento/texto, correção antiga com revisão e desfazer por toque, geometria de colunas e blocos, fonte, velocidade, rolagem, rotação, saída e apresentação sem requestFullscreen. Capturas de login, revisão e apresentação foram geradas; as apresentações foram inspecionadas visualmente.

O fluxo de salvar, recarregar, editar, verificar estilos de impressão e entrar/sair da apresentação também foi executado no site público com WebKit emulado nas duas orientações. As contas temporárias e seus documentos foram removidos. O script aceita SMOKE_BROWSER=webkit e SMOKE_ORIENTATION=landscape. A geração de PDF continua restrita ao Chromium; no WebKit são verificados o botão e os estilos de impressão.

Limites: a emulação não valida o menu nativo de colagem do iOS, teclado virtual, zoom automático ao focar campos, barras dinâmicas do Safari, recorte físico da tela ou gestos do sistema. A colagem WebKit é testada pelo evento com clipboardData, não pelo clipboard nativo do iOS. Não foi necessário alterar o código da aplicação nesta validação.

Na primeira tentativa de persistência em paisagem houve um timeout aguardando a visualização após Salvar. Duas repetições completas consecutivas passaram, com limpeza das contas em todas as tentativas. A causa do timeout isolado não foi determinada; ele não é tratado como prova de compatibilidade perfeita.
