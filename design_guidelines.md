# TaXEaze - Receipt Management Application Design Guidelines

## Design Approach
**System Selected**: Material Design 3 with financial SaaS adaptations
**Justification**: Tax preparation demands data clarity, professional trustworthiness, and efficient workflows. Material Design's elevation system, structured grids, and robust component library align perfectly with financial application requirements.

**Reference Inspiration**: QuickBooks (data organization) + Expensify (receipt scanning) + Stripe Dashboard (clean data presentation)

## Typography System
- **Primary Font**: Inter (via Google Fonts)
- **Hierarchy**:
  - H1: 32px/40px, Medium weight - Page titles
  - H2: 24px/32px, Medium weight - Section headers
  - H3: 18px/24px, Medium weight - Card titles
  - Body: 16px/24px, Regular - Main content
  - Small: 14px/20px, Regular - Metadata, labels
  - Caption: 12px/16px, Regular - Timestamps, helper text

## Layout System
**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16 (p-2, m-4, gap-6, py-8, space-y-12, p-16)
- Consistent 4px grid system throughout
- Container max-width: max-w-7xl with px-6 padding
- Card padding: p-6 for content cards, p-8 for feature sections
- Section spacing: py-12 for vertical rhythm

## Core Components

### Navigation
**Top Navigation Bar**: Fixed header with logo left, primary actions (Upload Receipt, New Report) right, user menu far right. Height: h-16. Shadow: subtle drop shadow for elevation.

**Sidebar Navigation**: Left sidebar (w-64) with collapsible menu. Sections: Dashboard, Receipts, Categories, Reports, Settings. Active state with subtle background, left border accent.

### Dashboard Layout
**Grid System**: 12-column responsive grid
- Top Stats Cards: 4-column grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
  - Total Receipts, Monthly Spending, Categories Used, Upcoming Tax Deadline
  - Each card: Icon top-left, large number, label, trend indicator
  
- Recent Receipts Section: 2-column split (lg:grid-cols-3, 2/3 for list, 1/3 for quick filters)
  - Table view with columns: Date, Vendor, Category, Amount, Owner, Actions
  - Sortable headers, row hover states

- Monthly Breakdown Chart: Full-width card with category breakdown visualization
  - Bar chart showing spending by category
  - Toggle between current month, last 3 months, YTD

### Receipt Management
**Receipt Upload Area**: Prominent drag-and-drop zone
- Dashed border, centered upload icon and text
- "Drop receipts here or click to browse" messaging
- Accepted formats display (JPG, PNG, PDF)
- Multiple file upload support with progress indicators

**Receipt Cards**: Grid layout (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Receipt thumbnail image top
- Vendor name (H3), date, amount
- Category badge, owner tag
- Actions: View Details, Edit, Delete (icon buttons)

**Receipt Detail Modal**: Full-screen overlay
- Left: Receipt image preview with zoom controls
- Right: Editable form (Vendor, Amount, Date, Category dropdown, Owner dropdown, Notes textarea)
- OCR-extracted data with confidence indicators
- Save/Cancel actions bottom-right

### Reports Section
**Report Builder**: Two-column layout
- Left (1/3): Filter panel with Date Range picker, Category multi-select, Owner filter, Export format options
- Right (2/3): Preview area showing tabular data and monthly breakdown charts
- Generate Report button (primary, large) at panel bottom

**Monthly Category Breakdown**: 
- Accordion sections for each month
- Expandable rows showing: Category name, Item count, Total amount, Percentage of monthly total
- Summary footer with monthly totals

### Forms & Inputs
**Consistent Form Pattern**:
- Labels: 14px, medium weight, mb-2
- Text inputs: h-12, rounded-lg, border with focus ring
- Dropdowns: Custom styled with chevron icons
- Date pickers: Calendar popup with month/year navigation
- Textareas: min-h-32, resize-vertical

**Button System**:
- Primary: Solid fill, h-10/h-12, rounded-lg, medium weight text
- Secondary: Outlined variant
- Icon buttons: Square, h-10 w-10, rounded-lg
- All buttons have subtle hover lift effect

### Data Visualization
**Chart Components**: Use Chart.js or similar
- Bar charts for category comparisons
- Line charts for spending trends over time
- Donut charts for category proportions
- Consistent axis labeling, gridlines, tooltips

### Cards & Containers
**Standard Card**: Rounded-xl, subtle shadow, p-6, white background (when colored later)
**Stat Cards**: Larger padding (p-8), bold numbers, trend arrows
**Table Cards**: Zero internal padding, rounded corners, overflow handling

## Images
**Hero Image**: Not applicable - this is a dashboard application, not a marketing site. The main interface opens directly to the functional dashboard.

**Receipt Thumbnails**: Throughout receipt management views - actual scanned receipt images displayed at 200x250px in grid views, full-size in detail modal.

**Empty States**: Illustration for "No receipts uploaded yet" state - simple, professional iconography showing upload action.

## Accessibility
- All interactive elements have min-height of h-10 (40px) for touch targets
- Form inputs maintain consistent height (h-12)
- Focus states visible on all interactive elements
- ARIA labels on icon-only buttons
- Color-independent status indicators (use icons + text)
- Keyboard navigation support throughout

## Responsive Behavior
- Mobile: Single column, collapsible sidebar becomes slide-out drawer, stack all grid layouts
- Tablet: 2-column grids, visible sidebar
- Desktop: Full 3-4 column grids, persistent sidebar, optimal table widths

**Critical Feature**: Multi-user tagging visible in all receipt views via owner badges. Monthly breakdowns always expandable for detailed category analysis.