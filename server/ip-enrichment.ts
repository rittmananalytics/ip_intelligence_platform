import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import axios from "axios";
import csvParser from "csv-parser";
import { stringify } from "csv-stringify/sync";
import { storage } from "./storage";
import { type IpEnrichmentJob, type IpEnrichmentResult } from "@shared/schema";
import dns from "dns/promises";

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
 * Main function to enrich IP addresses in a CSV file
 */
export async function enrichIPAddresses(job: IpEnrichmentJob): Promise<void> {
  const filePath = path.join(os.tmpdir(), job.fileName);
  const outputPath = path.join(os.tmpdir(), `${job.fileName}_enriched.csv`);
  const results: Array<Record<string, any>> = [];
  let processed = 0;
  let successful = 0;
  let failed = 0;
  let headers: string[] = [];

  try {
    // Update job to processing status
    await storage.updateEnrichmentJob(job.id, { status: "processing" });

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on("headers", (headerList) => {
          headers = headerList;
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
              outputHeaders.push("company");
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
                }
                
                // Add domain data if requested
                if (job.includeDomain) {
                  const domain = await getDomainFromIP(ipAddress);
                  enrichedRow["domain"] = domain || "";
                }
                
                // Add company data if requested
                if (job.includeCompany) {
                  enrichedRow["company"] = ipInfo.org || "";
                }
                
                // Add network data if requested
                if (job.includeNetwork) {
                  enrichedRow["isp"] = ipInfo.isp || "";
                  enrichedRow["asn"] = ipInfo.as || "";
                }
                
                enrichedRow["enrichment_success"] = "true";
                enrichedRow["enrichment_error"] = "";
                successful++;
              } catch (error: any) {
                // Handle errors gracefully - still include the row with error info
                enrichedRow["enrichment_success"] = "false";
                enrichedRow["enrichment_error"] = error.message || "Unknown error";
                failed++;
              }
              
              // Append this row to the output file
              fs.appendFileSync(outputPath, stringify([Object.values(enrichedRow)]));
              
              // Update job status every 100 records or at the end
              if (processed % 100 === 0 || processed === results.length) {
                await storage.updateEnrichmentJob(job.id, {
                  processedIPs: processed,
                  successfulIPs: successful,
                  failedIPs: failed
                });
              }
            }
            
            // Mark job as completed
            await storage.updateEnrichmentJob(job.id, {
              status: "completed",
              completedAt: new Date(),
              processedIPs: processed,
              successfulIPs: successful,
              failedIPs: failed
            });
            
            resolve();
          } catch (error) {
            // Mark job as failed
            await storage.updateEnrichmentJob(job.id, {
              status: "failed",
              error: error instanceof Error ? error.message : "Unknown error",
              processedIPs: processed,
              successfulIPs: successful,
              failedIPs: failed
            });
            reject(error);
          }
        })
        .on("error", async (error) => {
          // Mark job as failed
          await storage.updateEnrichmentJob(job.id, {
            status: "failed",
            error: error.message,
            processedIPs: processed,
            successfulIPs: successful,
            failedIPs: failed
          });
          reject(error);
        });
    });
  } catch (error) {
    // Mark job as failed
    await storage.updateEnrichmentJob(job.id, {
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      processedIPs: processed,
      successfulIPs: successful,
      failedIPs: failed
    });
    throw error;
  }
}
