import { describe, it, expect } from 'vitest';
import { formatDate, formatFullLocation } from '../helpers';

describe('formatDate', () => {
  it('should format ISO date string to DD-MM-YYYY', () => {
    expect(formatDate('2024-12-13')).toBe('13-12-2024');
  });

  it('should include time when includeTime is true', () => {
    const result = formatDate('2024-12-13T09:30:00', true);
    expect(result).toMatch(/13-12-2024 \d{2}:\d{2}/);
  });

  it('should return empty string for null/undefined input', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('')).toBe('');
  });

  it('should return original string for invalid date', () => {
    expect(formatDate('invalid-date')).toBe('invalid-date');
    expect(formatDate('not a date')).toBe('not a date');
  });

  it('should handle Date objects', () => {
    const date = new Date('2024-12-13T15:45:00');
    const result = formatDate(date);
    expect(result).toBe('13-12-2024');
  });
});

describe('formatFullLocation', () => {
  it('should format complete address with all fields', () => {
    const siteForm = {
      streetAddress: '123 Main St',
      city: 'Townsville',
      state: 'QLD',
      postcode: '4810',
      country: 'Australia'
    };
    expect(formatFullLocation(siteForm)).toBe('123 Main St, Townsville, QLD, 4810');
  });

  it('should omit Australia from output', () => {
    const siteForm = {
      city: 'Sydney',
      state: 'NSW',
      country: 'Australia'
    };
    expect(formatFullLocation(siteForm)).toBe('Sydney, NSW');
  });

  it('should include non-Australia countries', () => {
    const siteForm = {
      city: 'Auckland',
      country: 'New Zealand'
    };
    expect(formatFullLocation(siteForm)).toBe('Auckland, New Zealand');
  });

  it('should fallback to location name when no address fields', () => {
    const siteForm = {
      location: 'North Mine'
    };
    expect(formatFullLocation(siteForm)).toBe('North Mine');
  });

  it('should return placeholder for empty form', () => {
    expect(formatFullLocation({})).toBe('Location will appear here...');
  });

  it('should handle partial addresses', () => {
    const siteForm = {
      city: 'Brisbane',
      postcode: '4000'
    };
    expect(formatFullLocation(siteForm)).toBe('Brisbane, 4000');
  });

  it('should prioritize address fields over location name', () => {
    const siteForm = {
      streetAddress: '456 Industrial Rd',
      city: 'Perth',
      location: 'West Mine'
    };
    expect(formatFullLocation(siteForm)).toContain('456 Industrial Rd');
    expect(formatFullLocation(siteForm)).toContain('Perth');
    expect(formatFullLocation(siteForm)).not.toContain('West Mine');
  });
});
