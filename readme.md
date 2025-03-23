# IP Intelligence Platform

## Overview

The IP Intelligence Platform is a web-based application that enriches IP address data with domain information, company details, and geolocation data. It supports both batch processing through CSV file uploads and single IP lookups via a REST API.

## System Architecture

The application follows a client-server architecture with a React frontend, Express backend, and PostgreSQL database for data persistence. The system is designed to handle large datasets efficiently with features like auto-saving and partial result downloads.

```
┌─────────────────────────────────────┐
│           Client Browser            │
└───────────────────┬─────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│            React Frontend           │
│  ┌─────────────┐    ┌─────────────┐ │
│  │   Upload    │    │   Results   │ │
│  │  Component  │    │  Component  │ │
│  └─────────────┘    └─────────────┘ │
└───────────────────┬─────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│           Express Backend           │
│  ┌─────────────┐    ┌─────────────┐ │
│  │  REST API   │    │IP Enrichment│ │
│  │  Endpoints  │◄───►   Service   │ │
│  └─────────────┘    └─────────────┘ │
│  ┌─────────────┐    ┌─────────────┐ │
│  │ CSV Parser  │    │ Job Manager │ │
│  └─────────────┘    └─────────────┘ │
└───────────────────┬─────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│         PostgreSQL Database         │
│  ┌─────────────┐    ┌─────────────┐ │
│  │    Users    │    │ Enrichment  │ │
│  │    Table    │    │  Jobs Table │ │
│  └─────────────┘    └─────────────┘ │
│  ┌───────────────────────────────┐  │
│  │    Enrichment Results Table   │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Core Components

1. **Frontend** - React-based SPA with progressive workflow steps
   - Upload Section: Handles file validation and upload
   - Config Section: Configures enrichment options
   - Processing Section: Shows real-time progress
   - Results Section: Displays and exports enriched data

2. **Backend** - Express server with RESTful API endpoints
   - REST API Layer: Handles HTTP requests and responses
   - IP Enrichment Service: Core intelligence engine
   - CSV Processing: Specialized CSV handling
   - Job Manager: Orchestrates long-running jobs

3. **Database** - PostgreSQL for storing job information and enrichment results
   - Users: Authentication and user management
   - IP Enrichment Jobs: Metadata about processing jobs
   - IP Enrichment Results: Individual result records

## Technical Stack

### Frontend
- React with TypeScript
- TanStack Query for data fetching
- ShadCN/UI components with Tailwind CSS for styling
- Wouter for routing
- React Hook Form for form handling

### Backend
- Node.js with Express
- TypeScript for type safety
- Multer for file uploads
- Drizzle ORM with PostgreSQL

### Data Processing
- CSV parsing with papaparse
- CSV generation with csv-stringify
- Custom IP validation and enrichment logic

## Database Schema

The application uses three main data tables:

1. **users** - Stores user information
   - id (primary key)
   - username
   - password (hashed)
   - email
   - createdAt

2. **ip_enrichment_jobs** - Stores job metadata
   - id (primary key)
   - fileName
   - originalFileName
   - totalIPs
   - processedIPs
   - successfulIPs
   - failedIPs
   - filteredIPs
   - status ('pending', 'processing', 'completed', 'failed')
   - createdAt
   - completedAt
   - userId (foreign key to users)
   - error
   - ipColumnName
   - includeGeolocation
   - includeDomain
   - includeCompany
   - includeNetwork
   - partialResultsAvailable
   - processingCheckpoint

3. **ip_enrichment_results** - Stores individual results
   - id (primary key)
   - jobId (foreign key to ip_enrichment_jobs)
   - rowIndex
   - originalData (JSON)
   - enrichmentData (JSON)
   - processed
   - success
   - error
   - createdAt
   - updatedAt

## Core Workflows

### 1. Batch IP Enrichment Process

The following diagram illustrates the end-to-end data flow for batch processing:

```
┌──────────┐     ┌──────────────┐     ┌───────────────┐
│  Upload  │     │  Configure   │     │   Process     │
│   CSV    │────►│  Enrichment  │────►│    Data       │
│          │     │   Options    │     │               │
└──────────┘     └──────────────┘     └───────┬───────┘
                                              │
                                              ▼
┌──────────┐     ┌──────────────┐     ┌───────────────┐
│ Download │     │   Preview    │     │ Store Results │
│ Results  │◄────│   Results    │◄────│  in Database  │
│          │     │              │     │               │
└──────────┘     └──────────────┘     └───────────────┘
```

Detailed process steps:

1. **File Upload**:
   - User uploads a CSV file through the frontend
   - File is validated for proper format
   - Headers are extracted and presented to the user
   - CSV row count is estimated for job sizing

2. **Enrichment Configuration**:
   - User selects which column contains IP addresses
   - User configures enrichment options (geolocation, domain, company info)
   - Job is created with 'pending' status

3. **Processing**:
   - Backend parses the CSV file row-by-row
   - For each row, IP data is enriched through external IP intelligence services
   - Common ISP IPs are identified and flagged (Telstra, Comcast, etc.)
   - Results are saved to the database in batches of 100 records
   - Real-time progress updates are sent to the frontend

4. **Results Handling**:
   - Processed data is available for preview in the UI
   - Full results can be downloaded as a CSV file
   - Filtered version (excluding common ISP IPs) is available

### 2. Single IP Lookup API

The following diagram illustrates the API lookup flow:

```
┌───────────┐     ┌──────────────┐     ┌───────────────┐
│ API       │     │ Validate     │     │ Perform       │
│ Request   │────►│ IP Address   │────►│ IP Lookup     │
│           │     │              │     │               │
└───────────┘     └──────────────┘     └───────┬───────┘
                                               │
                                               ▼
                  ┌──────────────┐     ┌───────────────┐
                  │ Format JSON  │     │ Enrich with   │
                  │ Response     │◄────│ Additional    │
                  │              │     │ Data          │
                  └──────────────┘     └───────────────┘
```

Detailed process steps:

1. **Request Handling**:
   - API endpoint `/api/lookup` accepts IP address parameter
   - Validation checks for proper IP format

2. **IP Enrichment**:
   - Geolocation data is fetched (country, city, coordinates)
   - Domain name is resolved through reverse DNS lookup
   - Organization data is determined (ISP, ASN, company)
   - ISP filtering logic is applied to identify common consumer IPs

3. **Response Formatting**:
   - JSON response with all enrichment data
   - Error handling for invalid IPs or service issues

Example API Response:
```json
{
  "ip": "8.8.8.8",
  "domain": "dns.google",
  "company": "Google LLC",
  "country": "United States",
  "city": "Mountain View",
  "region": "California",
  "latitude": 37.4056,
  "longitude": -122.0775,
  "isp": "Google LLC",
  "asn": "AS15169",
  "ispFiltered": false,
  "success": true
}
```

## IP Enrichment Details

The IP enrichment service performs several key functions:

1. **IP Validation** - Ensures the input is a valid IPv4 or IPv6 address
2. **Geolocation Lookup** - Determines country, city, region, and coordinates
3. **Domain Resolution** - Performs reverse DNS lookup to find domain names
4. **Organization Identification** - Determines the company or ISP that owns the IP
5. **ISP Filtering** - Identifies and flags common consumer ISP IPs

### ISP Filtering Logic

The application uses a combination of ISP name matching and network range checks to identify common consumer ISPs. This filtering helps focus analysis on business and organizational IPs rather than residential connections.

Common ISPs that are flagged include:
- Comcast
- Verizon
- AT&T
- Time Warner
- Cox Communications
- CenturyLink
- Telstra
- BT
- Other major residential providers

## Auto-Save Functionality

To ensure data resilience during long-running jobs, the application implements an auto-save mechanism:

1. Results are saved in batches of 100 records
2. A processing checkpoint is maintained in the job record
3. If processing fails, it can be resumed from the last checkpoint
4. Partial results are available for download at any time

## API Integration

### REST API Endpoints

- `POST /api/upload` - Upload a CSV file for processing
- `POST /api/enrich` - Create and start an enrichment job
- `GET /api/jobs/:id` - Get job status and metadata
- `GET /api/jobs/:id/recent-results` - Get results since a specific index
- `GET /api/jobs` - List all enrichment jobs
- `GET /api/jobs/:id/preview` - Get a paginated preview of results
- `GET /api/jobs/:id/download` - Download complete or partial results
- `GET /api/lookup` - Single IP lookup endpoint

### BigQuery Integration

The IP Intelligence Platform can be integrated with BigQuery using the BigQuery Connection feature. This allows SQL queries to directly call the IP enrichment API and incorporate the results into analytical workflows.

#### BigQuery Remote Function Integration

```
┌─────────────┐     ┌────────────────┐     ┌────────────────┐
│  BigQuery   │     │   BigQuery     │     │  IP Enrichment │
│   Query     │────►│   Connection   │────►│     API        │
│             │     │                │     │                │
└─────────────┘     └────────────────┘     └────────┬───────┘
                                                    │
                    ┌────────────────┐     ┌────────▼───────┐
                    │  SQL Results   │     │    JSON        │
                    │  with IP Data  │◄────│   Response     │
                    │                │     │                │
                    └────────────────┘     └────────────────┘
```

To implement the integration:

1. Create a BigQuery Connection to Cloud Resource
2. Create a remote function that uses the connection to call the IP API
3. Invoke the function in SQL queries to enrich IP data

Example SQL for setting up the connection and function:

```sql
-- Step 1: Create a connection (one-time setup)
CREATE OR REPLACE CONNECTION `your_project.your_region.your_connection`
OPTIONS(
  location = 'your_region',
  connection_type = 'CLOUD_RESOURCE'
);

-- Step 2: Create the remote function using the connection
CREATE OR REPLACE FUNCTION `your_project.your_dataset.get_ip_intelligence`(ip STRING)
RETURNS STRUCT<
  country STRING,
  city STRING,
  region STRING,
  latitude FLOAT64,
  longitude FLOAT64,
  company STRING,
  isp STRING,
  asn STRING,
  ispFiltered BOOL,
  domain STRING,
  success BOOL
>
REMOTE WITH CONNECTION `your_project.your_region.your_connection`
OPTIONS(
  endpoint = 'https://ip-enrich.rittmananalytics.com/api/lookup',
  user_defined_context = [("ip", ip)],
  max_batching_rows = 50
);
```

**Important Note:** JavaScript UDFs in BigQuery cannot make external network requests due to sandbox restrictions. The BigQuery Connection approach is the only supported method for calling external APIs.

## Performance Considerations

The application is designed for efficient handling of large datasets:

1. **Stream Processing** - CSV files are processed as streams rather than loaded entirely in memory
2. **Batch Database Operations** - Results are inserted in batches to reduce database load
3. **Asynchronous Processing** - Long-running jobs run asynchronously with progress tracking
4. **Pagination** - Result previews use pagination to handle large result sets
5. **Partial Downloads** - Support for downloading partial results during processing

## Error Handling

The application implements comprehensive error handling:

1. **Job-level Errors** - Captured in the job record with meaningful messages
2. **Row-level Errors** - Individual row failures don't stop the entire job
3. **API Error Responses** - Structured error responses with appropriate HTTP status codes
4. **Client-side Validation** - Prevents invalid inputs before server requests
5. **Service Resilience** - External service failures are gracefully handled

## Security Considerations

1. **Input Validation** - All user inputs are validated before processing
2. **Rate Limiting** - API endpoints are protected against abuse
3. **Data Sanitization** - User-provided data is sanitized before database storage
4. **Error Handling** - Errors are logged without exposing sensitive information

## Deployment

The application is designed to be deployed to production using Replit Deployments, making it accessible at the domain: `ip-enrich.rittmananalytics.com`

## Development and Extension

The codebase is structured to facilitate extension and modification:

1. **Modular Architecture** - Core functions are separated into distinct modules
2. **Shared Type Definitions** - Types are shared between frontend and backend
3. **Storage Interface Abstraction** - Database operations are abstracted through an interface
4. **Configuration Options** - Key parameters can be adjusted through environment variables