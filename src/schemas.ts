import { z } from "@paperclipai/plugin-sdk";

const automationTierSchema = z.enum(["supervised", "semiauto", "fullauto"]);
const ideaStatusSchema = z.enum([
  "active",
  "maybe",
  "approved",
  "rejected",
  "in_progress",
  "completed",
  "archived",
]);
const researchStatusSchema = z.enum(["pending", "running", "completed", "failed"]);
const runStatusSchema = z.enum(["pending", "running", "paused", "completed", "failed", "cancelled"]);
const complexitySchema = z.enum(["low", "medium", "high"]);

export const autopilotProjectSchema = z.object({
  autopilotId: z.string().min(1),
  companyId: z.string().min(1),
  projectId: z.string().min(1),
  enabled: z.boolean(),
  automationTier: automationTierSchema,
  budgetMinutes: z.number().nonnegative(),
  repoUrl: z.string().optional(),
  workspaceId: z.string().optional(),
  liveUrl: z.string().optional(),
  productType: z.string().optional(),
  agentId: z.string().optional(),
  paused: z.boolean(),
  pauseReason: z.string().optional(),
  researchScheduleCron: z.string().optional(),
  ideationScheduleCron: z.string().optional(),
  maybePoolResurfaceDays: z.number().int().positive().optional(),
  maxIdeasPerCycle: z.number().int().positive().optional(),
  autoCreateIssues: z.boolean(),
  autoCreatePrs: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const researchCycleSchema = z.object({
  cycleId: z.string().min(1),
  companyId: z.string().min(1),
  projectId: z.string().min(1),
  status: researchStatusSchema,
  query: z.string().min(1),
  reportContent: z.string().optional(),
  findingsCount: z.number().int().nonnegative(),
  sources: z.array(z.string()).optional(),
  startedAt: z.string().min(1),
  completedAt: z.string().optional(),
  error: z.string().optional(),
});

export const ideaSchema = z.object({
  ideaId: z.string().min(1),
  companyId: z.string().min(1),
  projectId: z.string().min(1),
  cycleId: z.string().optional(),
  title: z.string().min(1),
  description: z.string(),
  rationale: z.string(),
  sourceReferences: z.array(z.string()),
  impactScore: z.number(),
  feasibilityScore: z.number(),
  complexityEstimate: complexitySchema.optional(),
  technicalApproach: z.string().optional(),
  risks: z.array(z.string()).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: ideaStatusSchema,
  duplicateOfIdeaId: z.string().optional(),
  duplicateAnnotated: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

const swipeBreakdownSchema = z.object({
  pass: z.number().int().nonnegative(),
  maybe: z.number().int().nonnegative(),
  yes: z.number().int().nonnegative(),
  now: z.number().int().nonnegative(),
});

export const preferenceProfileSchema = z.object({
  profileId: z.string().min(1),
  companyId: z.string().min(1),
  projectId: z.string().min(1),
  passCount: z.number().int().nonnegative(),
  maybeCount: z.number().int().nonnegative(),
  yesCount: z.number().int().nonnegative(),
  nowCount: z.number().int().nonnegative(),
  totalSwipes: z.number().int().nonnegative(),
  categoryPreferences: z.record(swipeBreakdownSchema),
  tagPreferences: z.record(swipeBreakdownSchema),
  avgApprovedScore: z.number(),
  avgRejectedScore: z.number(),
  lastUpdated: z.string().min(1),
});

export const deliveryRunSchema = z.object({
  runId: z.string().min(1),
  companyId: z.string().min(1),
  projectId: z.string().min(1),
  ideaId: z.string().min(1),
  artifactId: z.string().min(1),
  title: z.string().min(1),
  status: runStatusSchema,
  automationTier: automationTierSchema,
  branchName: z.string().min(1),
  workspacePath: z.string().min(1),
  leasedPort: z.number().nullable(),
  commitSha: z.string().nullable(),
  prUrl: z.string().optional(),
  prNumber: z.number().optional(),
  paused: z.boolean(),
  pauseReason: z.string().optional(),
  completedAt: z.string().nullable(),
  error: z.string().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const companyBudgetSchema = z.object({
  budgetId: z.string().min(1),
  companyId: z.string().min(1),
  totalBudgetMinutes: z.number().nonnegative(),
  usedBudgetMinutes: z.number().nonnegative(),
  autopilotBudgetMinutes: z.number().nonnegative(),
  autopilotUsedMinutes: z.number().nonnegative(),
  paused: z.boolean(),
  pauseReason: z.string().optional(),
  updatedAt: z.string().min(1),
});
