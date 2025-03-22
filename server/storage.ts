import { users, ipEnrichmentJobs, type User, type InsertUser, type IpEnrichmentJob, type InsertIpEnrichmentJob } from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private enrichmentJobs: Map<number, IpEnrichmentJob>;
  private userIdCounter: number;
  private jobIdCounter: number;

  constructor() {
    this.users = new Map();
    this.enrichmentJobs = new Map();
    this.userIdCounter = 1;
    this.jobIdCounter = 1;
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
    const newJob: IpEnrichmentJob = { 
      ...job, 
      id, 
      createdAt, 
      processedIPs: 0,
      successfulIPs: 0,
      failedIPs: 0,
      completedAt: null 
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
    return this.enrichmentJobs.delete(id);
  }

  async listEnrichmentJobs(userId?: number): Promise<IpEnrichmentJob[]> {
    const jobs = Array.from(this.enrichmentJobs.values());
    if (userId === undefined) return jobs;
    return jobs.filter(job => job.userId === userId);
  }
}

// Export a single instance of the storage to be used across the application
export const storage = new MemStorage();
