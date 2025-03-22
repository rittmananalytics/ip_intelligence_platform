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

export interface IPEnrichmentResult {
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
  success: boolean;
  error?: string;
}

export interface ResultsPreview {
  job: EnrichmentJob;
  preview: any[];
}

export type WorkflowStep = 'upload' | 'config' | 'processing' | 'results';
