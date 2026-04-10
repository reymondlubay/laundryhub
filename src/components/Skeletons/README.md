# Skeleton Loading Components

This directory contains reusable skeleton loader components for better UX during data fetching.

## Components Available

### Table Skeletons

- **`TableSkeleton`** - Shows placeholder rows for table data
  - Props: `columns` (number), `rows` (default: 5), `height` (default: 40)
  - Used in: Customer, Users, Database pages

- **`TableHeaderSkeleton`** - Shows placeholder column headers
  - Props: `columns` (number)
  - Used alongside TableSkeleton

### Card Skeletons

- **`CardSkeleton`** - Individual card placeholder
  - Props: `variant` ("title" | "metric", default: "metric")
  - Used in: Dashboard metrics

- **`DashboardCardsSkeleton`** - Grid of multiple card skeletons
  - Props: `count` (default: 6)
  - Used in: Dashboard page

### Form Skeletons

- **`FormFieldSkeleton`** - Multiple form field placeholders
  - Props: `rows` (default: 3), `fullWidth` (default: true)
  - Used in: Login page, modals

- **`ModalContentSkeleton`** - Complete modal dialog skeleton
  - Props: `fields` (default: 4)
  - Includes title, form fields, and action buttons

### Utility Skeletons

- **`ListItemSkeleton`** - Skeleton for list items
  - Props: `rows` (default: 3), `avatar` (default: false)

- **`PaperSkeleton`** - Generic skeleton in Paper component
  - Props: `height` (default: 200), `rows` (default: 4)

- **`ButtonSkeleton`** - Button placeholder
  - Props: `width` (default: 100)

## Integration Examples

### Table Loading
```tsx
import { TableSkeleton, TableHeaderSkeleton } from "./Skeletons/SkeletonComponents";

{loading ? (
  <Table size="small">
    <TableHeaderSkeleton columns={5} />
    <TableSkeleton columns={5} rows={8} />
  </Table>
) : (
  // Real table content
)}
```

### Dashboard Cards
```tsx
import { DashboardCardsSkeleton } from "./Skeletons/SkeletonComponents";

{loading ? (
  <DashboardCardsSkeleton count={6} />
) : (
  // Real cards
)}
```

### Form Loading
```tsx
import { FormFieldSkeleton } from "./Skeletons/SkeletonComponents";

{loading ? (
  <FormFieldSkeleton rows={3} />
) : (
  // Real form
)}
```

## Implemented Pages

✅ **Dashboard** - Card skeletons + table skeletons  
✅ **Customer Management** - Table skeleton  
✅ **Users Management** - Table skeleton  
✅ **Database/Backup Settings** - Table skeleton  
✅ **Login Page** - Form field skeletons  

## Features

- **Theme Aware**: Skeletons adapt to dark/light mode
- **Reusable**: Can be easily imported across components
- **Customizable**: Props allow control over rows, columns, widths
- **Performance**: Uses MUI's native Skeleton component (optimized)
- **Accessibility**: Maintains semantic structure

## Usage Best Practices

1. Use `DashboardCardsSkeleton` for metric cards
2. Use `TableSkeleton + TableHeaderSkeleton` for data tables
3. Use `FormFieldSkeleton` for form loading states
4. Match skeleton columns/fields to actual content
5. Keep loading duration short (< 3 seconds ideal)
