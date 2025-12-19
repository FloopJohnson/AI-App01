// Costing Service - Core calculation engine for product and part costs
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { partCostHistoryRepository, productCompositionRepository, productCostHistoryRepository } from '../repositories';
import { findEffectiveCost } from '../utils/dateHelpers';
import { forecastCostAtDate } from '../utils/costForecasting';
import { getLowestSupplierPrice } from './partPricingService';
import { getLabourRate } from './settingsService';

/**
 * Forecast part cost at a target date using linear regression
 * @description Fetches historical cost data from PartCostHistoryRepository and uses
 * linear regression to predict future cost. Returns forecasted cost and confidence score.
 * @param {string} partId - The part ID to forecast
 * @param {Date|string} targetDate - Date to forecast for
 * @returns {Promise<{forecastedCost: number, confidence: number}|null>} Forecast with R² confidence or null
 * @example
 * const forecast = await forecastPartCost('part-123', new Date('2026-06-01'));
 * // returns { forecastedCost: 1350, confidence: 0.92 }
 */
export async function forecastPartCost(partId, targetDate) {
    try {
        const history = await partCostHistoryRepository.getCostHistory(partId);

        if (!history || history.length < 2) {
            console.warn(`[CostingService] Insufficient history for part ${partId} (need 2+ entries for forecasting)`);
            return null;
        }

        const forecast = forecastCostAtDate(history, targetDate);

        if (forecast) {
            console.log(`[CostingService] Forecasted cost for ${partId}:`, {
                forecastedCost: forecast.forecastedCost,
                confidence: forecast.confidence.toFixed(2),
                dataPoints: history.length
            });
        }

        return forecast;
    } catch (error) {
        console.error('[CostingService] Error forecasting part cost:', error);
        return null;
    }
}

/**
 * Get the cost of a part at a specific date
 * @description Queries part cost history for the effective cost on a given date.
 * Falls back to the current catalog cost if no history exists.
 * Respects costPriceSource setting (MANUAL or SUPPLIER_LOWEST).
 * @param {string} partId - The part ID to query
 * @param {Date|string} date - The date to find the effective cost for
 * @returns {Promise<number>} Cost in cents
 * @example
 * const cost = await getPartCostAtDate('part-123', new Date('2025-12-13'));
 * // returns 1250 (cents)
 */
export async function getPartCostAtDate(partId, date) {
    try {
        // First, try to get cost from history
        const costHistory = await partCostHistoryRepository.getCostHistory(partId);

        if (costHistory && costHistory.length > 0) {
            const effectiveCost = findEffectiveCost(costHistory, date);
            if (effectiveCost) {
                return effectiveCost.costPrice;
            }
        }

        // Fallback: get current cost from part catalog
        let catalogRef = await getDocs(query(collection(db, 'part_catalog'), where('id', '==', partId)));

        // If not found in part catalog, try fastener catalog
        if (catalogRef.empty) {
            catalogRef = await getDocs(query(collection(db, 'fastener_catalog'), where('id', '==', partId)));
        }

        if (!catalogRef.empty) {
            const itemData = catalogRef.docs[0].data();

            // Determine active cost based on costPriceSource
            if (itemData.costPriceSource === 'PROJECTED') {
                try {
                    const forecast = await forecastPartCost(partId, date);

                    if (forecast) {
                        // Log warning if confidence is low, but still use projected cost
                        if (forecast.confidence < 0.3) {
                            console.warn(`[CostingService] Low confidence (${forecast.confidence.toFixed(2)}) for ${partId}, but using projected cost anyway`);
                        } else {
                            console.log(`[CostingService] Using projected cost for ${partId}:`,
                                { cost: forecast.forecastedCost, confidence: forecast.confidence.toFixed(2) });
                        }
                        return forecast.forecastedCost;
                    } else {
                        console.warn(`[CostingService] No forecast available for ${partId}, falling back to manual cost`);
                        return itemData.costPrice || 0;
                    }
                } catch (err) {
                    console.warn(`[CostingService] Could not project cost for ${partId}, using manual cost:`, err);
                    return itemData.costPrice || 0;
                }
            }

            if (itemData.costPriceSource === 'SUPPLIER_LOWEST') {
                try {
                    const validSuppliers = itemData.suppliers || [];
                    const lowestPrice = await getLowestSupplierPrice(partId, date, validSuppliers);
                    if (lowestPrice) {
                        return lowestPrice.costPrice;
                    }
                } catch (err) {
                    console.warn(`[CostingService] Could not get lowest supplier price for ${partId}, using manual cost:`, err);
                }
            }

            // Default to manual cost
            return itemData.costPrice || 0;
        }

        console.warn(`[CostingService] No cost found for item ${partId} in either catalog`);
        return 0;
    } catch (error) {
        console.error('[CostingService] Error getting part cost at date:', error);
        throw error;
    }
}

/**
 * Calculate the total cost of a product from its Bill of Materials
 * @description Sums the cost of all parts in a product's BOM, using historical
 * costs if a date is provided. Returns total cost and detailed breakdown.
 * @param {string} productId - The product ID to calculate cost for
 * @param {Date|string} [date] - Optional date for historical cost calculation (defaults to now)
 * @returns {Promise<{totalCost: number, breakdown: Array}>} Cost calculation result
 * @example
 * const result = await calculateProductCost('prod-123', new Date('2025-12-13'));
 * // returns { totalCost: 5000, breakdown: [{ partId: 'part-456', partCost: 1250, quantity: 2.5, subtotal: 3125 }, ...] }
 */
export async function calculateProductCost(productId, date = new Date()) {
    try {
        // Get the product's BOM
        const bom = await productCompositionRepository.getBOMForProduct(productId);

        // Handle both new structure {parts, fasteners} and legacy array structure
        const parts = bom.parts || (Array.isArray(bom) ? bom : []);
        const fasteners = bom.fasteners || [];

        if (parts.length === 0 && fasteners.length === 0) {
            console.warn(`[CostingService] Product ${productId} has no BOM`);
            return { totalCost: 0, breakdown: [] };
        }

        // Calculate cost for each part
        const breakdown = [];
        let totalCost = 0;

        // Process parts
        for (const bomEntry of parts) {
            const partCost = await getPartCostAtDate(bomEntry.partId, date);
            const subtotal = Math.round(partCost * bomEntry.quantityUsed);

            breakdown.push({
                partId: bomEntry.partId,
                type: 'part',
                partCost,
                quantity: bomEntry.quantityUsed,
                subtotal
            });

            totalCost += subtotal;
        }

        // Process fasteners
        for (const bomEntry of fasteners) {
            const fastenerCost = await getPartCostAtDate(bomEntry.fastenerId, date);
            const subtotal = Math.round(fastenerCost * bomEntry.quantityUsed);

            breakdown.push({
                partId: bomEntry.fastenerId,
                type: 'fastener',
                partCost: fastenerCost,
                quantity: bomEntry.quantityUsed,
                subtotal
            });

            totalCost += subtotal;
        }

        // Calculate labour cost if product has labour time
        let labourCost = 0;
        try {
            // Get product details to access labour time
            const productRef = doc(db, 'products', productId);
            const productSnap = await getDoc(productRef);
            if (productSnap.exists()) {
                const productData = productSnap.data();
                const labourHours = productData.labourHours || 0;
                const labourMinutes = productData.labourMinutes || 0;
                console.log('[CostingService] Labour data for product:', { productId, labourHours, labourMinutes });

                if (labourHours > 0 || labourMinutes > 0) {
                    const labourRate = await getLabourRate(); // cents per hour
                    const totalMinutes = (labourHours * 60) + labourMinutes;
                    labourCost = Math.round((totalMinutes / 60) * labourRate);

                    breakdown.push({
                        partId: 'LABOUR',
                        type: 'labour',
                        partCost: labourRate,
                        quantity: totalMinutes / 60, // hours
                        subtotal: labourCost
                    });

                    totalCost += labourCost;
                }
            }
        } catch (error) {
            console.warn('[CostingService] Error calculating labour cost:', error);
            // Continue without labour cost
        }

        return {
            totalCost: Math.round(totalCost),
            breakdown
        };
    } catch (error) {
        console.error('[CostingService] Error calculating product cost:', error);
        throw error;
    }
}

/**
 * Save a product cost entry (manual or calculated)
 * @description Creates a cost history entry for a product. If calculated, runs
 * the BOM calculation and stores the breakdown for auditability.
 * @param {string} productId - The product ID
 * @param {string} costType - 'MANUAL' or 'CALCULATED'
 * @param {Date|string} effectiveDate - When this cost becomes effective
 * @param {number} [manualCost] - Cost in cents (required if costType is MANUAL)
 * @param {string} createdBy - User ID who created this entry
 * @returns {Promise<Object>} Created cost entry
 * @example
 * const entry = await saveProductCost('prod-123', 'CALCULATED', new Date(), null, 'user-456');
 */
export async function saveProductCost(productId, costType, effectiveDate, manualCost = null, createdBy = 'system') {
    try {
        let costPrice;
        let calculationDetails = null;

        if (costType === 'CALCULATED') {
            // Calculate cost from BOM
            const calculation = await calculateProductCost(productId, effectiveDate);
            costPrice = calculation.totalCost;
            calculationDetails = {
                bomSnapshot: calculation.breakdown,
                totalCost: calculation.totalCost
            };
        } else if (costType === 'MANUAL') {
            if (manualCost === null || manualCost === undefined) {
                throw new Error('Manual cost is required when costType is MANUAL');
            }
            costPrice = manualCost;
        } else {
            throw new Error('Cost type must be MANUAL or CALCULATED');
        }

        return await productCostHistoryRepository.saveCost(
            productId,
            costPrice,
            costType,
            effectiveDate,
            calculationDetails,
            createdBy
        );
    } catch (error) {
        console.error('[CostingService] Error saving product cost:', error);
        throw error;
    }
}

/**
 * Forecast future product cost based on historical trends
 * @description Analyzes historical product costs to predict future cost at a
 * target date. Uses linear regression on cost history.
 * @param {string} productId - The product ID to forecast
 * @param {Date|string} forecastDate - The future date to forecast for
 * @returns {Promise<{forecastedCost: number, confidence: number}|null>} Forecast result or null
 * @example
 * const forecast = await forecastProductCost('prod-123', new Date('2026-01-01'));
 * // returns { forecastedCost: 5500, confidence: 0.92 }
 */
export async function forecastProductCost(productId, forecastDate) {
    try {
        // Get historical product costs
        const costHistory = await productCostHistoryRepository.getCostHistory(productId);

        if (!costHistory || costHistory.length < 2) {
            // Insufficient history - calculate from current part costs
            console.warn(`[CostingService] Insufficient cost history for product ${productId}, using current BOM costs`);
            const currentCost = await calculateProductCost(productId, forecastDate);
            return {
                forecastedCost: currentCost.totalCost,
                confidence: 0.5 // Low confidence without historical data
            };
        }

        // Use forecasting utility
        return forecastCostAtDate(costHistory, forecastDate);
    } catch (error) {
        console.error('[CostingService] Error forecasting product cost:', error);
        throw error;
    }
}
