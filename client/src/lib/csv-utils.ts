import Papa from 'papaparse';

/**
 * Parse a CSV file to extract header information
 */
export async function parseCSVHeaders(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      preview: 1, // We only need the headers
      skipEmptyLines: true,
      complete: (results) => {
        if (results.meta && results.meta.fields) {
          resolve(results.meta.fields);
        } else {
          reject(new Error('Could not parse CSV headers'));
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

/**
 * Validate if a CSV file contains a column that might contain IP addresses
 * This is a simple heuristic based on common column names
 */
export function findPossibleIPColumns(headers: string[]): string[] {
  const ipRelatedNames = [
    'ip', 'ip_address', 'ipaddress', 'ip-address', 'ipv4', 
    'address', 'host', 'host_ip', 'server', 'server_ip', 'client_ip'
  ];
  
  const possibleColumns = headers.filter(header => 
    ipRelatedNames.some(name => 
      header.toLowerCase().includes(name.toLowerCase())
    )
  );
  
  // If no matches found, just return all headers
  return possibleColumns.length > 0 ? possibleColumns : headers;
}

/**
 * Estimate the number of rows in a CSV file
 */
export async function estimateCSVRowCount(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    let rowCount = 0;
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      step: () => {
        rowCount++;
      },
      complete: () => {
        resolve(rowCount);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

/**
 * Format file size into human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
