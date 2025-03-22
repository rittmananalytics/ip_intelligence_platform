import { 
  users, 
  ipEnrichmentJobs, 
  ipEnrichmentResults,
  type User, 
  type InsertUser, 
  type IpEnrichmentJob, 
  type InsertIpEnrichmentJob,
  type IpEnrichmentResultRecord,
  type InsertIpEnrichmentResult,
  type BatchInsertIpEnrichmentResults
} from "@shared/schema";
import { db } from "./db";
import { eq, and, asc, desc, sql, gt, lt, lte, gte } from "drizzle-orm";

export interface IStorage {
  // User CRUD operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // IP enrichment job operations
  createEnrichmentJob(job: InsertIpEnrichmentJob): Promise<IpEnrichmentJob>;
  getEnrichmentJob(id: number): Promise<IpEnrichmentJob | undefined>;
  updateEnrichmentJob(id: number, updates: Partial<IpEnrichmentJob>): Promise<IpEnrichmentJob | undefined>;
  deleteEnrichmentJob(id: number): Promise<boolean>;
  listEnrichmentJobs(userId?: number): Promise<IpEnrichmentJob[]>;
  
  // New operations for enrichment results
  saveEnrichmentResults(results: BatchInsertIpEnrichmentResults): Promise<number>;
  getEnrichmentResults(jobId: number, offset?: number, limit?: number): Promise<IpEnrichmentResultRecord[]>;
  getResultsCount(jobId: number): Promise<number>;
  updateJobPartialSaveStatus(jobId: number, available: boolean, checkpoint?: number): Promise<boolean>;
  getPartialResultsCsv(jobId: number): Promise<string>;
}

export class DBStorage implements IStorage {
  // User CRUD operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // IP enrichment job operations
  async createEnrichmentJob(job: InsertIpEnrichmentJob): Promise<IpEnrichmentJob> {
    // Default values for new jobs
    const jobWithDefaults = {
      ...job,
      processedIPs: 0,
      successfulIPs: 0,
      failedIPs: 0,
      status: 'pending',
      partialSaveAvailable: false,
      lastCheckpoint: 0
    };
    
    const result = await db.insert(ipEnrichmentJobs).values(jobWithDefaults).returning();
    return result[0];
  }

  async getEnrichmentJob(id: number): Promise<IpEnrichmentJob | undefined> {
    const result = await db.select().from(ipEnrichmentJobs).where(eq(ipEnrichmentJobs.id, id)).limit(1);
    return result[0];
  }

  async updateEnrichmentJob(id: number, updates: Partial<IpEnrichmentJob>): Promise<IpEnrichmentJob | undefined> {
    const result = await db.update(ipEnrichmentJobs)
      .set(updates)
      .where(eq(ipEnrichmentJobs.id, id))
      .returning();
    
    return result[0];
  }

  async deleteEnrichmentJob(id: number): Promise<boolean> {
    // First delete all related results
    await db.delete(ipEnrichmentResults).where(eq(ipEnrichmentResults.jobId, id));
    
    // Then delete the job itself
    const result = await db.delete(ipEnrichmentJobs).where(eq(ipEnrichmentJobs.id, id)).returning();
    return result.length > 0;
  }

  async listEnrichmentJobs(userId?: number): Promise<IpEnrichmentJob[]> {
    if (userId !== undefined) {
      return db.select()
        .from(ipEnrichmentJobs)
        .where(eq(ipEnrichmentJobs.userId, userId))
        .orderBy(desc(ipEnrichmentJobs.createdAt));
    }
    
    return db.select()
      .from(ipEnrichmentJobs)
      .orderBy(desc(ipEnrichmentJobs.createdAt));
  }
  
  // New methods for enrichment results
  async saveEnrichmentResults(results: BatchInsertIpEnrichmentResults): Promise<number> {
    if (results.length === 0) return 0;
    
    const inserted = await db.insert(ipEnrichmentResults).values(results).returning();
    return inserted.length;
  }
  
  async getEnrichmentResults(jobId: number, offset = 0, limit = 100): Promise<IpEnrichmentResultRecord[]> {
    return db.select()
      .from(ipEnrichmentResults)
      .where(eq(ipEnrichmentResults.jobId, jobId))
      .orderBy(asc(ipEnrichmentResults.rowIndex))
      .offset(offset)
      .limit(limit);
  }
  
  async getResultsCount(jobId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(ipEnrichmentResults)
      .where(eq(ipEnrichmentResults.jobId, jobId));
      
    return result[0]?.count || 0;
  }
  
  async updateJobPartialSaveStatus(jobId: number, available: boolean, checkpoint?: number): Promise<boolean> {
    const updates: Partial<IpEnrichmentJob> = { partialSaveAvailable: available };
    
    if (checkpoint !== undefined) {
      updates.lastCheckpoint = checkpoint;
    }
    
    const result = await db.update(ipEnrichmentJobs)
      .set(updates)
      .where(eq(ipEnrichmentJobs.id, jobId))
      .returning();
    
    return result.length > 0;
  }
  
  async getPartialResultsCsv(jobId: number): Promise<string> {
    // This will be implemented in the routes file using the other methods
    // as it involves complex CSV generation logic
    return '';
  }
}

// Memory fallback in case database is not available
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private enrichmentJobs: Map<number, IpEnrichmentJob>;
  private enrichmentResults: Map<string, IpEnrichmentResultRecord>; // Composite key: jobId-rowIndex
  private userIdCounter: number;
  private jobIdCounter: number;
  private resultIdCounter: number;

  constructor() {
    this.users = new Map();
    this.enrichmentJobs = new Map();
    this.enrichmentResults = new Map();
    this.userIdCounter = 1;
    this.jobIdCounter = 1;
    this.resultIdCounter = 1;
    console.warn('Using in-memory storage. Data will be lost on restart!');
  }

  // User CRUD operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // IP enrichment job operations
  async createEnrichmentJob(job: InsertIpEnrichmentJob): Promise<IpEnrichmentJob> {
    const id = this.jobIdCounter++;
    const createdAt = new Date();
    
    // Ensure userId is null not undefined if not provided
    const jobData = {
      ...job,
      userId: job.userId ?? null
    };
    
    const newJob: IpEnrichmentJob = { 
      ...jobData, 
      id, 
      createdAt, 
      processedIPs: 0,
      successfulIPs: 0,
      failedIPs: 0,
      completedAt: null,
      status: 'pending',
      partialSaveAvailable: false,
      lastCheckpoint: 0,
      csvHeaders: [],
      error: null
    };
    this.enrichmentJobs.set(id, newJob);
    return newJob;
  }

  async getEnrichmentJob(id: number): Promise<IpEnrichmentJob | undefined> {
    return this.enrichmentJobs.get(id);
  }

  async updateEnrichmentJob(id: number, updates: Partial<IpEnrichmentJob>): Promise<IpEnrichmentJob | undefined> {
    const job = this.enrichmentJobs.get(id);
    if (!job) return undefined;

    const updatedJob = { ...job, ...updates };
    this.enrichmentJobs.set(id, updatedJob);
    return updatedJob;
  }

  async deleteEnrichmentJob(id: number): Promise<boolean> {
    // Delete all related results first
    Array.from(this.enrichmentResults.entries())
      .filter(([key]) => key.startsWith(`${id}-`))
      .forEach(([key]) => this.enrichmentResults.delete(key));
      
    return this.enrichmentJobs.delete(id);
  }

  async listEnrichmentJobs(userId?: number): Promise<IpEnrichmentJob[]> {
    const jobs = Array.from(this.enrichmentJobs.values());
    if (userId === undefined) return jobs;
    return jobs.filter(job => job.userId === userId);
  }
  
  // New methods for enrichment results
  async saveEnrichmentResults(results: BatchInsertIpEnrichmentResults): Promise<number> {
    let count = 0;
    
    for (const result of results) {
      const id = this.resultIdCounter++;
      const compositeKey = `${result.jobId}-${result.rowIndex}`;
      
      const record: IpEnrichmentResultRecord = {
        ...result,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
        error: result.error || null,
        processed: result.processed || false,
        success: result.success || false,
        // Ensure enrichmentData is not undefined
        enrichmentData: result.enrichmentData || null,
        originalData: result.originalData
      };
      
      this.enrichmentResults.set(compositeKey, record);
      count++;
    }
    
    return count;
  }
  
  async getEnrichmentResults(jobId: number, offset = 0, limit = 100): Promise<IpEnrichmentResultRecord[]> {
    return Array.from(this.enrichmentResults.values())
      .filter(result => result.jobId === jobId)
      .sort((a, b) => a.rowIndex - b.rowIndex)
      .slice(offset, offset + limit);
  }
  
  async getResultsCount(jobId: number): Promise<number> {
    return Array.from(this.enrichmentResults.values())
      .filter(result => result.jobId === jobId)
      .length;
  }
  
  async updateJobPartialSaveStatus(jobId: number, available: boolean, checkpoint?: number): Promise<boolean> {
    const job = this.enrichmentJobs.get(jobId);
    if (!job) return false;
    
    const updates: Partial<IpEnrichmentJob> = { partialSaveAvailable: available };
    
    if (checkpoint !== undefined) {
      updates.lastCheckpoint = checkpoint;
    }
    
    this.enrichmentJobs.set(jobId, { ...job, ...updates });
    return true;
  }
  
  async getPartialResultsCsv(jobId: number): Promise<string> {
    // This will be implemented in the routes file
    return '';
  }
}

// Try to use the database storage, fall back to memory storage if it fails
let storageImpl: IStorage;

try {
  storageImpl = new DBStorage();
  console.log('Using database storage');
} catch (error) {
  console.error('Failed to initialize database storage, falling back to memory storage:', error);
  storageImpl = new MemStorage();
}

// Export a single instance of the storage to be used across the application
export const storage = storageImpl;
