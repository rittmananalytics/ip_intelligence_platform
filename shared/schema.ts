import { pgTable, text, serial, integer, jsonb, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// We define tables for both user management and IP enrichment data

// Users table for authentication (keeping original table)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Define relations for users
export const usersRelations = relations(users, ({ many }) => ({
  jobs: many(ipEnrichmentJobs),
}));

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
  filteredIPs: integer("filtered_ips").default(0),
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
  // Track if the job has been partially saved
  partialSaveAvailable: boolean("partial_save_available").default(false),
  // Store headers from the original CSV file
  csvHeaders: text("csv_headers").array(),
  // Last checkpoint for autosaving
  lastCheckpoint: integer("last_checkpoint").default(0),
});

// Define relations for ipEnrichmentJobs
export const ipEnrichmentJobsRelations = relations(ipEnrichmentJobs, ({ one, many }) => ({
  user: one(users, {
    fields: [ipEnrichmentJobs.userId],
    references: [users.id],
  }),
  results: many(ipEnrichmentResults),
}));

export const insertIpEnrichmentJobSchema = createInsertSchema(ipEnrichmentJobs).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  processedIPs: true,
  successfulIPs: true,
  failedIPs: true,
  filteredIPs: true,
  partialSaveAvailable: true,
  lastCheckpoint: true,
  csvHeaders: true,
});

// Table to store partial enrichment results
export const ipEnrichmentResults = pgTable("ip_enrichment_results", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => ipEnrichmentJobs.id),
  // Store the original row data as JSON
  originalData: json("original_data").notNull(),
  // Store the enrichment results
  enrichmentData: json("enrichment_data"),
  // Track position in the file for resuming
  rowIndex: integer("row_index").notNull(),
  // Track if this row has been processed
  processed: boolean("processed").default(false).notNull(),
  // Track if the processing was successful
  success: boolean("success").default(false).notNull(),
  // Store error message if processing failed
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define relations for ipEnrichmentResults
export const ipEnrichmentResultsRelations = relations(ipEnrichmentResults, ({ one }) => ({
  job: one(ipEnrichmentJobs, {
    fields: [ipEnrichmentResults.jobId],
    references: [ipEnrichmentJobs.id],
  }),
}));

export const insertIpEnrichmentResultSchema = createInsertSchema(ipEnrichmentResults).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Batch insert schema for bulk operations
export const batchInsertIpEnrichmentResultSchema = z.array(
  insertIpEnrichmentResultSchema
);

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
  ispFiltered: z.boolean().optional(),
  success: z.boolean(),
  error: z.string().optional(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type IpEnrichmentJob = typeof ipEnrichmentJobs.$inferSelect;
export type InsertIpEnrichmentJob = z.infer<typeof insertIpEnrichmentJobSchema>;
export type IpEnrichmentResult = z.infer<typeof ipEnrichmentSchema>;
export type IpEnrichmentResultRecord = typeof ipEnrichmentResults.$inferSelect;
export type InsertIpEnrichmentResult = z.infer<typeof insertIpEnrichmentResultSchema>;
export type BatchInsertIpEnrichmentResults = z.infer<typeof batchInsertIpEnrichmentResultSchema>;
