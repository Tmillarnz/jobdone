import type { Trade } from '../core/types';
import { builder } from './builder';
import { painter } from './painter';
import { plumber } from './plumber';
import { roofer } from './roofer';

/** Adding a trade: one new folder, one line here. */
export const registry: Trade[] = [
  painter,
  plumber,
  roofer,
  builder,
];
