# CV Manager - Feature Implementation

A complete end-to-end CV upload, storage, parsing, and management system built with Next.js, Prisma, and TypeScript.

## Features

### Core Functionality
- **Secure File Upload**: Drag-and-drop CV upload with validation (PDF/DOCX, max 10MB)
- **File Storage**: In-memory storage with ready-to-integrate AWS S3 and Supabase support
- **CV Parsing**: Intelligent extraction of:
  - Professional headline/title
  - Work experience with company, role, location, and description
  - Skills with proficiency levels
  - Education with degree, school, and field of study
- **Audit Trail**: Complete logging of all user actions via ApplicationEvent entries
- **Data Persistence**: Secure storage in SQLite (development) with migration to PostgreSQL
- **Error Handling**: Graceful error states with user-friendly feedback

### User Experience
- Authenticated dashboard with session management
- Upload progress indicator
- Display of latest uploaded CV
- Parsed data rendering with cards and chips
- Controls to re-parse or delete CVs with explicit confirmations
- Responsive design with dark mode support

## Getting Started

### Prerequisites
- Node.js 18+ (for Next.js 16.0.7)
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up the database:
```bash
npm run db:push
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Authentication
1. Navigate to the login page
2. Enter any email address (demo mode - no actual authentication required)
3. Optionally enter a name
4. Click "Sign In"

### Upload a CV
1. From the dashboard, drag and drop a PDF or DOCX file in the upload area
2. Or click to select a file from your computer
3. The system will validate the file type and size
4. Progress indicator shows upload status
5. After successful upload, the system automatically parses the CV

### View Parsed Data
Once a CV is parsed successfully, you'll see:
- **Professional headline** at the top
- **Experience section** with all job entries
- **Skills section** displayed as chips
- **Education section** with degrees and institutions

### Re-parse a CV
If you want to update the parsing:
1. Click the "Reparse" button on the CV document
2. The system will re-extract the information
3. Updated data will be displayed immediately

### Delete a CV
1. Click the "Delete" button on the CV document
2. Confirm the deletion in the popup
3. The CV and all associated data will be permanently removed

## Project Structure

```
/app
  /(dashboard)/
    cv/
      page.tsx           # CV dashboard with upload and display
    layout.tsx          # Protected dashboard layout
  /api
    /auth
      /login
        route.ts        # Login endpoint
    /logout
      route.ts          # Logout endpoint
    /cv
      route.ts          # Upload, retrieve, delete CV endpoints
      /reparse
        route.ts        # Re-parse CV endpoint
    /storage
      /[fileId]
        route.ts        # File serving endpoint
  /auth
    /login
      page.tsx          # Login page UI
  layout.tsx            # Root layout
  page.tsx              # Home page (redirects)
  middleware.ts         # Route protection

/lib
  auth.ts               # Authentication utilities
  db.ts                 # Prisma database client
  storage.ts            # File storage and validation
  cv-parser.ts          # CV parsing logic
  audit.ts              # Event logging

/prisma
  schema.prisma         # Database schema
```

## Database Schema

### Models
- **User**: User accounts with email and name
- **CvDocument**: Uploaded CV file metadata
- **ParsedCv**: Extracted CV data linked to document
- **Experience**: Work experience entries
- **Skill**: Skills from CV
- **Education**: Educational background
- **ApplicationEvent**: Audit log of all operations

## API Endpoints

### POST /api/cv
Upload a new CV. Returns the document and parsed data.

**Request**: Form data with `file` field
**Response**: 
```json
{
  "success": true,
  "cvDocument": { ... },
  "parsedCv": { ... }
}
```

### GET /api/cv
Retrieve the latest CV for the current user.

**Response**:
```json
{
  "cvDocument": { ... }
}
```

### DELETE /api/cv
Delete a CV by ID.

**Query Parameters**: `id` (CV document ID)

### POST /api/cv/reparse
Re-parse an existing CV.

**Request Body**:
```json
{
  "cvDocumentId": "..."
}
```

## Compliance & Security

### Implemented
- ✅ File type and size validation
- ✅ Virus scan stub (ready for production integration)
- ✅ Metadata encryption stub (ready for AES-256-GCM)
- ✅ Audit logging for all operations
- ✅ User authentication and session management
- ✅ Input validation and error handling

### Production Enhancements Needed
- [ ] Integrate real virus scanner (ClamAV, VirusTotal)
- [ ] Implement proper encryption (AES-256-GCM)
- [ ] Set up AWS S3 or Supabase Storage
- [ ] Migrate from SQLite to PostgreSQL
- [ ] Add rate limiting
- [ ] Implement CSRF protection
- [ ] Set up database backups
- [ ] Add monitoring and alerting

## Environment Variables

Create a `.env.local` file (or `.env` for production):

```env
DATABASE_URL="file:./dev.db"
```

For production with PostgreSQL:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/cvmanager"
```

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npm run db:push      # Push Prisma schema changes
npm run db:studio    # Open Prisma Studio
```

## Testing

The application is ready for:
1. Manual testing through the web interface
2. Integration testing of API endpoints
3. Unit testing of parsing logic
4. Load testing of file uploads

## Notes

- The CV parser is a stub implementation that extracts text patterns
- For production, consider integrating:
  - `pdfjs-dist` + `mammoth.js` for better PDF/DOCX parsing
  - LangChain + OpenAI for AI-powered extraction
  - Professional CV parser libraries
- File storage currently uses in-memory Map for development
- All stubs are clearly marked for easy production upgrades

## License

This project is part of the CV Manager system.
