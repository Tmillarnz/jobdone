import type { ComponentType } from 'preact';
import type { Area, AreaKind, Job } from '../core/types';

/** Sizing methods beyond Type plug into the area editor here (Draw, Talk). */
export interface SizerProps {
  kind: AreaKind;
  area: Area;
  onChange(next: Area): void;
}
export const sizers: ComponentType<SizerProps>[] = [];

/** Extra sections on the job screen (photos). */
export interface JobSlotProps {
  job: Job;
  save(next: Job): Promise<void>;
}
export const jobExtras: ComponentType<JobSlotProps>[] = [];

/** Per-area additions to the Check screen (the plan diagram). */
export const checkExtras: ComponentType<{ area: Area }>[] = [];
