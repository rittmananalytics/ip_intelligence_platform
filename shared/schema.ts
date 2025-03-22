import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// We define tables for both user management and IP enrichment data

// Users table for authentication (keeping original table)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// IP Enrichment Jobs table - to track file uploads and enrichment jobs
export const ipEnrichmentJobs = pgTable("ip_enrichment_jobs", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  originalFileName: text("original_file_name").notNull(),
  totalIPs: integer("total_ips").notNull(),
  processedIPs: integer("processed_ips").default(0),
  successfulIPs: integer("successful_ips").default(0),
  failedIPs: integer("failed_ips").default(0),
  status: text("status").notNull(), // 'pending', 'processing', 'completed', 'failed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  userId: integer("user_id").references(() => users.id),
  error: text("error"),
  ipColumnName: text("ip_column_name").notNull(),
  includeGeolocation: integer("include_geolocation").default(1),
  includeDomain: integer("include_domain").default(1),
  includeCompany: integer("include_company").default(1),
  includeNetwork: integer("include_network").default(1),
});

export const insertIpEnrichmentJobSchema = createInsertSchema(ipEnrichmentJobs).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  processedIPs: true,
  successfulIPs: true,
  failedIPs: true,
});

// Example of IP enrichment result format - used only for typing
export const ipEnrichmentSchema = z.object({
  ip: z.string(),
  domain: z.string().optional(),
  company: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isp: z.string().optional(),
  asn: z.string().optional(),
  success: z.boolean(),
  error: z.string().optional(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type IpEnrichmentJob = typeof ipEnrichmentJobs.$inferSelect;
export type InsertIpEnrichmentJob = z.infer<typeof insertIpEnrichmentJobSchema>;
export type IpEnrichmentResult = z.infer<typeof ipEnrichmentSchema>;
