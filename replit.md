# TaXEaze - Receipt Management Application

## Overview

TaXEaze is a full-stack expense tracking and receipt management application designed to help users organize receipts for tax preparation. Users can upload receipt images, which are automatically analyzed using AI (OpenAI Vision) to extract merchant name, date, amount, and category. The application provides dashboard visualizations, filtering/search capabilities, and exportable tax reports.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for page transitions and micro-interactions
- **Charts**: Recharts for expense visualization (bar charts, pie charts)
- **File Uploads**: Uppy with AWS S3 plugin for presigned URL uploads

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Design**: REST endpoints defined in `shared/routes.ts` with Zod schema validation
- **Build**: Vite for frontend bundling, esbuild for server bundling

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` defines the `receipts` table
- **Migrations**: Drizzle Kit for schema management (`drizzle-kit push`)
- **Object Storage**: Google Cloud Storage via Replit's Object Storage integration for receipt image uploads

### Key Data Models
- **Receipts**: Stores image URL, merchant name, date, amount (numeric), tax, category, and description/notes
- **Categories**: Predefined list including Food & Dining, Travel, Lodging, Utilities, etc.
- **Multi-User**: Supports 2 people (user1, user2) with separate expense tracking via UserContext

### API Structure
All API routes are defined in `shared/routes.ts` with typed inputs/outputs:
- `GET /api/receipts` - List receipts with optional filters (search, category, date range, userId)
- `GET /api/receipts/:id` - Get single receipt
- `POST /api/receipts` - Create new receipt
- `PUT /api/receipts/:id` - Update receipt (edit functionality)
- `DELETE /api/receipts/:id` - Delete receipt
- `GET /api/receipts/summary` - Get expense statistics with tax totals
- `POST /api/receipts/analyze` - AI-powered receipt image analysis
- `POST /api/uploads/request-url` - Get presigned URL for file upload
- `GET /api/receipts/export` - Export receipts to Excel with Tax and Total columns
- `GET /api/backup` - Download all receipts as JSON backup
- `POST /api/restore` - Import receipts from JSON backup file

### Key Features
- **Edit Receipts**: Click any receipt card to open edit modal with all fields
- **Date Range Filtering**: Filter receipts by custom start/end dates
- **Tax Calculation**: Auto-calculates 5% tax if not on receipt (can be manually overridden)
- **Year-over-Year Comparison**: Dashboard shows spending trends vs previous year
- **Backup/Restore**: Download/upload receipt data as JSON files
- **Notes Field**: Prominent notes display on receipt cards and in edit modal

### AI Integration
- Uses OpenAI Vision API (via Replit AI Integrations) to analyze receipt images
- Extracts: merchant name, date, amount, category, and description
- Configuration via `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` environment variables

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management

### Cloud Storage
- **Google Cloud Storage**: Receipt image storage via Replit Object Storage integration
- Presigned URL flow for secure direct uploads from browser

### AI Services
- **OpenAI API**: Vision model for receipt analysis, accessed through Replit AI Integrations proxy
- Environment variables: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`

### UI Component Dependencies
- **Radix UI**: Headless UI primitives for accessible components
- **Lucide React**: Icon library
- **date-fns**: Date formatting and manipulation
- **class-variance-authority**: Component variant management
- **tailwind-merge/clsx**: CSS class utilities