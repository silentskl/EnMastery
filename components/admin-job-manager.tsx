"use client";
import { WorkQueueManager } from "@/components/work-queue-manager";
export function AdminJobManager(){return <WorkQueueManager apiBase="/api/platform/jobs"/>}
