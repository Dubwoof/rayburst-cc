/**
 * Shared types for Rayburst hook context injection.
 */

export interface Criterion {
  id: string;
  title?: string;
  description?: string;
  status?: string;
}

export interface Feature {
  id: string;
  title: string;
  description?: string;
  status?: string;
  criteriaCount?: number;
  criteria?: Criterion[];
}

export interface Card {
  id: string;
  title: string;
  status?: string;
  features?: Array<{ id: string } | string>;
}

export interface RayburstConfig {
  apiKey: string;
  apiUrl: string;
  agentId?: string;
  boardId?: string;
  boardSlug?: string;
  frontendProjectId?: string;
  backendProjectId?: string;
  projectUrl?: string;
}
