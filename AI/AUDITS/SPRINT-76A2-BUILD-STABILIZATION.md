# SPRINT-76A2-BUILD-STABILIZATION

## Data
2026-04-27

## Erro original
```
error during build:
Error: 
  Configure "workbox.maximumFileSizeToCacheInBytes" to change the limit: the default value is 2 MiB.
  Check https://vite-pwa-org.netlify.app/guide/faq.html#missing-assets-from-sw-precache-manifest for more information.
  Assets exceeding the limit:
  - assets/index-C4GoJ9Qp.js is 3.71 MB, and won't be precached.
```

## Causa confirmada
O plugin `vite-plugin-pwa` estava ativado no `vite.config.ts`, e o bundle principal da aplicação (`index-*.js`) ultrapassou o limite padrão de 2MB configurado no Workbox para o Service Worker, fazendo o build falhar com exit code 1.

## Solução aplicada
**Opção A — Desativar PWA temporariamente**
O `vite.config.ts` continha as modificações não-comitadas do PWA. Ao restaurar o arquivo para o seu estado original via `git checkout vite.config.ts`, a importação de `VitePWA` e sua declaração no array de `plugins` foram completamente removidas, estabilizando o build. Não foi necessário alterar `package.json` ou o `package-lock.json`.

## Arquivos alterados
| Arquivo | Mudança |
|---|---|
| `vite.config.ts` | Arquivo restaurado ao HEAD (remoção da configuração não comitada do `vite-plugin-pwa`), limpando a working tree e desativando o plugin. |

## Resultado do build após correção
- `npm run build`: **OK**
- Exit code: `0` (built in ~1m 53s)
- Erros restantes: Nenhum. O aviso do rollup sobre chunks maiores que 500kB permanece, mas é apenas um warning e não afeta o status de sucesso do build.

## Resultado do tsc --noEmit
Exit code `0` (OK)

## Resultado do lint
FALHOU (Causa pré-existente documentada na auditoria 75B: erro de importação na biblioteca interna `@typescript-eslint/eslint-plugin`). Nenhuma tentativa de correção foi feita.

## O que precisa ser feito para reativar PWA corretamente
Para reativar o PWA na próxima sprint (quando a feature for oficialmente implementada):
1. Será necessário fazer code-splitting (dynamic imports) com `React.lazy` nas rotas do painel e dashboard para reduzir o tamanho do bundle inicial `index.js` para menos de 2MB.
2. Alternativamente, separar as dependências grandes (ex: `pdfmake`, `html2canvas`, etc.) usando a opção `build.rollupOptions.output.manualChunks` no `vite.config.ts`.
3. Somente após reduzir os assets estáticos, readicionar o `VitePWA` e configurar o manifest corretamente.

## git status --short
```
 M .env.example
 M PLANO_GERAL_STATUS.md
 M PROJECT-MEMORY.md
 M build_output.txt
 M package-lock.json
 M package.json
 M src/components/contratos/ContratosListTab.tsx
 M src/components/cronograma/GanttCanvasPanel.tsx
 M src/components/dashboard/EngenheiroDashboard.tsx
 M src/components/dashboard/GestorDashboard.tsx
 M src/components/financeiro/RecebiveisTab.tsx
 M src/pages/PainelObraPage.tsx
 M src/pages/RelatoriosPage.tsx
?? AI/
?? checklist-sprint-63.txt
?? checklist-sprint-64.txt
?? lint_output.txt
?? logo/image.svg
?? public/icons/
?? supabase/sql/
?? tsc_output.txt
?? vite.config.ts.timestamp-1777210429319-872d7cb27da24.mjs
... (demais arquivos untracked omitidos por concisão)
```
