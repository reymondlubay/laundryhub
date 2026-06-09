# Web responsive guidelines

LaundryHub web uses MUI breakpoints for mobile/tablet browser support.

## Breakpoints

| Token | Min width | Use |
|-------|-----------|-----|
| `xs` | 0 | Phones |
| `sm` | 600px | Large phones |
| `md` | 900px | Tablets — sidebar becomes persistent |
| `lg` | 1200px | Desktop |
| `xl` | 1536px | Large desktop |

## Layout

- Below `md`: sidebar is an overlay drawer (`react-pro-sidebar` `breakPoint="md"`).
- Hamburger in the header opens/closes the mobile drawer.
- `LiveClock` is hidden below `sm` to save header space.

## Tables

Use `ResponsiveTableContainer` instead of raw MUI `TableContainer`. It enables horizontal scroll inside the table region only.

## Filters

Stack filter controls vertically on `xs` using MUI `Grid` `size={{ xs: 12 }}` or `Stack direction={{ xs: 'column', sm: 'row' }}`.

## Modals

Use `fullScreen={useMediaQuery(theme.breakpoints.down('sm'))}` on large dialogs (see `TransactionModal`).

## Touch targets

Interactive controls should be at least **44×44px** on mobile.

## Testing viewports

Manual check at **320px**, **375px**, **768px**, and **1024px** before release.
