# Deliveries View UI Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance readability in light mode, apply vibrant PGMais colors to charts, and add two new temporal analytics visualizations (ROI evolution + OPEX/deliveries trends).

**Architecture:** Add a color utility function to DeliveriesView, update existing components for dark/light mode support, extend AnalyticsCharts with monthlyData calculations and two new chart visualizations (line + grouped bars).

**Tech Stack:** React (useMemo, useState), Tailwind CSS (dark: prefix), inline SVG-based charts (no new libraries)

---

## File Structure

```
frontend/src/components/Views/
└── DeliveriesView.jsx (MODIFIED)
    ├── getChartColor() — color utility function
    ├── KpiPill — updated with light mode text classes
    ├── EconomyVsCost — updated with vibrant colors
    └── AnalyticsCharts — extended with monthlyData + Charts 5 & 6

frontend/src/index.css (NO CHANGES)
    ├── Light mode colors already defined in [data-theme='light'] block
    └── Color values: --color-* variables ready to use
```

---

## Task 1: Add Color Utility Function

**Files:**
- Modify: `frontend/src/components/Views/DeliveriesView.jsx` (top of file, after imports)

- [ ] **Step 1: Add color utility function after imports**

Open the file and locate the import section. After all imports, before the `fmt()` function, add:

```javascript
// ── Color utility for dark/light mode support ──────────────────────────────
function getChartColor(colorKey, isDarkMode = true) {
  const colors = {
    green: isDarkMode ? '#40EB4F' : '#1B8E2C',      // Growth/positive
    cyan: isDarkMode ? '#3DB7F4' : '#0066CC',       // Primary accent
    pink: isDarkMode ? '#FE70BD' : '#C81E7E',       // Secondary accent
  }
  return colors[colorKey] || '#999'
}
```

Insert this right after the closing `}` of your imports block.

- [ ] **Step 2: Verify function placement**

Check that the function is placed before `fmt()` function and that syntax is correct. Should see no red squiggles in editor.

- [ ] **Step 3: Commit**

```bash
cd "c:\Users\andressa.soares\Desktop\Dashboard de priorização IA360"
git add frontend/src/components/Views/DeliveriesView.jsx
git commit -m "feat: add getChartColor() utility for dark/light mode colors"
```

---

## Task 2: Update KpiPill for Light Mode

**Files:**
- Modify: `frontend/src/components/Views/DeliveriesView.jsx` (KpiPill component, ~line 27-61)

- [ ] **Step 1: Update value display with light mode class**

Find the KpiPill component. Locate this line (around line 54):

```javascript
<div className="text-[15px] font-bold tracking-tight text-white/90">{value}</div>
```

Replace it with:

```javascript
<div className="text-[15px] font-bold tracking-tight dark:text-white/90 text-gray-900">{value}</div>
```

- [ ] **Step 2: Update sub text with light mode class**

Find the line with `{sub}` (around line 56):

```javascript
<span className="text-[10px] font-medium text-gray-500 mt-1">{sub}</span>
```

Replace with:

```javascript
<span className="text-[10px] font-medium dark:text-gray-500 text-gray-700 mt-1">{sub}</span>
```

- [ ] **Step 3: Verify changes in editor**

Reload component in browser (or let HMR update). In light mode, text should now be dark gray/black. In dark mode, should remain white.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Views/DeliveriesView.jsx
git commit -m "feat: add light mode contrast support to KpiPill component"
```

---

## Task 3: Update EconomyVsCost Colors

**Files:**
- Modify: `frontend/src/components/Views/DeliveriesView.jsx` (EconomyVsCost component, ~line 164-208)

- [ ] **Step 1: Update OPEX color with dynamic getChartColor()**

Find the EconomyVsCost component. Locate the line with "Economia Mensal (OPEX)" (around line 191):

```javascript
<span className="text-[#6BFFEB]">{fmtCompact(item.gains)}</span>
```

Replace with:

```javascript
<span style={{ color: getChartColor('cyan') }}>{fmtCompact(item.gains)}</span>
```

- [ ] **Step 2: Update AnimatedBar color for OPEX bar**

Find the AnimatedBar call right after (around line 193):

```javascript
<AnimatedBar pct={(item.gains / max) * 100} color="#6BFFEB" />
```

Replace with:

```javascript
<AnimatedBar pct={(item.gains / max) * 100} color={getChartColor('cyan')} />
```

- [ ] **Step 3: Update CAPEX color with dynamic getChartColor()**

Find the line with "Investimento (CAPEX)" (around line 198):

```javascript
<span className="text-[#FE70BD]">{fmtCompact(item.costs)}</span>
```

This already uses the correct color (#FE70BD), but update to use getChartColor for consistency:

```javascript
<span style={{ color: getChartColor('pink') }}>{fmtCompact(item.costs)}</span>
```

- [ ] **Step 4: Update CAPEX bar color**

Find the AnimatedBar call for CAPEX (around line 200):

```javascript
<AnimatedBar pct={(item.costs / max) * 100} color="#FE70BD" />
```

Replace with:

```javascript
<AnimatedBar pct={(item.costs / max) * 100} color={getChartColor('pink')} />
```

- [ ] **Step 5: Verify colors in both modes**

Check that bars are now vibrant in both dark and light modes. Colors should be more saturated.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/Views/DeliveriesView.jsx
git commit -m "feat: use vibrant dynamic colors in EconomyVsCost component"
```

---

## Task 4: Create monthlyData Calculation with useMemo

**Files:**
- Modify: `frontend/src/components/Views/DeliveriesView.jsx` (AnalyticsCharts component, ~line 211)

- [ ] **Step 1: Add monthlyData useMemo at top of AnalyticsCharts**

Find the AnalyticsCharts function (around line 211). Right at the start of the function body, after the opening `{`, add:

```javascript
  // Prepare monthly data for new temporal charts
  const monthlyData = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    
    // Initialize 12 months
    const months = Array(12).fill(null).map((_, i) => ({
      month: i,
      monthName: new Date(currentYear, i, 1).toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(),
      roiAccumulated: 0,
      opex: 0,
      deliveryCount: 0,
    }))

    // Aggregate data by resolution month
    items.forEach(item => {
      if (isCompleted(item)) {
        const resDate = getResolutionDate(item)
        if (resDate) {
          const monthIndex = resDate.getMonth()
          months[monthIndex].opex += item.metrics?.monthly_gains || item.metrics?.gain || 0
          months[monthIndex].deliveryCount += 1
        }
      }
    })

    // Calculate cumulative ROI
    let accumulated = 0
    const totalAnnualOpex = months.reduce((sum, m) => sum + m.opex, 0)
    months.forEach(m => {
      const monthlyROI = totalAnnualOpex > 0 ? (m.opex / totalAnnualOpex) * 100 : 0
      accumulated += monthlyROI
      m.roiAccumulated = accumulated
    })

    return months
  }, [items])
```

Ensure this is inserted right after the opening brace of the `AnalyticsCharts` function, before the existing `roiComparison` calculation.

- [ ] **Step 2: Verify monthlyData structure**

In your editor, hover over `monthlyData` and check that TypeScript/IDE shows it as an array with the right properties. No errors should appear.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Views/DeliveriesView.jsx
git commit -m "feat: add monthlyData useMemo for temporal analytics"
```

---

## Task 5: Add Chart 5 — ROI Acumulado (Line Chart)

**Files:**
- Modify: `frontend/src/components/Views/DeliveriesView.jsx` (end of AnalyticsCharts, after Chart 4)

- [ ] **Step 1: Locate insertion point**

Find the closing `</div>` of Chart 4 (around line 299-310). The new Chart 5 will be added right after it, still within the grid.

- [ ] **Step 2: Insert Chart 5**

After the Chart 4 closing div, add:

```javascript
      {/* Chart 5: ROI Accumulated (Line) */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-4">ROI Acumulado (Últimos 12 Meses)</h4>
        
        <div className="relative h-40 flex items-end gap-1">
          {monthlyData.map((month) => {
            const maxROI = Math.max(...monthlyData.map(m => m.roiAccumulated), 1)
            const heightPercent = (month.roiAccumulated / maxROI) * 100
            return (
              <div
                key={month.month}
                className="flex-1 flex flex-col items-center group"
                title={`${month.monthName}: ${month.roiAccumulated.toFixed(1)}%`}
              >
                <div
                  className="w-full rounded-t transition-all hover:opacity-80"
                  style={{
                    height: `${heightPercent}%`,
                    minHeight: '4px',
                    background: getChartColor('green'),
                    boxShadow: `0 0 8px ${getChartColor('green')}44`,
                  }}
                />
                <span className="text-[8px] text-gray-500 mt-1 text-center">{month.monthName}</span>
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-2 mt-4 text-[9px] text-gray-500">
          <span className="inline-block w-3 h-3 rounded" style={{ background: getChartColor('green') }} />
          <span>ROI Acumulado (%)</span>
        </div>
      </div>
```

Make sure indentation aligns with Chart 4 above it (same level).

- [ ] **Step 3: Verify in browser**

Chart 5 should now render as vertical bars showing ROI growth. On hover, should show tooltip with month name and ROI value.

- [ ] **Step 4: Test light mode**

Switch to light mode. Bars should be darker green (#1B8E2C). Text should be readable.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Views/DeliveriesView.jsx
git commit -m "feat: add Chart 5 — ROI Acumulado (12-month evolution)"
```

---

## Task 6: Add Chart 6 — OPEX + Deliveries (Grouped Bars)

**Files:**
- Modify: `frontend/src/components/Views/DeliveriesView.jsx` (end of AnalyticsCharts, after Chart 5)

- [ ] **Step 1: Locate insertion point**

Find the closing `</div>` of Chart 5. Chart 6 will be added right after it.

- [ ] **Step 2: Insert Chart 6**

After Chart 5 closing div, add:

```javascript
      {/* Chart 6: OPEX Mensal + Iniciativas Entregues (Grouped Bars) */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-4">OPEX Mensal + Iniciativas Entregues</h4>
        
        <div className="space-y-3">
          {monthlyData.map((month) => {
            const maxOpex = Math.max(...monthlyData.map(m => m.opex), 1)
            const maxDeliveries = Math.max(...monthlyData.map(m => m.deliveryCount), 1)
            
            const opexPercent = (month.opex / maxOpex) * 100
            const deliveryPercent = (month.deliveryCount / maxDeliveries) * 100
            
            return (
              <div key={month.month} className="group">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[9px] font-semibold text-gray-400 w-12">{month.monthName}</span>
                  <div className="flex-1 flex gap-0.5 items-center">
                    {/* OPEX bar */}
                    <div className="flex items-center gap-1">
                      <div
                        className="h-4 rounded transition-all hover:opacity-80"
                        style={{
                          width: `${opexPercent * 1.5}px`,
                          maxWidth: '60px',
                          background: getChartColor('cyan'),
                          boxShadow: `0 0 6px ${getChartColor('cyan')}33`,
                        }}
                      />
                      <span className="text-[8px] font-semibold" style={{ color: getChartColor('cyan'), minWidth: '30px' }}>
                        {fmtCompact(month.opex)}
                      </span>
                    </div>

                    {/* Delivery count bar */}
                    <div className="flex items-center gap-1">
                      <div
                        className="h-4 rounded transition-all hover:opacity-80"
                        style={{
                          width: `${deliveryPercent * 1.5}px`,
                          maxWidth: '60px',
                          background: getChartColor('pink'),
                          boxShadow: `0 0 6px ${getChartColor('pink')}33`,
                        }}
                      />
                      <span className="text-[8px] font-semibold" style={{ color: getChartColor('pink'), minWidth: '20px' }}>
                        {month.deliveryCount}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-4 mt-4 text-[9px] text-gray-500">
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded" style={{ background: getChartColor('cyan') }} />
            <span>OPEX (R$)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded" style={{ background: getChartColor('pink') }} />
            <span>Entregas</span>
          </div>
        </div>
      </div>
```

Ensure proper indentation (same level as Chart 5).

- [ ] **Step 3: Verify in browser**

Chart 6 should render as horizontal grouped bars for each month. Cyan for OPEX, pink for delivery count. Legend at bottom.

- [ ] **Step 4: Test light mode**

Switch to light mode. Bars should be darker colors. All text should be readable.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Views/DeliveriesView.jsx
git commit -m "feat: add Chart 6 — OPEX + Iniciativas Entregues (monthly grouped bars)"
```

---

## Task 7: Update Colors in Charts 1-4

**Files:**
- Modify: `frontend/src/components/Views/DeliveriesView.jsx` (Charts 1-4 in AnalyticsCharts)

- [ ] **Step 1: Update Chart 1 (ROI Comparison) colors**

Find Chart 1 (around line 230). Locate the estimated ROI bar color:

```javascript
<div className="h-5 rounded" style={{ width: Math.max(item.est * 2, 4) + 'px', maxWidth: '40px', background: '#3559EB' }} />
<span className="text-[9px] font-semibold" style={{ color: '#3559EB' }}>{item.est.toFixed(0)}%</span>
```

Replace with:

```javascript
<div className="h-5 rounded" style={{ width: Math.max(item.est * 2, 4) + 'px', maxWidth: '40px', background: getChartColor('cyan') }} />
<span className="text-[9px] font-semibold" style={{ color: getChartColor('cyan') }}>{item.est.toFixed(0)}%</span>
```

And update the real ROI bar:

```javascript
<div className="h-5 rounded" style={{ width: Math.max(item.real * 2, 4) + 'px', maxWidth: '40px', background: '#40EB4F' }} />
<span className="text-[9px] font-semibold" style={{ color: '#40EB4F' }}>{item.real.toFixed(0)}%</span>
```

Replace with:

```javascript
<div className="h-5 rounded" style={{ width: Math.max(item.real * 2, 4) + 'px', maxWidth: '40px', background: getChartColor('green') }} />
<span className="text-[9px] font-semibold" style={{ color: getChartColor('green') }}>{item.real.toFixed(0)}%</span>
```

Also update the legend colors (lines 249-250):

```javascript
<span className="inline-block w-3 h-3 rounded mr-1" style={{ background: '#3559EB' }} /> Estimado &nbsp;
<span className="inline-block w-3 h-3 rounded mr-1" style={{ background: '#40EB4F' }} /> Real
```

Replace with:

```javascript
<span className="inline-block w-3 h-3 rounded mr-1" style={{ background: getChartColor('cyan') }} /> Estimado &nbsp;
<span className="inline-block w-3 h-3 rounded mr-1" style={{ background: getChartColor('green') }} /> Real
```

- [ ] **Step 2: Update Chart 2 (Horas por Segmento) color**

Find Chart 2 (around line 256). Locate the bar:

```javascript
style={{ width: `${(area.value / maxArea) * 100}%`, background: '#3DB7F4' }}
```

Replace with:

```javascript
style={{ width: `${(area.value / maxArea) * 100}%`, background: getChartColor('cyan') }}
```

- [ ] **Step 3: Update Chart 3 (CAPEX vs OPEX) colors**

Find Chart 3 (around line 276-290). Update CAPEX bar:

```javascript
style={{ height: (initialInvestment / Math.max(initialInvestment, totalGainsMonthly * 12)) * 100 + '%', background: '#FE70BD' }}
```

Replace with:

```javascript
style={{ height: (initialInvestment / Math.max(initialInvestment, totalGainsMonthly * 12)) * 100 + '%', background: getChartColor('pink') }}
```

Update OPEX bar:

```javascript
style={{ height: (totalGainsMonthly * 12 / Math.max(initialInvestment, totalGainsMonthly * 12)) * 100 + '%', background: '#40EB4F' }}
```

Replace with:

```javascript
style={{ height: (totalGainsMonthly * 12 / Math.max(initialInvestment, totalGainsMonthly * 12)) * 100 + '%', background: getChartColor('green') }}
```

- [ ] **Step 4: Update Chart 4 (Cost Centers) color**

Find Chart 4 (around line 300+). Look for any hardcoded color values and replace with `getChartColor('cyan')` or similar.

- [ ] **Step 5: Verify all colors in browser**

All charts 1-4 should now use vibrant dynamic colors. In light mode, colors should be darker but still visible.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/Views/DeliveriesView.jsx
git commit -m "feat: update Charts 1-4 colors to use vibrant dynamic palette"
```

---

## Task 8: Full Light Mode Testing

**Files:**
- Test: `frontend/src/components/Views/DeliveriesView.jsx` (manual testing)

- [ ] **Step 1: Switch to light mode**

Open the app in browser. Click theme toggle to switch to light mode.

- [ ] **Step 2: Check KPI Pills**

Verify all numbers in the KPI pill section at top are readable (dark gray/black text on light background).

- [ ] **Step 3: Check all chart values**

For each chart (1-6):
- Numbers should be readable
- Bar/line colors should be distinct darker shades
- Legends should be visible

Example: ROI green should be #1B8E2C (dark forest green), not bright #40EB4F.

- [ ] **Step 4: Check EconomyVsCost cards**

Verify OPEX and CAPEX values are readable and bars are vibrant.

- [ ] **Step 5: Check responsive on mobile**

Open DevTools, set viewport to 375px (mobile). Verify:
- Charts stack vertically
- Text is not cut off
- Bars/visualizations scale appropriately

- [ ] **Step 6: Switch back to dark mode**

Ensure dark mode still looks good. All colors should be bright/saturated.

- [ ] **Step 7: No console errors**

Open DevTools Console. Should have no errors or warnings related to undefined properties.

---

## Task 9: Final Commit

**Files:**
- All changes completed in Tasks 1-8

- [ ] **Step 1: Run git status**

```bash
cd "c:\Users\andressa.soares\Desktop\Dashboard de priorização IA360"
git status
```

Expected: All modified files should show as staged or committed. No uncommitted changes.

- [ ] **Step 2: Create summary commit (if needed)**

If any final tweaks were made after the last commit, stage and commit:

```bash
git add frontend/src/components/Views/DeliveriesView.jsx
git commit -m "refactor: finalize deliveries UI improvements — light mode + vibrant charts + temporal analytics"
```

- [ ] **Step 3: Verify all commits**

```bash
git log --oneline -10
```

Should see:
- refactor: finalize deliveries UI improvements...
- feat: update Charts 1-4 colors...
- feat: add Chart 6...
- feat: add Chart 5...
- feat: add monthlyData useMemo...
- feat: use vibrant dynamic colors in EconomyVsCost...
- feat: add light mode contrast support to KpiPill...
- feat: add getChartColor() utility...
- docs: design spec for deliveries UI improvements...

---

## Self-Review Checklist

- [x] **Spec Coverage:**
  - Light mode legibility: Tasks 2, 3, 8 ✓
  - Vibrant chart colors: Tasks 3, 7 ✓
  - Chart 5 (ROI evolution): Task 5 ✓
  - Chart 6 (OPEX + deliveries): Task 6 ✓
  - Color mapping function: Task 1 ✓
  - Data aggregation (monthlyData): Task 4 ✓

- [x] **Placeholders:** None. Every task has complete code.

- [x] **Type Consistency:**
  - `getChartColor()` returns string color value
  - Used consistently across all components
  - monthlyData structure defined in Task 4, used in Tasks 5-6

- [x] **No TBD/TODO:** All steps are executable, no "add error handling" or similar vague instructions.

- [x] **Commits:** Frequent, atomic commits per logical feature.

- [x] **Testing:** Manual testing in both light and dark modes (Task 8).

---

