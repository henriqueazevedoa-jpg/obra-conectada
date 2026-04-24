# Lastra — Auditoria do Sistema
Gerado em: 2026-04-24T16:47:35.146Z

## 1. Erros TypeScript


## 2. Status das Páginas
✅ /login                                        4371ms  0 erros console
✅ /onboarding                                   3097ms  0 erros console
✅ /obras                                        3034ms  0 erros console
✅ /painel                                       6051ms  1 erros console
   ↳ Failed to load resource: the server responded with a status of 400 ()
✅ /dashboard                                    3324ms  1 erros console
   ↳ Failed to load resource: the server responded with a status of 404 ()
✅ /orcamento                                    3654ms  0 erros console
✅ /orcamento?tab=planilha                       3386ms  0 erros console
✅ /orcamento?tab=cotacao                        2757ms  0 erros console
✅ /cronograma                                   3197ms  0 erros console
✅ /financeiro                                   2902ms  0 erros console
✅ /financeiro?tab=pagamentos                    3833ms  0 erros console
✅ /financeiro?tab=custo-real                    3370ms  0 erros console
✅ /financeiro?tab=fluxo-caixa                   3115ms  0 erros console
✅ /diario                                       3708ms  1 erros console
   ↳ Failed to load resource: the server responded with a status of 400 ()
✅ /estoque                                      4143ms  0 erros console
✅ /equipe                                       3227ms  2 erros console
   ↳ Failed to load resource: the server responded with a status of 404 ()
✅ /compras                                      3048ms  0 erros console
✅ /agenda                                       3879ms  1 erros console
   ↳ Failed to load resource: the server responded with a status of 400 ()
✅ /documentos                                   3015ms  0 erros console
✅ /contatos                                     3790ms  0 erros console
✅ /contratos                                    3073ms  0 erros console
✅ /relatorios                                   3402ms  0 erros console
✅ /biblioteca                                   3454ms  1 erros console
   ↳ Warning: Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.%s 

Check the render method of `PageShell`.  
    at KPICardShell (http://127.0.0.1:8080/src/components/layout/PageShell.tsx:44:13)
    at PageShell (http://127.0.0.1:8080/src/components/layout/PageShell.tsx:356:37)
    at BibliotecaPage (http://127.0.0.1:8080/src/pages/BibliotecaPage.tsx:74:45)
    at RenderedRoute (http://127.0.0.1:8080/node_modules/.vite/deps/react-router-dom.js?v=a2aab71e:4088:5)
    at Outlet (http://127.0.0.1:8080/node_modules/.vite/deps/react-router-dom.js?v=a2aab71e:4494:26)
    at div
    at main
    at div
    at AppLayout (http://127.0.0.1:8080/src/components/AppLayout.tsx:1294:30)
    at ObraSelectionProvider (http://127.0.0.1:8080/src/contexts/ObraSelectionContext.tsx:26:41)
    at SuprimentosProvider (http://127.0.0.1:8080/src/contexts/SuprimentosContext.tsx:27:39)
    at CustoRealProvider (http://127.0.0.1:8080/src/contexts/CustoRealContext.tsx:62:37)
    at EstoqueProvider (http://127.0.0.1:8080/src/contexts/EstoqueContext.tsx:55:35)
    at OrcamentoProvider (http://127.0.0.1:8080/src/contexts/OrcamentoContext.tsx:227:37)
    at ObrasProvider (http://127.0.0.1:8080/src/contexts/ObrasContext.tsx:43:33)
    at CommandPaletteProvider (http://127.0.0.1:8080/src/contexts/CommandPaletteContext.tsx:28:42)
    at AppProviders (http://127.0.0.1:8080/src/App.tsx:211:25)
    at ProtectedRoute (http://127.0.0.1:8080/src/App.tsx:84:27)
    at RenderedRoute (http://127.0.0.1:8080/node_modules/.vite/deps/react-router-dom.js?v=a2aab71e:4088:5)
    at Routes (http://127.0.0.1:8080/node_modules/.vite/deps/react-router-dom.js?v=a2aab71e:4558:5)
    at AppRoutes
    at Router (http://127.0.0.1:8080/node_modules/.vite/deps/react-router-dom.js?v=a2aab71e:4501:15)
    at BrowserRouter (http://127.0.0.1:8080/node_modules/.vite/deps/react-router-dom.js?v=a2aab71e:5247:5)
    at CompanyProvider (http://127.0.0.1:8080/src/contexts/CompanyContext.tsx:28:35)
    at AuthProvider (http://127.0.0.1:8080/src/contexts/AuthContext.tsx:85:32)
    at Provider (http://127.0.0.1:8080/node_modules/.vite/deps/chunk-OXZDJRWN.js?v=a2aab71e:38:15)
    at TooltipProvider (http://127.0.0.1:8080/node_modules/.vite/deps/@radix-ui_react-tooltip.js?v=a2aab71e:64:5)
    at QueryClientProvider (http://127.0.0.1:8080/node_modules/.vite/deps/@tanstack_react-query.js?v=a2aab71e:2934:3)
    at App
✅ /configuracoes                                2646ms  0 erros console
✅ /configuracoes?tab=calendario                 2780ms  0 erros console
✅ /configuracoes?tab=orcamento                  3714ms  0 erros console
✅ /configuracoes?tab=calculadora                2796ms  0 erros console
✅ /admin/dashboard                              2662ms  0 erros console
✅ /admin/companies                              3176ms  0 erros console
✅ /admin/plans                                  2767ms  0 erros console
✅ /admin/calculadora                            2807ms  2 erros console
   ↳ Failed to load resource: the server responded with a status of 400 ()
✅ /admin/feedbacks                              2638ms  0 erros console
✅ /calculadora                                  2308ms  0 erros console
✅ /perfil                                       2991ms  0 erros console

## 3. Arquivos Maiores
5011 src\integrations\supabase\types.ts
2004 src\components\orcamento\CotacaoCentral.tsx
1765 src\pages\PagamentosPage.tsx
1706 src\components\financeiro\PagamentosTab.tsx
1671 src\components\orcamento\OrcamentoEditor.tsx
1289 src\components\orcamento\CatalogDrawer.tsx
1284 src\contexts\OrcamentoContext.tsx
1226 src\components\AppLayout.tsx
1182 src\components\execucao\EquipeTab.tsx
1066 src\components\orcamento\CotacaoDrawer.tsx
1033 src\pages\ContatosPage.tsx
1010 src\components\execucao\DiarioTab.tsx
996 src\components\cronograma\GanttCanvasPanel.tsx
978 src\components\orcamento\OrcamentoDashboard.tsx
898 src\components\biblioteca\ComposicoesTab.tsx
852 src\pages\CronogramaPage.tsx
820 src\pages\InsumosPage.tsx
812 src\components\cronograma\TaskDetailDrawer.tsx
790 src\components\financeiro\CustoRealTab.tsx
784 src\components\execucao\PedidosTab.tsx
750 src\components\execucao\EntradasPendentesPanel.tsx
746 src\components\contratos\MedicaoDrawer.tsx
743 src\components\layout\PageShell.tsx
739 src\components\orcamento\EtapaBlockCard.tsx
728 src\components\orcamento\ImportarSinapiDialog.tsx
718 src\components\orcamento\SinapiReviewDrawer.tsx
713 src\pages\AgendaPage.tsx
694 src\components\calculadora\DrawerCalculadoraEstimativa.tsx
671 src\pages\admin\AdminCalculadoraPage.tsx
664 src\components\orcamento\PasteImportDialog.tsx

## 4. Contagem de Dados no Banco
obras	17
orcamento_versoes	14
orcamento_categorias	59
orcamento_composicoes	102
orcamento_subitens	29
cronograma_tarefas	2
pagamentos	50
contratos	0
diario_registros	43
feedbacks	0
companies	5
profiles	6

## 5. Code Smells
=== CODE SMELLS ===
supabase as any:
239
ts-ignore:
1
TODO/FIXME:
src\components\calculadora\CalculadoraResultadoView.tsx:11: import { formatarMoeda, METODO_LABELS } from '@/lib/calculadora-engine';
src\components\calculadora\CalculadoraResultadoView.tsx:178: <Badge variant="outline" className="text-[10px]">{METODO_LABELS[resultado.metodo]}</Badge>
src\components\calculadora\DrawerCalculadoraEstimativa.tsx:25: METODO_LABELS,
src\components\calculadora\DrawerCalculadoraEstimativa.tsx:507: <p className="text-sm font-semibold">{METODO_LABELS[m]}</p>
src\components\ia\NfReviewDrawer.tsx:272: onClick={() => {/* TODO: redirecionar para pagamentos */}}
src\hooks\useCalculadoraAcesso.ts:93: estimativas_usadas: 0, // TODO: buscar de calculadora_contas quando necessário
src\lib\calculadora-engine.ts:494: export const METODO_LABELS: Record<string, string> = {
src\pages\admin\AdminCalculadoraPage.tsx:434: if (lote.estado && lote.estado !== 'TODOS') query.eq('estado', lote.estado);
src\pages\admin\AdminCalculadoraPage.tsx:510: <option value="TODOS">Todos os estados</option>
console.error hardcoded:
58

