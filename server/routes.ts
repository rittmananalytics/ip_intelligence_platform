import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import type { Request as MulterRequest } from 'express-serve-static-core';
import csvParser from "csv-parser";
import { stringify } from "csv-stringify/sync";

interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { z } from "zod";
import { enrichIPAddresses, enrichSingleIP } from "./ip-enrichment";
import { randomUUID } from "crypto";
import { insertIpEnrichmentJobSchema, ipEnrichmentSchema } from "@shared/schema";

// Setup multer for file uploads
const upload = multer({ 
  dest: os.tmpdir(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Define API routes
  const apiRouter = app.route("/api");
  
  // Upload CSV file
  app.post("/api/upload", upload.single("file"), async (req: RequestWithFile, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const originalFileName = req.file.originalname;
      const fileName = randomUUID() + path.extname(originalFileName);
      
      // Move the file from temp directory to a permanent location
      // For simplicity we'll use temp dir but with a unique name
      const targetPath = path.join(os.tmpdir(), fileName);
      fs.renameSync(req.file.path, targetPath);

      // Get file stats to determine size
      const stats = fs.statSync(targetPath);
      
      res.status(200).json({ 
        fileName, 
        originalFileName,
        size: stats.size,
        path: targetPath
      });
    } catch (error: any) {
      console.error("File upload error:", error);
      res.status(500).json({ message: error.message || "Failed to upload file" });
    }
  });

  // Start IP enrichment job
  app.post("/api/enrich", async (req: Request, res: Response) => {
    try {
      // Validate the request body with zod
      const validatedData = insertIpEnrichmentJobSchema.parse(req.body);
      
      // Create a new enrichment job
      const job = await storage.createEnrichmentJob({
        ...validatedData,
        status: "pending"
      });
      
      // Start the enrichment process in the background
      // We don't await this since it could take a long time
      enrichIPAddresses(job).catch(error => {
        console.error(`Error processing job ${job.id}:`, error);
      });
      
      res.status(200).json(job);
    } catch (error: any) {
      console.error("Enrichment job creation error:", error);
      res.status(400).json({ message: error.message || "Failed to create enrichment job" });
    }
  });

  // Get job status
  app.get("/api/jobs/:id", async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getEnrichmentJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      res.status(200).json(job);
    } catch (error: any) {
      console.error("Job status error:", error);
      res.status(500).json({ message: error.message || "Failed to get job status" });
    }
  });
  
  // Get recent enrichment results for real-time display
  app.get("/api/jobs/:id/recent-results", async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getEnrichmentJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Get the latest results (limit to 50 for performance)
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const since = req.query.since ? parseInt(req.query.since as string) : 0;
      
      // Fetch results after the 'since' index
      let results = await storage.getEnrichmentResults(jobId, since, limit);
      
      // If we're in development mode and have no results, return some sample data
      // Only show sample data if explicitly requested and no real data is available
      if (results.length === 0 && req.query.sample === 'true' && 
          job.status === 'processing') {
        
        // Use real-looking user-provided IPs for display
        const sampleIPs = [
          '216.58.215.110',   // Real user IP example 1
          '172.217.169.46',   // Real user IP example 2
          '31.13.92.36',      // Real user IP example 3
          '199.232.68.133',   // Real user IP example 4
          '52.95.120.67',     // Real user IP example 5
          '104.16.85.20',     // Real user IP example 6
          '13.107.42.14',     // Real user IP example 7
          '151.101.129.140'   // Real user IP example 8
        ];
        
        // Create 3-5 sample results based on the current time to make the display more interesting
        const numResults = 3 + (Date.now() % 3);
        const sampleResults = [];
        
        for (let i = 0; i < numResults; i++) {
          const ipIndex = (Date.now() + i) % sampleIPs.length;
          const ip = sampleIPs[ipIndex];
          const isPublicIP = true; // All our sample IPs are public
          
          // Create sample data that matches our DB schema
          const now = new Date();
          const enrichmentData = {
            ip,
            domain: `company-${ipIndex}.example.com`,
            company: `Company ${ipIndex + 1} Ltd.`,
            country: ['United States', 'Canada', 'United Kingdom', 'Germany', 'Australia'][ipIndex % 5],
            city: ['New York', 'San Francisco', 'London', 'Berlin', 'Sydney'][ipIndex % 5],
            region: ['New York', 'California', 'England', 'Brandenburg', 'New South Wales'][ipIndex % 5],
            latitude: 37.4 + (Math.random() * 0.5),
            longitude: -122.0 + (Math.random() * 0.5),
            isp: `ISP Provider ${ipIndex + 1}`,
            asn: `AS${10000 + ipIndex}`,
            success: true
          };
          
          sampleResults.push({
            id: since + i,
            jobId,
            rowIndex: since + i,
            originalData: { ip },
            enrichmentData,
            processed: true,
            success: true,  // All are successful now
            error: null,    // No errors
            createdAt: now,
            updatedAt: now
          });
        }
        
        results = sampleResults;
      }
      
      res.status(200).json({ 
        results,
        nextIndex: since + results.length
      });
    } catch (error: any) {
      console.error("Recent results error:", error);
      res.status(500).json({ message: error.message || "Failed to get recent results" });
    }
  });

  // Get list of jobs
  app.get("/api/jobs", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const jobs = await storage.listEnrichmentJobs(userId);
      res.status(200).json(jobs);
    } catch (error: any) {
      console.error("List jobs error:", error);
      res.status(500).json({ message: error.message || "Failed to list jobs" });
    }
  });

  // Get results preview (limited records with pagination)
  app.get("/api/jobs/:id/preview", async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.id);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      
      const job = await storage.getEnrichmentJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (job.status !== "completed") {
        return res.status(400).json({ message: "Job not completed yet" });
      }

      // Path where the results CSV would be stored
      const resultsPath = path.join(os.tmpdir(), `${job.fileName}_enriched.csv`);
      
      // Check if file exists
      if (!fs.existsSync(resultsPath)) {
        return res.status(404).json({ message: "Results file not found" });
      }

      // Get actual results from the database with pagination
      let enrichmentResults = await storage.getEnrichmentResults(jobId, offset, limit);
      const totalResults = await storage.getResultsCount(jobId);
      const totalPages = Math.ceil(totalResults / limit);
      
      // Format the actual results for the preview
      const previewResults = enrichmentResults.map(result => {
        // Extract enrichment data fields for display
        const enrichmentData = result.enrichmentData as {
          ip: string;
          domain?: string;
          company?: string;
          country?: string;
          city?: string;
          region?: string;
          isp?: string;
          asn?: string;
          ispFiltered?: boolean;
        };
        
        // Return only the fields we need for the preview
        return {
          ip: enrichmentData.ip,
          domain: enrichmentData.domain,
          company: enrichmentData.company,
          country: enrichmentData.country, 
          city: enrichmentData.city,
          region: enrichmentData.region,
          isp: enrichmentData.isp,
          asn: enrichmentData.asn,
          ispFiltered: enrichmentData.ispFiltered
        };
      });
      
      // If no results available in database, use default sample data (only in development)
      if (previewResults.length === 0 && process.env.NODE_ENV !== 'production' && req.query.sample === 'true') {
        console.log("No preview results in database, using sample data");
        // Sample data for UI development only
        return res.status(200).json({
          job,
          preview: [
            {
              ip: "216.58.215.110",
              domain: "company-1.example.com",
              company: "Company 1 Ltd.",
              country: "United States",
              city: "New York",
              region: "New York",
              isp: "ISP Provider 1",
              asn: "AS15169",
              ispFiltered: true
            },
            // Additional sample records...
          ],
          totalResults: 5,
          currentPage: page,
          totalPages: 1,
          pageSize: limit
        });
      }

      res.status(200).json({
        job,
        preview: previewResults,
        totalResults,
        currentPage: page,
        totalPages,
        pageSize: limit
      });
    } catch (error: any) {
      console.error("Preview error:", error);
      res.status(500).json({ message: error.message || "Failed to get preview" });
    }
  });

  // Download results
  app.get("/api/jobs/:id/download", async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getEnrichmentJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (job.status !== "completed") {
        return res.status(400).json({ message: "Job not completed yet" });
      }

      // Path where the results CSV would be stored
      const resultsPath = path.join(os.tmpdir(), `${job.fileName}_enriched.csv`);
      const filteredOutputPath = path.join(os.tmpdir(), `${job.fileName}_filtered_enriched.csv`);
      
      // Check if file exists
      if (!fs.existsSync(resultsPath)) {
        return res.status(404).json({ message: "Results file not found" });
      }

      // Create a filtered version of the CSV that excludes ISP Filtered = yes rows
      const rows: any[] = [];
      let headers: string[] = [];
      
      // Read the original CSV file
      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(resultsPath)
          .pipe(csvParser())
          .on('headers', (headerList) => {
            headers = headerList;
          })
          .on('data', (row) => {
            // Only include rows where isp_filtered is not "yes"
            if (row.isp_filtered !== "yes") {
              rows.push(row);
            }
          })
          .on('end', () => {
            resolve();
          })
          .on('error', (error) => {
            reject(error);
          });
      });
      
      // Write the filtered CSV
      const csvContent = stringify([headers, ...rows.map(row => headers.map(header => row[header]))]);
      fs.writeFileSync(filteredOutputPath, csvContent);
      
      // Set headers for file download
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=${job.originalFileName.replace('.csv', '')}_enriched.csv`);
      
      // Stream the filtered file to the response
      const fileStream = fs.createReadStream(filteredOutputPath);
      fileStream.pipe(res);
    } catch (error: any) {
      console.error("Download error:", error);
      res.status(500).json({ message: error.message || "Failed to download results" });
    }
  });

  // Single IP lookup endpoint for API access
  // This endpoint is used for individual IP lookups (e.g., from BigQuery UDFs)
  app.get("/api/lookup", async (req: Request, res: Response) => {
    try {
      const ip = req.query.ip as string;
      
      if (!ip) {
        return res.status(400).json({ 
          success: false, 
          error: "Missing IP parameter. Use ?ip=x.x.x.x in the query string." 
        });
      }
      
      // Get enrichment data for this single IP
      const enrichmentData = await enrichSingleIP(ip);
      
      // Return the enrichment data as JSON
      res.status(200).json(enrichmentData);
    } catch (error: any) {
      console.error("IP lookup error:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to lookup IP information",
        ip: req.query.ip
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
