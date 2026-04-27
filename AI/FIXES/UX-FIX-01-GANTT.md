# UX-FIX-01 — Gantt do Cronograma pós-seed realista

> **Status**: ✅ Corrigido  
> **Data**: 2026-04-27  
> **Obra teste**: Residência Alto da Serra (45 tarefas, 20 dependências)

---

## Correções Implementadas

### 1. Alinhamento Linhas Tabela ↔ Barras Gantt

**Causa raiz**: O header da lista (50px) estava DENTRO da área de scroll (`listScrollRef`),
enquanto o header do Gantt (50px) estava FORA da área de scroll (`wrapperRef`).

Quando ambos estavam em `scrollTop=0`:
- Lista: mostra header (50px) + row 1
- Gantt: mostra row 1 imediatamente (header é externo)

**Resultado**: offset permanente de 50px entre linhas da tabela e barras do Gantt.

**Correção**: Extraímos o header da lista para FORA do scroll area, criando uma estrutura
espelhada com o Gantt:

```
[Lista]                    [Gantt]
┌─ Header (50px) ─────┐  ┌─ Header (50px) ─────┐
├─ scrollable rows ────┤  ├─ scrollable canvas ──┤
│  row 0 (38px)        │  │  bar 0 (38px)        │
│  row 1               │  │  bar 1               │
│  ...                 │  │  ...                 │
└──────────────────────┘  └──────────────────────┘
```

### 2. Scroll Sincronizado

**Causa raiz**: O `ganttScrollRef` era atribuído ao div externo do Gantt
(`overflow-hidden`), e depois sobrescrito internamente pelo GanttCanvasPanel
ao `wrapperRef` (o div com `overflow-y-auto`). O `useEffect` de sync em
CronogramaPage rodava antes do GanttCanvasPanel atribuir o ref, resultando
em refs nulos.

**Correção**: 
- Removido `ref={ganttScrollRef}` do div externo
- Adicionado callback `onScrollRefReady` no GanttCanvasPanel
- Quando o `wrapperRef` é montado, ele atribui ao `scrollRef` E chama
  `onScrollRefReady` via `requestAnimationFrame`
- O `setupScrollSync` é chamado tanto no mount quanto quando o callback dispara
- Usa flag `isSyncing` com `requestAnimationFrame` para evitar loop infinito

### 3. Hierarquia Visual (Barras)

**Antes**: Todas as barras tinham a mesma cor (status-based), diferindo apenas
em altura (22px vs 14px). Com 45 tarefas completas, tudo ficava verde e igual.

**Depois**: Três níveis visuais:

| Tipo | Cor | Altura | Quando |
|------|-----|--------|--------|
| RESUMO (grupo) | Roxo `#7c3aed` | 26px | `tipo_tarefa === 'RESUMO'` |
| Tarefa padrão | Status (verde/azul/cinza/vermelho) | 22px | nivel 1, não-RESUMO |
| Subtarefa | Azul `#60a5fa` | 14px | nivel > 1 |

### 4. Zoom Horizontal Preservado

**Antes**: Dois wheel handlers conflitantes (continuous zoom + semantic zoom),
ambos reagiam a `ctrl+wheel`, criando comportamento imprevisível.

**Depois**: Handler unificado:

| Ação | Resultado |
|------|-----------|
| `Ctrl/Cmd + wheel` | Zoom horizontal contínuo (foco no mouse) |
| `Shift + wheel` | Pan horizontal |
| `Wheel normal` | Scroll vertical (nativo, sincronizado) |
| Botões Dias/Semanas/Meses/Trim | Zoom discreto (mantidos) |
| Drag no canvas | Pan horizontal (mantido) |

---

## Arquivos Alterados

| Arquivo | Mudanças |
|---------|----------|
| `src/pages/CronogramaPage.tsx` | Header fora do scroll, scroll sync robusto, props extras ao Gantt |
| `src/components/cronograma/GanttCanvasPanel.tsx` | `onScrollRefReady`, wheel unificado, hierarquia 3 níveis, remoção semantic zoom duplicado |

---

## Proposta: Zoom Vertical

### Conceito

Zoom vertical permitiria aumentar ou diminuir a altura das linhas (ROW_H) para
melhorar a legibilidade com muitas tarefas ou dar uma visão mais compacta.

### Implementação Proposta

```
Estado: rowScale: number (default 1.0, range 0.5–2.0)
ROW_H efetivo = Math.round(38 * rowScale)
```

#### Mudanças necessárias:

1. **GanttCanvasPanel**:
   - `ROW_H` deixa de ser constante e passa a ser derivado de `rowScale`
   - `BAR_H`, `SUB_BAR_H`, `BAR_OFFSET_Y` também escalam
   - `totalCanvasHeight` recalculado com o novo ROW_H
   - Barras, tooltips, linhas de dependência usam ROW_H dinâmico

2. **CronogramaPage (WBSRow)**:
   - `height: 38` no style do WBSRow precisa ser `height: ROW_H_EFETIVO`
   - O header de colunas (50px) pode ficar fixo
   - O `rowScale` precisa ser um estado compartilhado entre CronogramaPage e GanttCanvasPanel

3. **UI de controle**:
   - Slider ou botões +/- no toolbar do Gantt
   - Atalho: `Ctrl+Shift+wheel` = zoom vertical
   - Ou: botões ▲▼ ao lado dos botões de zoom horizontal

4. **Riscos**:
   - Font sizes nas barras precisam escalar ou ter mínimo legível
   - Dependency arrows (Y coordinates) precisam usar ROW_H dinâmico
   - Performance: com muitas tarefas e ROW_H grande, o SVG fica enorme
   - Textos nas linhas da tabela (WBSRow) podem truncar ou overflow com ROW_H < 30

5. **Estimativa de esforço**: Médio — ~1 sprint isolado
   - Precisa propagar `rowScale` ou `effectiveRowH` para ambos os componentes
   - Testes com 45+ tarefas em escala 0.5x e 2.0x
   - Garantir que scroll sync continua funcionando com alturas variáveis

### Recomendação

Implementar como feature separada após validar que as correções atuais estão
estáveis em produção. O zoom vertical NÃO é necessário para o funcionamento
correto do Gantt — é um enhancement de UX para usuários com muitas tarefas.
