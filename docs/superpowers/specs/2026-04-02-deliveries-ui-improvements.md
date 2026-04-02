---
name: Deliveries View UI Improvements
description: Enhance legibility in light mode and add vibrant colors with new temporal analytics charts
type: implementation
---

# Deliveries View UI Improvements

**Date:** 2026-04-02  
**Status:** Design Approved  
**Priority:** Medium  
**Scope:** DeliveriesView.jsx component

---

## Executive Summary

Improve readability of the Deliveries screen in light mode and enhance visual appeal with PGMais brand colors. Add two new analytics charts showing ROI evolution and OPEX/delivery trends over the past year.

---

## Problems Addressed

1. **Light Mode Legibility Issue (Priority 1)**
   - Numbers and labels in light mode have low contrast
   - Colors like `#3DB7F4`, `#40EB4F`, `#FE70BD` become difficult to read on light backgrounds
   - Exception use case (users prefer dark mode), but must work reliably

2. **Muted Chart Colors (Priority 1)**
   - Current graphs use desaturated, low-intensity colors
   - Doesn't align with vibrant PGMais palette
   - Lacks visual impact and hierarchy

3. **Missing Temporal Analytics (Priority 2)**
   - No year-over-year ROI evolution view
   - No visibility into monthly OPEX trends
   - No count of deliveries over time
   - Users need to understand trend direction and velocity

---

## Solution Design

### 1. Light Mode Color Adjustments

**Principle:** Maintain PGMais identity while ensuring WCAG AA contrast in light mode.

**Color Mapping:**

| Component | Dark Mode | Light Mode | Purpose |
|-----------|-----------|-----------|---------|
| ROI/Positive | `#40EB4F` | `#1B8E2C` | Growth indicator, high contrast on light |
| Cyan/Primary | `#3DB7F4` | `#0066CC` | Primary accent, saturated dark blue |
| Pink/Secondary | `#FE70BD` | `#C81E7E` | Secondary accent, deeper magenta |
| Text (numbers) | `text-white/90` | `text-gray-900` | Critical data, maximum contrast |
| Text (labels) | `text-gray-400` | `text-gray-600` | Secondary info, readable |

**Implementation:** Add conditional Tailwind classes using `dark:` prefix:
```jsx
// Example for a number value
<span className="dark:text-white/90 text-gray-900 font-bold">
  {formattedValue}
</span>

// Example for chart color
const chartColor = isDarkMode ? '#3DB7F4' : '#0066CC';
```

---

### 2. Enhanced Chart Colors (AnalyticsCharts Component)

Apply vibrant colors to existing 4 charts + add 2 new ones.

**Charts 1-4 (Updates):**
- **Chart 1 (ROI Comparison):** Increase saturation of blue/green bars
- **Chart 2 (Horas por Segmento):** Replace faded cyan with vibrant `#3DB7F4` (dark) / `#0066CC` (light)
- **Chart 3 (CAPEX vs OPEX):** Keep `#FE70BD` + `#40EB4F` (already vibrant)
- **Chart 4 (Cost Centers):** Add color variety (rotate through palette or gradient)

---

### 3. New Temporal Analytics Charts

#### **Chart 5: ROI Acumulado (Annual Evolution)**

**Type:** Line chart  
**Data Source:** Group `items` by completion month, accumulate ROI  
**Visualization:**
- X-axis: Months (Jan—Dec of last year)
- Y-axis: Cumulative ROI percentage
- Line color: `#40EB4F` (dark) / `#1B8E2C` (light)
- Interactive: Tooltip on hover shows month + cumulative ROI value

**Algorithm:**
```
For each item in items:
  If item is completed (isCompleted(item) === true):
    Extract completion month from getResolutionDate(item)
    Accumulate ROI by month
    Calculate running total (cumulative) across all months
```

Note: Use existing utility functions `isCompleted()` and `getResolutionDate()` from `initiativeInsights.js`

**Rendering:** Simple SVG or CSS-based bar/line (no external chart library, consistent with existing style)

---

#### **Chart 6: OPEX Mensal + Iniciativas Entregues**

**Type:** Dual-bar chart (grouped)  
**Data Source:** Group `items` by completion month, sum OPEX + count deliveries  
**Visualization:**
- X-axis: Months (Jan—Dec of last year)
- Y-axis Left: Total OPEX (R$) — color `#3DB7F4` (dark) / `#0066CC` (light)
- Y-axis Right: Number of deliveries — color `#FE70BD` (dark) / `#C81E7E` (light)
- Bar width: Responsive, ~40px per month
- Interactive: Tooltip shows month + both values

**Algorithm:**
```
For each item in items:
  If item is completed:
    Extract completion month
    Add item.gains (OPEX) to month total
    Increment delivery count for month
```

**Rendering:** Bars grouped by month, SVG-based (consistent with Chart 3)

---

## Data Flow

**Input:** Existing `items` array (from parent component)

**Transformation (in useMemo):**
```javascript
const monthlyData = useMemo(() => {
  const months = Array(12).fill(null).map((_, i) => ({
    month: i,
    roiAccumulated: 0,
    opex: 0,
    deliveryCount: 0,
  }))
  
  items.forEach(item => {
    if (isCompleted(item)) {
      const date = getResolutionDate(item)
      if (date) {
        const monthIndex = date.getMonth()
        // Sum OPEX and count deliveries by month
        months[monthIndex].opex += item.metrics?.monthly_gains || 0
        months[monthIndex].deliveryCount += 1
      }
    }
  })
  
  // Calculate accumulated ROI across months
  let accumulated = 0
  months.forEach(m => {
    const monthlyROI = m.opex / Math.max(totalInitialInvestment / 12, 1) * 100
    accumulated += monthlyROI
    m.roiAccumulated = accumulated
  })
  
  return months
}, [items])
```

**Output:** Array of 12 month objects with `month`, `roiAccumulated`, `opex`, `deliveryCount`

---

## Component Changes

### **DeliveriesView.jsx**

1. **Add color utility function** (top of file):
```javascript
function getChartColor(colorKey, isDark = true) {
  const colors = {
    green: isDark ? '#40EB4F' : '#1B8E2C',
    cyan: isDark ? '#3DB7F4' : '#0066CC',
    pink: isDark ? '#FE70BD' : '#C81E7E',
  }
  return colors[colorKey]
}
```

2. **Update KpiPill component** — add light mode text class:
```jsx
<div className="text-[15px] font-bold tracking-tight dark:text-white/90 text-gray-900">
  {value}
</div>
```

3. **Update AnalyticsCharts component**:
   - Add `monthlyData` calculation via useMemo
   - Update Charts 1-4 colors to use `getChartColor()`
   - Add Chart 5 (ROI line) after existing 4 charts
   - Add Chart 6 (OPEX + deliveries bars) after Chart 5

4. **Update EconomyVsCost component** — increase color saturation:
```jsx
<span className="text-[#1B8E2C]">{fmtCompact(item.gains)}</span>  // Light mode
style={{ color: getChartColor('green') }}  // Dynamic
```

---

## Visual Hierarchy & Layout

**AnalyticsCharts grid (existing):**
```
┌─ Chart 1: ROI Comparison (lg:col-span-1) ─┐
├─ Chart 2: Hours by Segment (lg:col-span-1) ┤
├─ Chart 3: CAPEX vs OPEX (lg:col-span-1)  ┤
└─ Chart 4: Cost Centers (lg:col-span-1)    ┘
```

**After changes:**
```
┌─ Chart 1: ROI Comparison (lg:col-span-1) ─┐
├─ Chart 2: Hours by Segment (lg:col-span-1) ┤
├─ Chart 3: CAPEX vs OPEX (lg:col-span-1)  ┤
├─ Chart 4: Cost Centers (lg:col-span-1)    ┤
├─ Chart 5: ROI Evolution (lg:col-span-1)   ┤  [NEW]
└─ Chart 6: OPEX + Deliveries (lg:col-span-1) ┘ [NEW]
```

Maintain `xl:grid-cols-2` for larger screens.

---

## Success Criteria

✅ Light mode: All numbers readable (ratio ≥ 4.5:1 contrast)  
✅ Chart colors: Vibrant, aligned with PGMais palette  
✅ Chart 5: Shows year-long ROI trend clearly  
✅ Chart 6: Shows monthly OPEX + delivery velocity  
✅ Responsive: Charts stack properly on mobile  
✅ No breaking changes to existing data/props  

---

## Technical Constraints & Notes

- **No new dependencies:** Use only Tailwind + existing utilities (useMemo, useState)
- **Data availability:** Assumes `items` objects have completion date metadata (must validate in implementation)
- **Responsive:** Grid-based layout already responsive; ensure charts scale on mobile
- **Performance:** Use `useMemo` to prevent re-rendering on every parent update

---

## Testing Strategy

- [ ] Verify light mode contrast with browser DevTools or contrast checker
- [ ] Test Charts 5 & 6 with sample data (mock if data unavailable)
- [ ] Responsive test: 320px, 768px, 1280px viewports
- [ ] Check tooltip hover interactions
- [ ] Dark mode regression: ensure no color degradation

---

## Future Enhancements (Out of Scope)

- Predictions for next 3 months (deferred per user request)
- Drill-down interactivity (click month → see initiatives)
- Export charts as PDF/PNG
- Custom date range picker

---

## Rollout Plan

1. Implement color adjustments (low risk, high impact)
2. Add Charts 5 & 6 with mock data
3. Integrate real data source
4. QA across browsers + themes
5. Deploy to staging
6. User acceptance test
7. Merge to main

