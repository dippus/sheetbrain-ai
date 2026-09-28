# 10 — Univer Office SDK Integration Plan

> **Reference Repository**: `https://github.com/dream-num/univer`  
> **Traceability**: Fulfills `REQ-F-004`, `REQ-NF-004`.

---

## 1. Univer Architectural Overview

Univer is an open-source, canvas-rendered office document runtime. It separates:
* **Core Runtime** (`@univerjs/core`): Headless workbook, worksheet, and command architecture.
* **Sheet Plugin** (`@univerjs/sheets`): Spreadsheet-specific models, cell ranges, and formulas.
* **UI Plugin** (`@univerjs/ui`, `@univerjs/design`): Canvas rendering, formula bar, context menus, and toolbar.

---

## 2. Mandatory SSR Safety Implementation

Because Univer accesses `window`, `document`, and canvas APIs directly, importing it during server-side rendering causes Node.js compilation crashes.

### Standard Implementation Pattern:
```tsx
// components/spreadsheet/UniverSheet.tsx
'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const UniverCanvasCore = dynamic(
  () => import('./UniverCanvasCore'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-400">
        Loading Spreadsheet Canvas...
      </div>
    ),
  }
);

export default function UniverSheet(props: any) {
  return <UniverCanvasCore {...props} />;
}
```

---

## 3. Data Ingestion & Facade API Mapping

When SheetBrain agents produce a `SheetBrainWorkbook` JSON, the adapter maps it into Univer's snapshot format:

```typescript
// lib/univer/adapter.ts
export function transformToUniverSnapshot(data: SheetBrainWorkbook) {
  return {
    id: data.id,
    appVersion: '3.0.0',
    name: data.title,
    sheets: {
      [data.sheets[0].id]: {
        id: data.sheets[0].id,
        name: data.sheets[0].name,
        cellData: transformCells(data.sheets[0].cellData),
        rowCount: data.sheets[0].rowCount,
        columnCount: data.sheets[0].columnCount,
      }
    }
  };
}
```
