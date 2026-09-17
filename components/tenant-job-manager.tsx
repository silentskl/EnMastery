"use client";
import { WorkQueueManager } from "@/components/work-queue-manager";
export function TenantJobManager(){return <WorkQueueManager apiBase="/api/admin/jobs"/>}
