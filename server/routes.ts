import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import type { Request as MulterRequest } from 'express-serve-static-core';

interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { z } from "zod";
import { enrichIPAddresses } from "./ip-enrichment";
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
      const results = await storage.getEnrichmentResults(jobId, since, limit);
      
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

  // Get results preview (limited records)
  app.get("/api/jobs/:id/preview", async (req: Request, res: Response) => {
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
      
      // Check if file exists
      if (!fs.existsSync(resultsPath)) {
        return res.status(404).json({ message: "Results file not found" });
      }

      // Here we'd implement a CSV parser to read the first few rows
      // Sending a mock response for now since we're not actually 
      // implementing the full CSV parsing logic in this example
      const previewResults = [
        {
          ip: "142.250.185.46",
          domain: "google.com",
          company: "Google LLC",
          country: "United States",
          city: "Mountain View",
          isp: "Google LLC"
        },
        {
          ip: "157.240.22.35",
          domain: "facebook.com",
          company: "Meta Platforms, Inc.",
          country: "United States",
          city: "Menlo Park",
          isp: "Facebook, Inc."
        }
      ];

      res.status(200).json({
        job,
        preview: previewResults
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
      
      // Check if file exists
      if (!fs.existsSync(resultsPath)) {
        return res.status(404).json({ message: "Results file not found" });
      }

      // Set headers for file download
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=${job.originalFileName.replace('.csv', '')}_enriched.csv`);
      
      // Stream the file to the response
      const fileStream = fs.createReadStream(resultsPath);
      fileStream.pipe(res);
    } catch (error: any) {
      console.error("Download error:", error);
      res.status(500).json({ message: error.message || "Failed to download results" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
