import { apiRequest } from '@/lib/queryClient';
import { EnrichmentJob, EnrichmentOptions, FileUpload, ResultsPreview, IPEnrichmentResult } from '@/types';

/**
 * Upload a CSV file
 */
export async function uploadCSVFile(file: File): Promise<FileUpload> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${response.status} ${errorText}`);
  }
  
  return await response.json();
}

/**
 * Start an IP enrichment job
 */
export async function startEnrichmentJob(fileUpload: FileUpload, options: EnrichmentOptions): Promise<EnrichmentJob> {
  const data = {
    fileName: fileUpload.fileName,
    originalFileName: fileUpload.originalFileName,
    totalIPs: 0, // Will be updated during processing
    status: 'pending',
    ...options
  };
  
  const response = await apiRequest('POST', '/api/enrich', data);
  return await response.json();
}

/**
 * Get the status of an enrichment job
 */
export async function getJobStatus(jobId: number): Promise<EnrichmentJob> {
  const response = await fetch(`/api/jobs/${jobId}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get job status: ${response.status} ${errorText}`);
  }
  
  return await response.json();
}

/**
 * Get preview of results for a completed job
 */
export async function getResultsPreview(jobId: number, page: number = 1, pageSize: number = 10): Promise<ResultsPreview> {
  const response = await fetch(`/api/jobs/${jobId}/preview?page=${page}&limit=${pageSize}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get results preview: ${response.status} ${errorText}`);
  }
  
  return await response.json();
}

/**
 * Generate download URL for enriched CSV file
 */
export function getDownloadUrl(jobId: number): string {
  return `/api/jobs/${jobId}/download`;
}

/**
 * Get recent enrichment results for real-time display
 */
export interface RecentResultsResponse {
  results: IPEnrichmentResult[];
  nextIndex: number;
}

export async function getRecentResults(jobId: number, since: number = 0, limit: number = 50): Promise<RecentResultsResponse> {
  const response = await fetch(`/api/jobs/${jobId}/recent-results?since=${since}&limit=${limit}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get recent results: ${response.status} ${errorText}`);
  }
  
  return await response.json();
}
