export interface FileUpload {
  fileName: string;
  originalFileName: string;
  size: number;
  path: string;
}

export interface EnrichmentOptions {
  ipColumnName: string;
  includeGeolocation: number;
  includeDomain: number;
  includeCompany: number;
  includeNetwork: number;
}

export interface EnrichmentJob {
  id: number;
  fileName: string;
  originalFileName: string;
  totalIPs: number;
  processedIPs: number;
  successfulIPs: number;
  failedIPs: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string | Date;
  completedAt: string | Date | null;
  userId: number | null;
  error: string | null;
  ipColumnName: string;
  includeGeolocation: number;
  includeDomain: number;
  includeCompany: number;
  includeNetwork: number;
}

export interface IPEnrichmentData {
  ip: string;
  domain?: string;
  company?: string;
  country?: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
  asn?: string;
  // Additional fields
  industry?: string;
  employeeCount?: '0-249' | '250-9999' | '10000+';
  organizationType?: 'public' | 'education' | 'startup' | 'scale-up' | 'mid-market' | 'enterprise';
  success: boolean;
  error?: string;
}

export interface IPEnrichmentResult {
  id: number;
  jobId: number;
  rowIndex: number;
  originalData: any;
  enrichmentData: IPEnrichmentData;
  processed: boolean;
  success: boolean;
  error: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ResultsPreview {
  job: EnrichmentJob;
  preview: any[];
  totalResults: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

export type WorkflowStep = 'upload' | 'config' | 'processing' | 'results';
