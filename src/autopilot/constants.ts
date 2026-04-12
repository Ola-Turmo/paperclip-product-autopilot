// Autopilot nested constants — re-exports and prefixes from parent constants
import {
  ACTION_KEYS,
  DATA_KEYS,
  ENTITY_TYPES,
  JOB_KEYS,
  TOOL_KEYS,
  PLUGIN_ID,
} from "../constants.js";

// Re-export originals for direct import by sibling modules
export { ACTION_KEYS, DATA_KEYS, ENTITY_TYPES, JOB_KEYS, TOOL_KEYS, PLUGIN_ID };

// Prefixed versions for the nested autopilot module
export const AUTOPILOT_DATA_KEYS = DATA_KEYS;
export const AUTOPILOT_ACTION_KEYS = ACTION_KEYS;
export const AUTOPILOT_ENTITY_TYPES = ENTITY_TYPES;
export const AUTOPILOT_JOB_KEYS = JOB_KEYS;
export const AUTOPILOT_TOOL_KEYS = TOOL_KEYS;
