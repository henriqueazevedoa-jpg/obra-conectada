# VISUAL.md — ObraConectada Design System

**Versão:** 2.1 | **Última atualização:** 2026-04-19
**Referência estrutural:** `OrcamentoPage.tsx` + `CronogramaPage.tsx` (após correções v2.1)
**Referência de paleta:** `FinanceiroCentral.tsx` (após refatoração)
**Referência visual de qualidade:** páginas `/orcamento` e `/cronograma` no browser

> Este arquivo é a fonte única de verdade para decisões visuais.
> Antes de qualquer tarefa de UI, leia este arquivo inteiro.
> NUNCA hardcode cores — use os tokens definidos aqui.
> NUNCA altere lógica ao mexer em layout.
> SEMPRE abra OrcamentoPage.tsx como referência antes de criar qualquer página.

---

## CHANGELOG v2.1

- Corrigido: ícone do Cronograma estava usando azul antigo (#EBF5FF/#1D4ED8) → agora usa roxo (#EEEDFE/#AFA9EC/#26215C) como todas as páginas
- Corrigido: botão "Grupo" do Cronograma estava azul → agora é ghost neutro
- Corrigido: botão "Marco" do Cronograma estava azul → agora é ghost âmbar (#FAEEDA/#854F0B)
- Corrigido: STATUS_CONFIG do Cronograma usava classes Tailwind de cor → agora usa tokens semânticos do sistema
- Novo: padrão de split button para páginas com múltiplos tipos de criação
- Novo: especificação completa da seção Cronograma

---

## 1. FILOSOFIA VISUAL

O produto deve dar a impressão imediata de "WOW, que sistema moderno" —
igual a Linear, Vercel ou Notion. Isso se alcança com:

- **Densidade informacional:** mostrar dados reais com hierarquia, não espaço vazio
- **Cada elemento ganha peso:** cards com bordas, ícones, barras de progresso
- **Cores com propósito:** cada cor comunica um estado, não decora
- **Zero desperdício de espaço:** ícone e título ficam inline com as abas
- **Ritmo visual:** listas de cards criam padrão rítmico que o olho segue

---

## 2. IDENTIDADE VISUAL — PALETA DE CORES

### Cor primária de ação — ROXO

Todos os elementos interativos primários usam roxo. Esta é a identidade do produto.

```
Botão primário (bg):      #534AB7   ← purple-600
Botão primário (hover):   #3C3489   ← purple-800
Ícone de página (bg):     #EEEDFE   ← purple-50   ✅ TODAS as páginas
Ícone de página (circle): #AFA9EC   ← purple-200  ✅ TODAS as páginas
Ícone de página (symbol): #26215C   ← purple-900  ✅ TODAS as páginas
Botão ghost (border):     #AFA9EC   ← purple-200
Botão ghost (color):      #3C3489   ← purple-800
Item ativo sidebar:       #534AB7   ← já implementado
Toggle ativo (bg):        #EEEDFE
Toggle ativo (border):    #AFA9EC
Toggle ativo (color):     #3C3489
Barra de progresso fill:  #534AB7
Borda esquerda previsto:  #534AB7
```

**Regra semântica crítica:**
- ROXO = tudo que é AÇÃO (botões, ícones de página, toggles, item ativo, borda de card previsto)
- AZUL = reservado para cor semântica "info" em dados
- Não usar `#378ADD` em botões (era o azul antigo)
- ❌ NUNCA usar `#EBF5FF` como fundo de ícone de página (azul antigo — era o Cronograma antes da correção)
- ❌ NUNCA usar `#1D4ED8` como cor de ícone de página (azul antigo)

### Cores semânticas de dados

```
info    #185FA5 / bg #E6F1FB   → totais, referência, informacional
success #3B6D11 / bg #EAF3DE   → positivo, pago, dentro do previsto, concluído
danger  #A32D2D / bg #FCEBEB   → negativo, vencido, estouro, atrasado
warning #854F0B / bg #FAEEDA   → atenção, próximo do vencimento, abaixo do planejado
neutro  var(--color-text-secondary) → sem dado ainda
```

### Ramp completo

| Ramp    | 50        | 200       | 400       | 600       | 800       |
|---------|-----------|-----------|-----------|-----------|-----------|
| purple  | #EEEDFE   | #AFA9EC   | #7F77DD   | #534AB7   | #3C3489   |
| blue    | #E6F1FB   | #85B7EB   | #378ADD   | #185FA5   | #0C447C   |
| green   | #EAF3DE   | #97C459   | #639922   | #3B6D11   | #27500A   |
| amber   | #FAEEDA   | #EF9F27   | #BA7517   | #854F0B   | #633806   |
| red     | #FCEBEB   | #F09595   | #E24B4A   | #A32D2D   | #791F1F   |

---

## 3. ESTRUTURA DE PÁGINA — PADRÃO OBRIGATÓRIO

**⚠️ Esta é a mudança mais importante da v2.0. Mantida e consolidada na v2.1.**
A linha de título separada foi eliminada. Tudo fica inline.

```
┌──────────────────────────────────────────────────────────────────┐
│ TOPBAR (sidebar + header da aplicação)                           │
├──────────────────────────────────────────────────────────────────┤
│ L1 — LINHA DE ABAS — altura 48px                                 │
│ [ícone 28px] Nome  |  [Aba1] [Aba2] [Aba3]  →  [ghost] [+Ação] │  ← sticky
├──────────────────────────────────────────────────────────────────┤
│ L2 — BARRA DE KPIs — altura variável (~80-100px)                 │
│ [card KPI] [card KPI] [card KPI] [card KPI] [card KPI]          │  ← sticky
├──────────────────────────────────────────────────────────────────┤
│ L3 — TOOLBAR DE AÇÕES — altura ~38px (quando existe)             │
│ [filtros inline] ou [chips de visualização] ...                  │
├──────────────────────────────────────────────────────────────────┤
│ L4 — CONTEÚDO — rola abaixo                                      │
│ Cards por linha (não table HTML plana)                           │
└──────────────────────────────────────────────────────────────────┘
```

```css
/* Sticky: envolve L1 + L2 + L3 */
position: sticky;
top: 0;
z-index: 10;
background: var(--color-background-primary);
```

---

## 4. L1 — LINHA DE ABAS (CAMADA 1)

```tsx
<div style={{
  display: 'flex',
  alignItems: 'center',
  padding: '0 16px',
  background: 'var(--color-background-primary)',
  borderBottom: '0.5px solid var(--color-border-tertiary)',
  height: 48,
  gap: 0,
  position: 'sticky',
  top: 0,
  zIndex: 10
}}>
  {/* ESQUERDA: ícone + nome + separador */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, paddingRight: 12 }}>
    <div style={{ width: 28, height: 28, borderRadius: 8, background: '#EEEDFE',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* SVG do ícone da página — ver tabela de ícones abaixo */}
    </div>
    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
      {nomeDaPagina}
    </span>
    <div style={{ width: 1, height: 16, background: 'var(--color-border-tertiary)', marginLeft: 8 }}/>
  </div>

  {/* CENTRO: abas */}
  <div style={{ display: 'flex', flex: 1, alignItems: 'flex-end', height: '100%', gap: 2, paddingTop: 6 }}>
    {abas.map(aba => <TabButton key={aba} ... />)}
  </div>

  {/* DIREITA: botões de ação */}
  <div style={{ display: 'flex', gap: 8, flexShrink: 0, paddingLeft: 12 }}>
    {/* Ver padrão de botões abaixo */}
  </div>
</div>
```

### Aba inativa vs ativa

```css
/* Inativa */
font-size: 13px; padding: 0 14px; height: 100%;
border-radius: 8px 8px 0 0;
border: 0.5px solid transparent; border-bottom: none;
color: var(--color-text-secondary); background: transparent;
position: relative; top: 0.5px;

/* Ativa */
background: var(--color-background-primary);
border-color: var(--color-border-tertiary);
color: var(--color-text-primary); font-weight: 500;
```

### Badge de contagem em aba

```tsx
<span style={{
  background: count > 0 ? '#FCEBEB' : 'var(--color-background-secondary)',
  color: count > 0 ? '#A32D2D' : 'var(--color-text-secondary)',
  fontSize: 11, padding: '1px 6px', borderRadius: 4, marginLeft: 6
}}>{count}</span>
```

### Ícones por página

| Página      | SVG / símbolo         | bg ícone | cor símbolo |
|-------------|-----------------------|----------|-------------|
| Financeiro  | círculo com `$`       | #EEEDFE  | #26215C     |
| Orçamento   | círculo com `%`       | #EEEDFE  | #26215C     |
| Cronograma  | grade 2×2 (4 rects)   | #EEEDFE  | #AFA9EC + #534AB7 (quadrante ativo) |
| Execução    | SVG ⛏ ou capacete    | #EEEDFE  | #26215C     |
| Contatos    | SVG pessoa            | #EEEDFE  | #26215C     |
| Documentos  | SVG documento         | #EEEDFE  | #26215C     |

> ✅ TODAS as páginas usam bg `#EEEDFE`. Sem exceção.
> ❌ `#EBF5FF` (azul) era o Cronograma antigo — proibido.

```tsx
// Ícone correto do Cronograma (grade 2×2 com quadrante ativo em roxo)
<div style={{ width: 28, height: 28, borderRadius: 8, background: '#EEEDFE',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="5" height="5" rx="1" fill="#AFA9EC"/>
    <rect x="9" y="2" width="5" height="5" rx="1" fill="#AFA9EC"/>
    <rect x="2" y="9" width="5" height="5" rx="1" fill="#AFA9EC"/>
    <rect x="9" y="9" width="5" height="5" rx="1" fill="#534AB7"/>
  </svg>
</div>
```

---

## 5. PADRÃO DE BOTÕES DE AÇÃO (L1 — lado direito)

### Botão primário simples (1 ação)

```tsx
// Ex: Financeiro → "+ Novo pagamento"
<button style={{
  display: 'flex', alignItems: 'center', gap: 4,
  height: 28, padding: '0 12px',
  background: '#534AB7', color: '#fff',
  border: 'none', borderRadius: 6,
  fontSize: 12, fontWeight: 500, cursor: 'pointer'
}}>
  <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
  {primaryLabel}
</button>
```

### Botão ghost (ação secundária)

```tsx
// Ex: "Exportar" — presente em todas as páginas
<button style={{
  display: 'flex', alignItems: 'center',
  height: 28, padding: '0 12px',
  border: '0.5px solid #AFA9EC',
  background: 'transparent', color: '#3C3489',
  borderRadius: 6, fontSize: 12, fontWeight: 500
}}>
  Exportar
</button>
```

### Split button (múltiplos tipos de criação) ⭐ NOVO v2.1

Usar quando a página tem uma ação primária frequente (ex: "Tarefa") mais
ações secundárias menos usadas (ex: "Marco", "Grupo").
Padrão adotado no Cronograma.

```tsx
// Split button: lado esquerdo = ação direta | lado direito = dropdown com alternativas
<div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>

  {/* Lado esquerdo — ação primária direta */}
  <button
    onClick={() => triggerAddTask('PADRAO')}
    style={{
      display: 'flex', alignItems: 'center', gap: 4,
      height: 28, padding: '0 12px',
      background: '#534AB7', color: '#fff',
      border: 'none', borderRadius: '6px 0 0 6px',
      fontSize: 12, fontWeight: 500, cursor: 'pointer'
    }}
  >
    <PlusIcon size={12} />
    Tarefa
  </button>

  {/* Divisor interno */}
  <div style={{ width: 0.5, height: 28, background: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />

  {/* Lado direito — chevron abre dropdown */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 28, padding: '0 8px',
        background: '#534AB7', color: '#fff',
        border: 'none', borderRadius: '0 6px 6px 0',
        cursor: 'pointer'
      }}>
        <ChevronDownIcon size={10} />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" style={{ minWidth: 160 }}>
      <DropdownMenuItem onClick={() => triggerAddTask('RESUMO')}>
        {/* ícone grupo neutro */} Grupo
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => triggerAddTask('MARCO')}>
        {/* ícone losango âmbar */} Marco
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--color-text-secondary)' }}>milestone</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

**Regra do split button:**
- Lado esquerdo = ação mais frequente do fluxo (sempre 1 clique)
- Dropdown = alternativas menos frequentes (Grupo, Marco, tipos especiais)
- ❌ Não usar split button se há apenas 1 tipo de criação — usar botão simples
- ❌ Não colocar mais de 4 itens no dropdown — se precisar de mais, repensar a hierarquia

### Botão ghost âmbar (Marco — quando exposto individualmente)

Usar apenas se o design da página exigir Marco como botão visível fora do split.

```tsx
<button style={{
  display: 'flex', alignItems: 'center', gap: 4,
  height: 28, padding: '0 10px',
  border: '0.5px solid #EF9F27',
  background: '#FAEEDA', color: '#854F0B',
  borderRadius: 6, fontSize: 11, fontWeight: 500
}}>
  {/* ícone losango */} Marco
</button>
```

### Botão ghost neutro (Grupo — quando exposto individualmente)

```tsx
<button style={{
  display: 'flex', alignItems: 'center', gap: 4,
  height: 28, padding: '0 10px',
  border: '0.5px solid var(--color-border-secondary)',
  background: 'transparent', color: 'var(--color-text-secondary)',
  borderRadius: 6, fontSize: 11, fontWeight: 500
}}>
  {/* ícone linhas */} Grupo
</button>
```

---

## 6. L2 — BARRA DE KPIs — GRID DE CARDS

**⚠️ KPIs são cards visuais, não células de tabela.**

```tsx
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: 10,
  padding: '12px 16px',
  borderBottom: '0.5px solid var(--color-border-tertiary)'
}}>
  {kpis.map(kpi => (
    <KPICard key={kpi.id} {...kpi} />
  ))}
</div>
```

### Anatomia do KPI card

```tsx
function KPICard({ label, value, icon, tint, valueColor, labelColor, sublabel, progress, progressColor, main }) {
  return (
    <div style={{
      background: tint || 'var(--color-background-secondary)',
      borderRadius: 10,
      padding: main ? '12px 16px' : '10px 14px',
      display: 'flex', flexDirection: 'column', gap: 4,
      minHeight: 72
    }}>
      {/* Ícone + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {icon}
        <span style={{
          fontSize: 10,
          fontWeight: 500,
          color: labelColor || 'var(--color-text-secondary)',
          textTransform: main ? 'uppercase' : 'none',
          letterSpacing: main ? '0.04em' : 0
        }}>
          {label}
        </span>
      </div>
      {/* Valor */}
      <div style={{
        fontSize: main ? 22 : 18,
        fontWeight: 500,
        color: valueColor || 'var(--color-text-primary)',
        lineHeight: 1
      }}>
        {value}
      </div>
      {/* Sublabel contextual */}
      {sublabel && (
        <div style={{ fontSize: 10, color: labelColor || 'var(--color-text-secondary)', marginTop: 1 }}>
          {sublabel}
        </div>
      )}
      {/* Barra de progresso */}
      {progress !== undefined && (
        <div style={{ height: 3, borderRadius: 2, background: 'var(--color-border-tertiary)', marginTop: 2 }}>
          <div style={{ height: 3, borderRadius: 2, background: progressColor || '#534AB7', width: `${progress}%` }}/>
        </div>
      )}
    </div>
  )
}
```

### Tints do KPI principal por contexto

```
Financeiro / Orçamento / DRE:  #F3F2FD   label #534AB7  value #3C3489
Fluxo de caixa:                #FFFBF0   label #854F0B  value #633806
Cronograma — progresso geral:  #F3F2FD   label #534AB7  value #3C3489
Cronograma — card danger:      #FCEBEB   label #A32D2D  value #A32D2D
Cronograma — card success:     #EAF3DE   label #3B6D11  value #3B6D11
Cronograma — card warning:     #FAEEDA   label #854F0B  value #854F0B
```

---

## 7. L3 — TOOLBAR DE AÇÕES (CAMADA 3)

Só existe em abas que precisam de filtros, chips de visualização ou ações secundárias.

```
Fundo:   var(--color-background-secondary)
Padding: 0 16px
Altura:  38px
Border:  border-bottom: 0.5px solid var(--color-border-tertiary)
```

### Chips de visualização (Cronograma)

```tsx
// Ativo roxo
<div style={{ background: '#EEEDFE', borderColor: '#AFA9EC', color: '#3C3489', fontWeight: 500 }}>
  Gantt
</div>
// Inativo
<div style={{ background: 'var(--color-background-primary)', color: 'var(--color-text-secondary)' }}>
  Split
</div>
```

### Seletor de período (Fluxo de caixa)

```css
/* Ativo âmbar */
background: #FAEEDA; border-color: #FAC775; color: #854F0B;
/* Inativo */
background: var(--color-background-primary); color: var(--color-text-secondary);
```

### Toggle de visualização (Gráfico/Tabela)

```css
/* Ativo roxo */
background: #EEEDFE; border-color: #AFA9EC; color: #3C3489;
```

---

## 8. L4 — CONTEÚDO — CARDS POR LINHA

**⚠️ Nunca usar `<table>` HTML plana para listas de itens operacionais.**

```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 16px' }}>
  {items.map(item => (
    <div key={item.id} style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderLeft: `3px solid ${statusColor(item.status)}`,
      borderRadius: '0 8px 8px 0',
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      transition: 'background 0.1s',
      cursor: 'pointer',
    }}>
      {/* colunas com flex */}
    </div>
  ))}
</div>
```

### Cores de borda esquerda por status

```
Pago / Concluído:   #3B6D11   verde
Vencido / Crítico:  #A32D2D   vermelho
Previsto / Ativo:   #534AB7   roxo
Atenção / SPI baixo: #854F0B  âmbar
Neutro / Rascunho:  var(--color-border-tertiary)
```

### Quando usar tabela (exceções)

Tabela HTML é aceitável APENAS para:
- Dados tabulares densos onde alinhamento de coluna é crítico (ex: DRE, planilha de desvios)
- Relatórios com muitas colunas numéricas

Nesses casos, usar `table-layout: fixed` e cabeçalho com estilo uppercase.

---

## 9. PERFORMANCE DE ABAS — REGRA OBRIGATÓRIA

**Nunca desmontar abas ao trocar.** Usar `display: none` para esconder.

```tsx
// ❌ ERRADO — desmonta e remonta a cada troca
{activeTab === 'pagamentos' && <PagamentosTab />}

// ✅ CORRETO — mantém montado, só esconde
<div style={{ display: activeTab === 'pagamentos' ? 'block' : 'none' }}>
  <PagamentosTab />
</div>
```

**Fetches de dados:** sempre no componente pai, nunca dentro do componente de aba.
**Gráficos pesados (Recharts):** usar `React.memo` para evitar re-render ao trocar de aba.

---

## 10. TIPOGRAFIA E TOKENS

```
Título inline na aba:    14px, font-weight 500
Label de KPI:            10px, weight 500
                         KPI principal: uppercase + letter-spacing 0.04em
Valor de KPI principal:  22px, weight 500
Valor de KPI sec.:       18px, weight 500
Texto de card linha:     13px (título), 11px (subtítulo)
Header de coluna:        10px, uppercase, letter-spacing 0.05em, color-text-secondary
Badge/pill:              11px

Pesos: APENAS 400 e 500. Nunca 600 ou 700.

Border-radius ícone pág.: 8px
Border-radius card:       8px (linha), 10px (KPI card), 12px (card grande)
Border-radius badge:      4px
Border-radius botão:      6px

Separadores:             0.5px solid var(--color-border-tertiary)
```

---

## 11. ESPECIFICAÇÕES POR PÁGINA

### Orçamento (`OrcamentoPage.tsx`) — REFERÊNCIA ESTRUTURAL ✅

```
Esta página está correta e é a REFERÊNCIA de estrutura.
Não alterar. Usá-la como molde para todas as demais.

Sem linha de título separada — abas ficam direto no topo.
Total + etapas ficam inline à esquerda das abas.
KPIs são cards em grid de 4.
Cada etapa é um card com borda, progresso e badge.
```

---

### Cronograma (`CronogramaPage.tsx`) — REFERÊNCIA DE DENSIDADE ✅ (após v2.1)

```
Ícone inline: grade 2×2 | bg #EEEDFE | 3 quadrantes #AFA9EC | 1 quadrante #534AB7

Abas: Gantt | Lista | Curva S | Recursos
  (ícones SVG inline em cada aba — BarChart3, List, TrendingUp, Users)

Botões de ação (split button):
  Lado esquerdo:  "+ Tarefa"     → bg #534AB7  (ação direta)
  Lado direito:   chevron        → dropdown com:
    - Grupo   (ghost neutro, ícone linhas)
    - ─────
    - Marco   (ícone losango âmbar #854F0B, label "milestone" em secondary)
  Ghost:          "Exportar"     → border #AFA9EC, color #3C3489

KPIs (4 cards, sempre visíveis quando há obra):
  [Tarefas atrasadas]  tint #FCEBEB  label+value #A32D2D  → danger quando > 0, success quando = 0
  [Progresso geral]    tint #F3F2FD  label #534AB7 value #3C3489  ← principal, com barra
  [Concluídas]         tint #EAF3DE  label+value #3B6D11  → "X / total · Y em andamento"
  [SPI]                tint #FAEEDA  label+value #854F0B  → condicional se há baseline

STATUS_CONFIG — cores por token (não classes Tailwind):
  nao_iniciada:  bar #888780  (neutro)
  em_andamento:  bar #185FA5  (info/azul semântico)
  concluida:     bar #3B6D11  (success)
  atrasada:      bar #A32D2D  (danger)

L3 — Toolbar:
  Chips de visualização: Gantt | Split | Tela cheia
  Ativo: bg #EEEDFE, border #AFA9EC, color #3C3489
  Badge baseline salvo: bg #EAF3DE, color #3B6D11, border #C0DD97

Conteúdo (Lista view):
  Cards por linha com borda esquerda por status
  Handle de drag + chevron expand + status dot + nome + duração + mini-bar + %
  Borda esquerda: previsto=#534AB7 | em andamento=#185FA5 | concluída=#3B6D11 | atrasada=#A32D2D
```

---

### Financeiro (`FinanceiroCentral.tsx`)

```
Ícone inline: círculo $ | bg #EEEDFE | círculo #AFA9EC | símbolo #26215C | 28×28px

Abas: Pagamentos | Custo real | Fluxo de caixa | DRE

Botão primário por aba:
  Pagamentos → "+ Novo pagamento"
  Custo real → "+ Registrar custo"
  Fluxo/DRE  → oculto (só "Exportar" ghost)

KPIs — Pagamentos (5 cards):
  [Total da obra]  tint #F3F2FD  label roxo  valor 22px #3C3489  ← principal
  [Pago]           success quando > 0
  [Vencido]        danger + tint #FCEBEB quando > 0
  [Próx. 30 dias]  warning + sublabel "{N} pag · vence DD/MM"
  [Execução]       neutro + barra de progresso

KPIs — Custo real (5 cards):
  [Orçado total]   tint #F3F2FD  ← principal
  [Realizado]      neutro
  [Desvio]         % com sublabel descritivo
  [Indiretos]      neutro
  [% executado]    neutro + barra

KPIs — Fluxo de caixa (4 cards):
  [A pagar 30d]    tint #FFFBF0  label âmbar  ← principal
  [Esta semana]    danger quando > 0
  [Mês seguinte]   warning quando > 0
  [Pago este mês]  success quando > 0

KPIs — DRE (4 cards):
  [Orçado total]    tint #F3F2FD  ← principal
  [Gasto até agora] neutro
  [Economia/Estouro] % com sublabel
  [% obra paga]     neutro + barra

Conteúdo — Pagamentos:
  Cards por linha, borda esquerda por status (roxo=previsto, verde=pago, vermelho=vencido)
  Filtros inline: busca + Status + Etapa + Período + Ordenar

Conteúdo — Custo real:
  Tabela com alinhamento de colunas (aceitável — dados tabulares densos)
  Gráfico: barras #AFA9EC (orçado) + #534AB7 (realizado)

Conteúdo — DRE:
  Cards side-by-side: Demonstrativo + Composição dos custos
```

---

### Execução (`ExecucaoCentral.tsx`)

```
Ícone inline: SVG capacete ou picareta | bg #EEEDFE | símbolo #26215C
Abas: Diário | Pendências | Equipe | Agenda | Entradas NF | Estoque
Botão primário muda por aba (ver SESSION-TEMPLATE.md).
Seguir estrutura do Orçamento (ícone inline nas abas).
```

---

### Contatos (`ContatosPage.tsx`)

```
Sem abas — chips de filtro inline na L1 (substituem abas).
Chip ativo: bg #EEEDFE, border #AFA9EC, color #3C3489.
KPIs em grid de 4 cards.
Lista de contatos: cards por linha.
```

---

### Documentos (`DocumentosPage.tsx`)

```
Abas: Da obra | Da empresa
KPIs em grid de 3 cards.
Lista: cards por linha.
```

---

## 12. EMPTY STATES

```tsx
<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '60px 20px', gap: 12 }}>
  {/* ícone 40px em color-text-secondary */}
  <p style={{ fontSize: 14, fontWeight: 500 }}>Nenhum [X] registrado</p>
  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center', maxWidth: 320 }}>
    Descrição breve do que fazer.
  </p>
  <button style={primaryBtnStyle}>+ Registrar primeiro [X]</button>
</div>

// Filtros/toolbar: OCULTOS no empty state
```

---

## 13. BADGES E STATUS

```tsx
const badges = {
  previsto:  { bg: '#EEEDFE', color: '#3C3489', border: '0.5px solid #AFA9EC' },
  pago:      { bg: '#EAF3DE', color: '#3B6D11', border: '0.5px solid #C0DD97' },
  vencido:   { bg: '#FCEBEB', color: '#A32D2D', border: '0.5px solid #F7C1C1' },
  atencao:   { bg: '#FAEEDA', color: '#854F0B', border: '0.5px solid #FAC775' },
  info:      { bg: '#E6F1FB', color: '#185FA5', border: '0.5px solid #B5D4F4' },
  etapa:     { bg: '#EEEDFE', color: '#3C3489' },
  sinapi:    { bg: '#F3F2FD', color: '#534AB7', border: '0.5px solid #AFA9EC' },
  baseline:  { bg: '#EAF3DE', color: '#3B6D11', border: '0.5px solid #C0DD97' },
}
// fontSize: 11, padding: '2px 8px', borderRadius: 4
```

---

## 14. O QUE NUNCA FAZER

```
❌ Linha de título separada antes das abas (ocupa espaço, cria fluxo lento)
❌ KPIs como células com divisores verticais (sem peso visual)
❌ <table> HTML plana para listas operacionais (use cards)
❌ Desmontar abas ao trocar — usar display:none
❌ Fetch de dados dentro do componente de aba — fazer no pai
❌ Hardcodar cores fora dos tokens definidos aqui
❌ font-weight 600 ou 700
❌ #378ADD em botões (azul antigo)
❌ #EBF5FF como fundo de ícone de página (azul antigo do Cronograma)
❌ #E6F1FB em fundos de ícone de página (azul antigo)
❌ #1D4ED8 como cor de ícone de página (azul antigo do Cronograma)
❌ Subtítulos genéricos fixos como "Gerencie seus pagamentos"
❌ Gradientes, sombras, efeitos decorativos
❌ Espaço vazio — se a aba está vazia, mostrar empty state, não nada
❌ Classes Tailwind de cor semântica (text-emerald-600, text-red-600, bg-blue-50...)
   → sempre usar os tokens hexadecimais definidos neste arquivo
❌ Botão "Grupo" em azul — usar ghost neutro
❌ 3+ botões soltos no header quando split button resolve com 1
```

---

## 15. CHECKLIST ANTES DE ABRIR PR DE UI

```
☐ Abriu OrcamentoPage.tsx como referência antes de começar?
☐ Abriu /orcamento no browser para calibrar visualmente?
☐ Linha de abas inline (sem linha de título separada)?
☐ Ícone 28×28px com bg #EEEDFE (roxo, não azul)?
☐ KPIs em grid de cards (não linha com divisores)?
☐ KPI principal com tint de fundo?
☐ Lista de itens em cards (não <table> plana)?
☐ Cards com borda esquerda colorida por status?
☐ Abas usando display:none em vez de desmontagem?
☐ Fetches de dados no componente pai?
☐ Botão primário: background #534AB7?
☐ Botão ghost: border #AFA9EC, color #3C3489?
☐ Split button usado quando há múltiplos tipos de criação?
☐ Nenhuma cor hardcodada fora dos tokens?
☐ Nenhuma classe Tailwind de cor semântica (text-emerald, text-red, bg-blue...)?
☐ Nenhuma lógica ou dado alterado?
☐ Empty state: filtros ocultos?
☐ Testado com dados reais (não só empty state)?
```