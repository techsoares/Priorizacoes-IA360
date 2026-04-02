# Melhorias Identificadas — Dashboard IA360

**Data:** 2026-04-02  
**Contexto:** Após implementação de cores vibrantis e light mode na tela de Entregas

---

## 📊 Gráficos & Visualizações

### 1. Chart: ROI Estimado vs Real (Top 5)
**Status:** ⚠️ Design  
**Descrição:** Atualmente mostra barras horizontais simples. Pode ser melhor com barras duplas (lado a lado) para comparação visual.
**Impacto:** Melhor visualização de comparação estimado vs real
**Esforço:** Médio

---

### 2. Chart: CAPEX vs OPEX/ano
**Status:** ⚠️ Design  
**Descrição:** Ocupa muito espaço vertical. Sugestão: trocar para gráfico de pizza (ou donut) para economizar espaço.
**Impacto:** Layout mais compacto, melhor uso do espaço disponível
**Esforço:** Médio

---

### 3. Chart 5 & 6: Dados Não Populados
**Status:** 🔴 Bloqueado (Backend)  
**Descrição:** 
- Chart 5 (ROI Acumulado — Últimos 12 Meses)
- Chart 6 (OPEX Mensal + Iniciativas Entregues)

Gráficos foram implementados mas não mostram dados. Suspeita: dados no backend não estão sendo carregados corretamente. Pode ser necessário reiniciar o backend.

**Próximos passos:** 
1. Verificar se há dados no banco de dados
2. Verificar logs do backend
3. Possível reinicialização de serviço

---

## 🎨 Contraste & Light Mode

### 4. Pills de Iniciativas: Números Brancos em Light Mode
**Status:** 🔴 Bug — Severity: HIGH  
**Descrição:** Na tela de "Custos & Dados", as pills mostram números em branco que desaparecem em light mode.
**Afetadas:** Pills de "Iniciativas", "Sem custo-base", etc.
**Solução:** Adicionar suporte a light mode para texto das pills (usar dark: prefix)
**Esforço:** Baixo (edit CSS Tailwind)

---

### 5. Status Muito Claros (Dashboard & Timeline)
**Status:** ⚠️ Design  
**Descrição:** Alguns status badges ficam muito claros/desbotados, especialmente "Homologação".
**Afetadas:** Dashboard, Timeline
**Sugestão:** Aumentar saturação/contraste dos status colors
**Esforço:** Baixo

---

## 🔄 Interatividade & Filtros

### 6. Tela Custos & Dados: Filtro Clicável nas Pills
**Status:** ⚠️ Feature  
**Descrição:** Quero poder clicar nas pills de quantidade ("sem custo-base", etc) para filtrar a tabela.
**Comportamento esperado:**
- Clicar na pill "Sem custo-base: 5" → filtra tabela mostrando apenas iniciativas sem custo-base
- Clicar novamente → remove filtro

**Impacto:** Melhor UX, exploração rápida de dados
**Esforço:** Médio

---

## 📍 Tooltips & Labels

### 7. Entregas: Tooltip ROI Médio
**Status:** 🔴 Bug — Severity: MEDIUM  
**Descrição:** O tooltip do card "ROI MÉDIO" está mostrando dados de "ROI Estimado" mas deveria mostrar "ROI Real" (pois é uma entrega concluída, sabemos o ROI real).
**Localização:** Tela de Entregas, seção de KPI Pills
**Solução:** Ajustar lógica para exibir `metrics.roi_percent_real` ao invés de `metrics.roi_percent`
**Esforço:** Muito Baixo

---

## Priorização Sugerida

### 🔴 Críticos (fazer primeiro)
1. #4 — Pills: números brancos em light mode
2. #7 — Tooltip ROI correto

### 🟡 Importantes
3. #3 — Dados não populados (Chart 5/6)
4. #6 — Filtro clicável em pills

### 🟢 Nice-to-have
5. #1 — ROI barras duplas
6. #2 — CAPEX/OPEX como pizza
7. #5 — Status contrast

---

## Notas Técnicas

- **Light mode:** Usar padrão `dark:text-white light:text-gray-900` para elementos críticos
- **Status colors:** Revisar paleta em `index.css` para status badges
- **Chart 5/6:** Pode estar relacionado a:
  - Items não têm `metrics.monthly_gains` ou `resolution_date`
  - Backend não retornando dados completos
  - Precisa validar estrutura de dados esperada

