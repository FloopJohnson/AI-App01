import { describe, it, expect } from 'vitest';
import { findEffectiveCost, formatDateForFirestore, parseEffectiveDate } from '../dateHelpers';

describe('findEffectiveCost', () => {
    it('should find the most recent cost before target date', () => {
        const costHistory = [
            { effectiveDate: '2025-03-01T00:00:00.000Z', costPrice: 1200 },
            { effectiveDate: '2025-02-01T00:00:00.000Z', costPrice: 1100 },
            { effectiveDate: '2025-01-01T00:00:00.000Z', costPrice: 1000 }
        ];

        const targetDate = new Date('2025-02-15');
        const result = findEffectiveCost(costHistory, targetDate);

        expect(result).toBeDefined();
        expect(result.costPrice).toBe(1100);
    });

    it('should return the exact match if target date equals effective date', () => {
        const costHistory = [
            { effectiveDate: '2025-03-01T00:00:00.000Z', costPrice: 1200 },
            { effectiveDate: '2025-02-01T00:00:00.000Z', costPrice: 1100 },
            { effectiveDate: '2025-01-01T00:00:00.000Z', costPrice: 1000 }
        ];

        const targetDate = new Date('2025-02-01');
        const result = findEffectiveCost(costHistory, targetDate);

        expect(result).toBeDefined();
        expect(result.costPrice).toBe(1100);
    });

    it('should return null if no cost exists before target date', () => {
        const costHistory = [
            { effectiveDate: '2025-03-01T00:00:00.000Z', costPrice: 1200 },
            { effectiveDate: '2025-02-01T00:00:00.000Z', costPrice: 1100 }
        ];

        const targetDate = new Date('2024-12-01');
        const result = findEffectiveCost(costHistory, targetDate);

        expect(result).toBeNull();
    });

    it('should return the most recent cost for future dates', () => {
        const costHistory = [
            { effectiveDate: '2025-03-01T00:00:00.000Z', costPrice: 1200 },
            { effectiveDate: '2025-02-01T00:00:00.000Z', costPrice: 1100 },
            { effectiveDate: '2025-01-01T00:00:00.000Z', costPrice: 1000 }
        ];

        const targetDate = new Date('2025-12-31');
        const result = findEffectiveCost(costHistory, targetDate);

        expect(result).toBeDefined();
        expect(result.costPrice).toBe(1200);
    });

    it('should handle empty cost history', () => {
        const result = findEffectiveCost([], new Date('2025-01-01'));
        expect(result).toBeNull();
    });

    it('should work with unsorted cost history', () => {
        const costHistory = [
            { effectiveDate: '2025-01-01T00:00:00.000Z', costPrice: 1000 },
            { effectiveDate: '2025-03-01T00:00:00.000Z', costPrice: 1200 },
            { effectiveDate: '2025-02-01T00:00:00.000Z', costPrice: 1100 }
        ];

        const targetDate = new Date('2025-02-15');
        const result = findEffectiveCost(costHistory, targetDate);

        expect(result).toBeDefined();
        expect(result.costPrice).toBe(1100);
    });
});

describe('formatDateForFirestore', () => {
    it('should convert Date object to ISO string', () => {
        const date = new Date('2025-12-13T10:30:00.000Z');
        const result = formatDateForFirestore(date);

        expect(result).toBe('2025-12-13T10:30:00.000Z');
    });

    it('should handle date string input', () => {
        const dateString = '2025-12-13';
        const result = formatDateForFirestore(dateString);

        expect(result).toContain('2025-12-13');
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should normalize time to start of day for date-only strings', () => {
        const dateString = '2025-12-13';
        const result = formatDateForFirestore(dateString);

        expect(result).toContain('T00:00:00.000Z');
    });

    it('should throw error for invalid date', () => {
        expect(() => formatDateForFirestore('invalid-date')).toThrow();
    });
});

describe('parseEffectiveDate', () => {
    it('should parse ISO date string to Date object', () => {
        const dateString = '2025-12-13T10:30:00.000Z';
        const result = parseEffectiveDate(dateString);

        expect(result).toBeInstanceOf(Date);
        expect(result.toISOString()).toBe(dateString);
    });

    it('should parse date-only string to Date object', () => {
        const dateString = '2025-12-13';
        const result = parseEffectiveDate(dateString);

        expect(result).toBeInstanceOf(Date);
        expect(result.getFullYear()).toBe(2025);
        expect(result.getMonth()).toBe(11); // December (0-indexed)
        expect(result.getDate()).toBe(13);
    });

    it('should return Date object unchanged', () => {
        const date = new Date('2025-12-13T10:30:00.000Z');
        const result = parseEffectiveDate(date);

        expect(result).toBe(date);
    });

    it('should throw error for invalid date string', () => {
        expect(() => parseEffectiveDate('not-a-date')).toThrow();
    });

    it('should handle various date formats', () => {
        const formats = [
            '2025-12-13',
            '2025-12-13T00:00:00',
            '2025-12-13T00:00:00.000Z',
            'December 13, 2025'
        ];

        formats.forEach(format => {
            const result = parseEffectiveDate(format);
            expect(result).toBeInstanceOf(Date);
            expect(result.getFullYear()).toBe(2025);
        });
    });
});
