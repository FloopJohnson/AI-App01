# Error Index
Last updated: 2025-12-19

This index collects common errors found in the repository, their root causes, and fixes. **Check here before proposing a fix for any error you encounter.**

---

## Quick Reference

| Error | Severity | File(s) | Fix Link |
|-------|----------|---------|----------|
| Hooks called conditionally | 🔴 Critical | `App.jsx` | [#1](#1-rendered-more-hooks-than-during-the-previous-render) |
| Maximum update depth | 🔴 Critical | Multiple modals | [#2](#2-maximum-update-depth-exceeded) |
| setState in useEffect | 🟡 Warning | Multiple components | [#3](#3-setstate-synchronously-within-an-effect) |
| Undefined variables | 🔴 Critical | `SiteModals.jsx` | [#4](#4-variable-is-not-defined) |
| Missing dependencies | 🟡 Warning | Various | [#5](#5-react-hook-has-a-missing-dependency) |
| Unused variables | 🟠 Medium | Throughout | [#6](#6-unused-variable-warnings) |
| Fast refresh warning | 🟡 Warning | Context files | [#7](#7-fast-refresh-only-works-when-exporting-components) |
| Firebase env missing | 🟠 Medium | Runtime | [#8](#8-firebase-environment-variables-missing) |
| Duplicate exports | 🟡 Warning | PDF components | [#9](#9-duplicate-exports) |
| Test failures | 🟠 Medium | `SiteContext.test.jsx` | [#10](#10-test-failure-sitecontexttestjsx) |

---

## React & Runtime Errors

### 1. `Rendered more hooks than during the previous render`

**Severity**: 🔴 Critical — App crashes

**Symptom**: App crashes with red error screen:
```
Error: Rendered more hooks than during the previous render.
```

**Likely Cause**: A Hook (`useState`, `useEffect`, etc.) is called inside an `if` statement or after a `return`.

**Where to Look**:
- `src/App.jsx` (lines 88, 96, 122, 125-142, 199-206, 253-272, 275-334, 678)
- This file has **30+ hook violations** in the current lint output

**Example of the problem**:
```javascript
// Line 88 in App.jsx
if (!isPortal && !isQuoting) return <LoadingScreen />;
const { sites, assets } = useSiteContext(); // Hook AFTER return!
```

**Fix**: Move all Hooks to the **top** of the function, before any early returns:
```javascript
const { sites, assets } = useSiteContext(); // Hook at top
if (!isPortal && !isQuoting) return <LoadingScreen />; // Return after
```

---

### 2. `Maximum update depth exceeded`

**Severity**: 🔴 Critical — Page freezes/crashes

**Symptom**: Browser console shows:
```
Maximum update depth exceeded. This can happen when a component calls setState inside useEffect...
```

**Likely Cause**: Calling `setState` synchronously inside a `useEffect` that depends on that same state.

**Where to Look**:
- `src/components/EditCalibrationModal.jsx` (lines 62, 121, 141, 153)
- `src/components/ManualCalibrationModal.jsx` (lines 63, 84, 96)
- `src/components/ContextWizardModal.jsx` (line 12)
- `src/context/GlobalDataContext.jsx` (line 54)
- `src/components/reports/ServiceReportForm.jsx` (lines 52, 100)

**Fix Options**:

1. **Remove state from dependency array**:
```javascript
// ❌ Causes infinite loop
useEffect(() => {
  setFormData({ ...formData, calculated: calc() });
}, [formData]); // formData in deps!

// ✅ Fixed
useEffect(() => {
  setFormData(prev => ({ ...prev, calculated: calc() }));
}, []); // Or specific dependencies that don't change
```

2. **Add a guard condition**:
```javascript
useEffect(() => {
  if (!formData.calculated) {
    setFormData(prev => ({ ...prev, calculated: calc() }));
  }
}, [formData.calculated]);
```

3. **Use useMemo instead of useEffect + setState**:
```javascript
const calculated = useMemo(() => calc(formData), [formData]);
```

---

### 3. `setState synchronously within an effect`

**Severity**: 🟡 Warning — May cause cascading renders

**Symptom**: ESLint error:
```
Error: Calling setState synchronously within an effect can trigger cascading renders
```

**Likely Cause**: Direct `setState` call in `useEffect` body without event callback.

**Where to Look**:
- `src/components/ContextWizardModal.jsx` (line 12)
- `src/components/EditCalibrationModal.jsx` (lines 62, 121, 141, 153)
- `src/components/ManualCalibrationModal.jsx` (lines 63, 84, 96)
- `src/components/reports/ServiceReportForm.jsx` (lines 52, 100)
- `src/context/GlobalDataContext.jsx` (line 54)

**Example**:
```javascript
// ❌ Problematic
useEffect(() => {
  if (isOpen) {
    setSelectedSiteId('');  // Direct setState in effect
    setSearchTerm('');
  }
}, [isOpen]);
```

**Fix**: Use initializer function in useState, or restructure:
```javascript
// ✅ Option 1: Initialize state based on prop
const [selectedSiteId, setSelectedSiteId] = useState(() => 
  isOpen ? '' : initialValue
);

// ✅ Option 2: Use key to reset component
<Modal key={isOpen ? 'open' : 'closed'} />

// ✅ Option 3: Acceptable if truly needed (add comment)
useEffect(() => {
  if (isOpen) {
    // Intentionally resetting form state when modal opens
    setSelectedSiteId('');
  }
}, [isOpen]);
```

---

### 4. `Variable is not defined`

**Severity**: 🔴 Critical — Build/runtime failure

**Symptom**: ESLint/build error:
```
'labelClass' is not defined (no-undef)
```

**Where to Look**: `src/components/SiteModals.jsx`
- `sectionClass` — lines 55, 281
- `labelClass` — lines 57, 60, 61, 67, 96, 117, 137, 166, 189, 209, 234, 270
- `inputClass` — lines 60, 61, 69, 98, 119, 139, 168, 191, 211, 236, 272, 284, 285, 287, 289, 290, 472, 479

Also in `src/context/SiteContext.jsx`:
- `where` — line 175
- `getDocs` — line 176

**Fix**: Either define the variables or replace with Tailwind classes:
```javascript
// Option 1: Define at top of file
const labelClass = 'block text-sm font-medium text-gray-700';
const inputClass = 'mt-1 block w-full rounded-md border-gray-300 shadow-sm';
const sectionClass = 'space-y-4 p-4';

// Option 2: Import from a shared constants file
import { labelClass, inputClass, sectionClass } from '../constants/uiConstants';

// Option 3: Replace with inline Tailwind (less maintainable)
<label className="block text-sm font-medium text-gray-700">
```

For SiteContext.jsx, add missing imports:
```javascript
import { where, getDocs } from 'firebase/firestore';
```

---

## Build & Lint Errors

### 5. `React Hook has a missing dependency`

**Severity**: 🟡 Warning — May cause stale closures

**Symptom**: ESLint warning:
```
React Hook useEffect has a missing dependency: 'loadPricing'. Either include it or remove the dependency array.
```

**Where to Look**:
- `src/components/inventory/PartCatalogModal.jsx` (lines 55, 126, 189)
- `src/components/inventory/PartPricingTab.jsx` (line 30)
- `src/components/inventory/StockTakeMode.jsx` (line 42)
- `src/components/EditCalibrationModal.jsx` (line 132)
- `src/components/ManualCalibrationModal.jsx` (line 75)
- `src/context/GlobalDataContext.jsx` (line 120)

**Fix Options**:

```javascript
// ❌ Missing dependency
useEffect(() => {
  loadPricing(partId);
}, [partId]); // Missing: loadPricing

// ✅ Option 1: Add to dependencies (if function is stable)
useEffect(() => {
  loadPricing(partId);
}, [partId, loadPricing]);

// ✅ Option 2: Wrap function in useCallback
const loadPricing = useCallback(async (id) => {
  // ...
}, []);

useEffect(() => {
  loadPricing(partId);
}, [partId, loadPricing]);

// ✅ Option 3: Move function inside useEffect
useEffect(() => {
  const loadPricing = async () => {
    // ...
  };
  loadPricing();
}, [partId]);
```

---

### 6. Unused Variable Warnings

**Severity**: 🟠 Medium — Code smell, may block CI

**Symptom**: ESLint error:
```
'handleAddSite' is assigned a value but never used
```

**Where to Look**: Throughout codebase, especially:
- `src/App.jsx` — multiple unused destructured values
- `src/components/` — unused handler functions
- `src/services/` — unused imports

**Fix Options**:

```javascript
// ❌ Unused variable
const { handleAddSite, handleEditSite, handleDeleteSite } = useSiteContext();
// Only using handleEditSite...

// ✅ Option 1: Only destructure what you use
const { handleEditSite } = useSiteContext();

// ✅ Option 2: Prefix with underscore (for intentionally unused)
const { _handleAddSite, handleEditSite, _handleDeleteSite } = useSiteContext();

// ✅ Option 3: Delete the variable entirely if truly unused
```

---

### 7. `Fast refresh only works when exporting components`

**Severity**: 🟡 Warning — HMR may not work optimally

**Symptom**: Console warning:
```
Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components.
```

**Where to Look**:
- `src/context/AuthContext.jsx` (line 8)
- `src/context/GlobalDataContext.jsx` (line 410)

**Cause**: File exports both a component AND a constant/function.

**Fix**: Move constants/helpers to separate files:
```javascript
// ❌ Before: AuthContext.jsx exports component + hook
export const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);
export default function AuthProvider({ children }) { ... }

// ✅ After: Split into two files
// AuthContext.jsx
export const AuthContext = createContext();
export default function AuthProvider({ children }) { ... }

// hooks/useAuth.js
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
export const useAuth = () => useContext(AuthContext);
```

---

## Integration Errors

### 8. Firebase Environment Variables Missing

**Severity**: 🟠 Medium — App runs in demo mode

**Symptom**: Console warning:
```
Using demo config - Firebase environment variables are missing
```
Or authentication failures at runtime.

**Cause**: `.env` file missing or variables not set.

**Fix**:
1. Copy `.env.example` to `.env`
2. Populate all `VITE_FIREBASE_*` keys from Firebase Console
3. Restart dev server (`npm run dev`)

```bash
# Required variables
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXX
```

---

### 9. Duplicate Exports

**Severity**: 🟡 Warning — May cause import confusion

**Symptom**: ESLint warning about ambiguous exports, or:
```
Module has multiple exports with the same name
```

**Where to Look**:
- `src/components/FullDashboardPDFPreview.jsx`
- `src/components/ScheduleChartPDFPreview.jsx`
- `src/components/AssetSpecsPDFPreview.jsx`
- `src/components/MasterListPDFPreview.jsx`
- `src/components/FullDashboardPDF.tsx`
- `src/components/ScheduleChartPDF.tsx`
- `src/components/AssetSpecsPDF.tsx`
- `src/components/MaintenanceReportPDF.tsx`
- `src/App.jsx`

**Cause**: File has both named export AND default export for same component.

**Fix**: Choose one pattern:
```javascript
// ❌ Both exports
export const MyComponent = () => { ... };
export default MyComponent;

// ✅ Option 1: Named export only (preferred for non-lazy imports)
export const MyComponent = () => { ... };

// ✅ Option 2: Default export only (preferred for lazy loading)
export default function MyComponent() { ... }
```

---

## Test Errors

### 10. Test Failure: SiteContext.test.jsx

**Severity**: 🟠 Medium — Test suite failing

**Symptom**: Vitest output:
```
AssertionError: expected undefined to be 'Old Customer' // Object.is equality
```

**Where**: `src/context/__tests__/SiteContext.test.jsx` (line 34)

**Cause**: The `addSite` function is not returning the expected site object structure, or the `customer` field is missing.

**Fix**: Check `SiteContext.jsx` to ensure:
1. `addSite` function correctly adds `customer` field
2. Return value includes the created site object
3. Firestore mock is properly set up

```javascript
// Expected behavior
const addedSite = await addSite({ customer: 'Old Customer', name: 'Test' });
expect(addedSite.customer).toBe('Old Customer'); // This is failing
```

---

## Error Counts Summary

From latest lint run (`npm run lint`):

| Category | Count |
|----------|-------|
| Total Errors | 163 |
| Total Warnings | 8 |
| Hook violations (`react-hooks/rules-of-hooks`) | 30+ |
| Unused variables (`no-unused-vars`) | 50+ |
| Undefined variables (`no-undef`) | 30+ |
| setState in effect | 11 |
| Missing dependencies | 7 |
| Fast refresh issues | 2 |

**Priority order for fixing**:
1. 🔴 `no-undef` errors in SiteModals.jsx and SiteContext.jsx (blocking)
2. 🔴 Hook violations in App.jsx (runtime crashes)
3. 🟡 setState in effect (performance issues)
4. 🟠 Unused variables (code cleanliness)
5. 🟡 Missing dependencies (stale closure risk)

---

## Related Documentation

- [`PROJECT_MAP.md`](./PROJECT_MAP.md) - Repository structure
- [`AGENTS_WIKI.md`](./AGENTS_WIKI.md) - Coding standards and fixes
- [`CLEANUP-REPORT.md`](../CLEANUP-REPORT.md) - Unused code analysis
- [`lint-output.txt`](../lint-output.txt) - Full lint output
