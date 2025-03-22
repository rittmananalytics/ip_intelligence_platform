import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import axios from "axios";
import csvParser from "csv-parser";
import { stringify } from "csv-stringify/sync";
import { storage } from "./storage";
import { 
  type IpEnrichmentJob, 
  type IpEnrichmentResult,
  type BatchInsertIpEnrichmentResults,
  type InsertIpEnrichmentResult 
} from "@shared/schema";
import dns from "dns/promises";

// List of common ISP keywords to filter out
const COMMON_ISPS = [
  'telstra',
  'comcast', 
  'cox',
  'verizon',
  'bt',
  'at&t',
  'spectrum',
  'charter',
  'time warner',
  'virgin media',
  'sprint',
  't-mobile',
  'deutsche telekom',
  'vodafone',
  'orange',
  'rogers',
  'bell',
  'shaw',
  'telecom'
];

// Make a case-insensitive regex pattern for matching ISPs
const ISP_PATTERN = new RegExp(COMMON_ISPS.join('|'), 'i');

/**
 * Validates if a string is a valid IP address
 */
function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  if (!ipv4Regex.test(ip)) return false;
  
  const parts = ip.split('.');
  return parts.every(part => parseInt(part) <= 255);
}

/**
 * Checks if an ISP or organization name belongs to a common consumer ISP
 */
function isCommonISP(isp?: string, org?: string): boolean {
  if (!isp && !org) return false;
  
  if (isp && ISP_PATTERN.test(isp)) return true;
  if (org && ISP_PATTERN.test(org)) return true;
  
  return false;
}

/**
 * Get domain name from IP using reverse DNS lookup
 */
async function getDomainFromIP(ip: string): Promise<string | undefined> {
  try {
    const hostnames = await dns.reverse(ip);
    return hostnames && hostnames.length > 0 ? hostnames[0] : undefined;
  } catch (error) {
    console.log(`Failed to get domain for IP ${ip}:`, error);
    return undefined;
  }
}

/**
 * Get geolocation and other IP data using IP-API service
 */
async function getIPInfo(ip: string): Promise<any> {
  try {
    const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,lat,lon,isp,org,as`);
    if (response.data.status === "fail") {
      throw new Error(response.data.message);
    }
    return response.data;
  } catch (error) {
    console.log(`Failed to get IP info for ${ip}:`, error);
    throw error;
  }
}

/**
 * Save batch of results to database for auto-saving
 */
async function saveBatchToDatabase(
  jobId: number, 
  rows: Array<Record<string, any>>, 
  startIndex: number,
  enrichmentResults: Record<string, any>[]
): Promise<void> {
  try {
    const batchData: InsertIpEnrichmentResult[] = [];
    
    for (let i = 0; i < rows.length; i++) {
      const rowIndex = startIndex + i;
      const originalData = rows[i];
      const enrichmentData = enrichmentResults[i] || null;
      
      batchData.push({
        jobId,
        originalData,
        enrichmentData,
        rowIndex,
        processed: enrichmentData !== null,
        success: enrichmentData?.success || false,
        error: enrichmentData?.error || null
      });
    }
    
    await storage.saveEnrichmentResults(batchData);
    await storage.updateJobPartialSaveStatus(jobId, true, startIndex + rows.length);
    
    console.log(`Batch saved to database: ${batchData.length} rows, last index: ${startIndex + rows.length - 1}`);
  } catch (error) {
    console.error('Error saving batch to database:', error);
    // Continue processing even if batch save fails
  }
}

/**
 * Main function to enrich IP addresses in a CSV file
 */
export async function enrichIPAddresses(job: IpEnrichmentJob): Promise<void> {
  const filePath = path.join(os.tmpdir(), job.fileName);
  const outputPath = path.join(os.tmpdir(), `${job.fileName}_enriched.csv`);
  const results: Array<Record<string, any>> = [];
  let processed = 0;
  let successful = 0;
  let failed = 0;
  let filtered = 0; // Count of IPs that are filtered (common ISPs)
  let headers: string[] = [];
  // Current batch for auto-saving
  const BATCH_SIZE = 100;
  let currentBatch: Record<string, any>[] = [];
  let currentBatchEnrichment: Record<string, any>[] = [];
  let batchStartIndex = 0;

  try {
    // Update job to processing status
    await storage.updateEnrichmentJob(job.id, { status: "processing" });

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on("headers", (headerList) => {
          headers = headerList;
          
          // Store headers in the job for partial saves
          storage.updateEnrichmentJob(job.id, { csvHeaders: headers });
        })
        .on("data", async (row) => {
          // Push the row to our results array for now
          // We'll process it after counting total records
          results.push(row);
        })
        .on("end", async () => {
          try {
            // Update job with total IPs count
            await storage.updateEnrichmentJob(job.id, { 
              totalIPs: results.length 
            });

            // Create output file with headers
            const outputHeaders = [...headers];
            if (job.includeGeolocation) {
              outputHeaders.push("country", "city", "region", "latitude", "longitude");
            }
            if (job.includeDomain) {
              outputHeaders.push("domain");
            }
            if (job.includeCompany) {
              outputHeaders.push("company", "isp_filtered");
            }
            if (job.includeNetwork) {
              outputHeaders.push("isp", "asn");
            }
            outputHeaders.push("enrichment_success", "enrichment_error");

            // Write the headers to output file
            fs.writeFileSync(outputPath, stringify([outputHeaders]));

            // Process each row
            for (const row of results) {
              processed++;
              const ipAddress = row[job.ipColumnName];
              
              // Create a new row with original data
              const enrichedRow: Record<string, any> = { ...row };
              // Create an enrichment data object for database storage
              const enrichmentData: Record<string, any> = {};
              
              // Add row to current batch for auto-saving
              currentBatch.push(row);
              
              try {
                // Check if IP is valid
                if (!ipAddress || !isValidIP(ipAddress)) {
                  throw new Error("Invalid IP address");
                }

                // Get IP information
                const ipInfo = await getIPInfo(ipAddress);
                
                // Add geolocation data if requested
                if (job.includeGeolocation) {
                  enrichedRow["country"] = ipInfo.country || "";
                  enrichedRow["city"] = ipInfo.city || "";
                  enrichedRow["region"] = ipInfo.regionName || "";
                  enrichedRow["latitude"] = ipInfo.lat || "";
                  enrichedRow["longitude"] = ipInfo.lon || "";
                  
                  enrichmentData.country = ipInfo.country;
                  enrichmentData.city = ipInfo.city;
                  enrichmentData.region = ipInfo.regionName;
                  enrichmentData.latitude = ipInfo.lat;
                  enrichmentData.longitude = ipInfo.lon;
                }
                
                // Add domain data if requested
                if (job.includeDomain) {
                  const domain = await getDomainFromIP(ipAddress);
                  enrichedRow["domain"] = domain || "";
                  enrichmentData.domain = domain;
                }
                
                // Check if the IP belongs to a common ISP and mark accordingly
                const isIsp = isCommonISP(ipInfo.isp, ipInfo.org);
                
                // Track filtered IPs
                if (isIsp) {
                  filtered++;
                }
                
                // Add company data if requested
                if (job.includeCompany) {
                  enrichedRow["company"] = ipInfo.org || "";
                  enrichedRow["isp_filtered"] = isIsp ? "yes" : "no";
                  
                  enrichmentData.company = ipInfo.org;
                  enrichmentData.ispFiltered = isIsp;
                }
                
                // Add network data if requested
                if (job.includeNetwork) {
                  enrichedRow["isp"] = ipInfo.isp || "";
                  enrichedRow["asn"] = ipInfo.as || "";
                  
                  enrichmentData.isp = ipInfo.isp;
                  enrichmentData.asn = ipInfo.as;
                }
                
                enrichedRow["enrichment_success"] = "true";
                enrichedRow["enrichment_error"] = "";
                
                enrichmentData.success = true;
                enrichmentData.ip = ipAddress;
                
                successful++;
              } catch (error: any) {
                // Handle errors gracefully - still include the row with error info
                enrichedRow["enrichment_success"] = "false";
                enrichedRow["enrichment_error"] = error.message || "Unknown error";
                
                enrichmentData.success = false;
                enrichmentData.error = error.message || "Unknown error";
                enrichmentData.ip = ipAddress;
                
                failed++;
              }
              
              // Store enrichment data for batch saving
              currentBatchEnrichment.push(enrichmentData);
              
              // Append this row to the output file
              fs.appendFileSync(outputPath, stringify([Object.values(enrichedRow)]));
              
              // Auto-save batch every BATCH_SIZE records
              if (currentBatch.length >= BATCH_SIZE) {
                // Update job status
                await storage.updateEnrichmentJob(job.id, {
                  processedIPs: processed,
                  successfulIPs: successful,
                  failedIPs: failed,
                  filteredIPs: filtered
                });
                
                // Save the current batch to database
                await saveBatchToDatabase(
                  job.id, 
                  currentBatch, 
                  batchStartIndex, 
                  currentBatchEnrichment
                );
                
                // Reset batch
                batchStartIndex += currentBatch.length;
                currentBatch = [];
                currentBatchEnrichment = [];
              }
            }
            
            // Save any remaining items in the last batch
            if (currentBatch.length > 0) {
              await saveBatchToDatabase(
                job.id, 
                currentBatch, 
                batchStartIndex, 
                currentBatchEnrichment
              );
            }
            
            // Mark job as completed
            await storage.updateEnrichmentJob(job.id, {
              status: "completed",
              completedAt: new Date(),
              processedIPs: processed,
              successfulIPs: successful,
              failedIPs: failed,
              filteredIPs: filtered,
              partialSaveAvailable: true,  // Ensure all data is marked as available
              lastCheckpoint: results.length
            });
            
            resolve();
          } catch (error) {
            // Mark job as failed but keep partial save flag if we saved some data
            const jobUpdate: Partial<IpEnrichmentJob> = {
              status: "failed",
              error: error instanceof Error ? error.message : "Unknown error",
              processedIPs: processed,
              successfulIPs: successful,
              failedIPs: failed,
              filteredIPs: filtered
            };
            
            if (batchStartIndex > 0) {
              jobUpdate.partialSaveAvailable = true;
              jobUpdate.lastCheckpoint = batchStartIndex;
            }
            
            await storage.updateEnrichmentJob(job.id, jobUpdate);
            reject(error);
          }
        })
        .on("error", async (error) => {
          // Mark job as failed but keep partial save flag if we saved some data
          const jobUpdate: Partial<IpEnrichmentJob> = {
            status: "failed",
            error: error.message,
            processedIPs: processed,
            successfulIPs: successful,
            failedIPs: failed,
            filteredIPs: filtered
          };
          
          if (batchStartIndex > 0) {
            jobUpdate.partialSaveAvailable = true;
            jobUpdate.lastCheckpoint = batchStartIndex;
          }
          
          await storage.updateEnrichmentJob(job.id, jobUpdate);
          reject(error);
        });
    });
  } catch (error) {
    // Mark job as failed with any partial save info
    const jobUpdate: Partial<IpEnrichmentJob> = {
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      processedIPs: processed,
      successfulIPs: successful,
      failedIPs: failed,
      filteredIPs: filtered
    };
    
    if (batchStartIndex > 0) {
      jobUpdate.partialSaveAvailable = true;
      jobUpdate.lastCheckpoint = batchStartIndex;
    }
    
    await storage.updateEnrichmentJob(job.id, jobUpdate);
    throw error;
  }
}
