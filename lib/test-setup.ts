/**
 * Vitest Test Setup
 * Mocks Next.js server-only module for testing environment
 */

import { vi } from 'vitest';

// Mock the 'server-only' package so tests can import server modules
vi.mock('server-only', () => ({}));
