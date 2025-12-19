import { describe, it, expect } from 'vitest';
import { calculateLinearTrend, forecastCostAtDate } from '../costForecasting';

describe('calculateLinearTrend', () => {
    it('should calculate correct slope and intercept for positive trend', () => {
        const dataPoints = [
            { date: new Date('2025-01-01'), cost: 1000 },
            { date: new Date('2025-02-01'), cost: 1100 },
            { date: new Date('2025-03-01'), cost: 1200 }
        ];

        const result = calculateLinearTrend(dataPoints);

        expect(result).toHaveProperty('slope');
        expect(result).toHaveProperty('intercept');
        expect(result).toHaveProperty('r2');
        expect(result.slope).toBeGreaterThan(0); // Positive trend
        expect(result.r2).toBeGreaterThan(0.9); // Strong correlation
    });

    it('should handle flat trend (zero slope)', () => {
        const dataPoints = [
            { date: new Date('2025-01-01'), cost: 1000 },
            { date: new Date('2025-02-01'), cost: 1000 },
            { date: new Date('2025-03-01'), cost: 1000 }
        ];

        const result = calculateLinearTrend(dataPoints);

        expect(result.slope).toBeCloseTo(0, 5);
        expect(result.r2).toBeCloseTo(1, 5); // Perfect fit for flat line
    });

    it('should handle negative trend', () => {
        const dataPoints = [
            { date: new Date('2025-01-01'), cost: 1200 },
            { date: new Date('2025-02-01'), cost: 1100 },
            { date: new Date('2025-03-01'), cost: 1000 }
        ];

        const result = calculateLinearTrend(dataPoints);

        expect(result.slope).toBeLessThan(0); // Negative trend
    });

    it('should return null for single data point', () => {
        const dataPoints = [
            { date: new Date('2025-01-01'), cost: 1000 }
        ];

        const result = calculateLinearTrend(dataPoints);

        expect(result).toBeNull();
    });

    it('should return null for empty array', () => {
        const result = calculateLinearTrend([]);
        expect(result).toBeNull();
    });
});

describe('forecastCostAtDate', () => {
    it('should forecast future cost based on historical trend', () => {
        const historicalCosts = [
            { effectiveDate: '2025-01-01T00:00:00.000Z', costPrice: 1000 },
            { effectiveDate: '2025-02-01T00:00:00.000Z', costPrice: 1100 },
            { effectiveDate: '2025-03-01T00:00:00.000Z', costPrice: 1200 }
        ];

        const targetDate = new Date('2025-04-01');
        const result = forecastCostAtDate(historicalCosts, targetDate);

        expect(result).toHaveProperty('forecastedCost');
        expect(result).toHaveProperty('confidence');
        expect(result.forecastedCost).toBeGreaterThan(1200); // Should continue upward trend
        expect(result.confidence).toBeGreaterThan(0); // Should have some confidence
    });

    it('should return current cost for flat trend', () => {
        const historicalCosts = [
            { effectiveDate: '2025-01-01T00:00:00.000Z', costPrice: 1000 },
            { effectiveDate: '2025-02-01T00:00:00.000Z', costPrice: 1000 },
            { effectiveDate: '2025-03-01T00:00:00.000Z', costPrice: 1000 }
        ];

        const targetDate = new Date('2025-04-01');
        const result = forecastCostAtDate(historicalCosts, targetDate);

        expect(result.forecastedCost).toBeCloseTo(1000, 0);
        expect(result.confidence).toBeGreaterThan(0.9); // High confidence for flat trend
    });

    it('should return null for insufficient data', () => {
        const historicalCosts = [
            { effectiveDate: '2025-01-01T00:00:00.000Z', costPrice: 1000 }
        ];

        const targetDate = new Date('2025-04-01');
        const result = forecastCostAtDate(historicalCosts, targetDate);

        expect(result).toBeNull();
    });

    it('should return null for empty history', () => {
        const result = forecastCostAtDate([], new Date('2025-04-01'));
        expect(result).toBeNull();
    });

    it('should handle date strings and Date objects', () => {
        const historicalCosts = [
            { effectiveDate: '2025-01-01T00:00:00.000Z', costPrice: 1000 },
            { effectiveDate: '2025-02-01T00:00:00.000Z', costPrice: 1100 }
        ];

        const resultWithDate = forecastCostAtDate(historicalCosts, new Date('2025-03-01'));
        const resultWithString = forecastCostAtDate(historicalCosts, '2025-03-01');

        expect(resultWithDate).toBeDefined();
        expect(resultWithString).toBeDefined();
        expect(resultWithDate.forecastedCost).toBeCloseTo(resultWithString.forecastedCost, 0);
    });
});
