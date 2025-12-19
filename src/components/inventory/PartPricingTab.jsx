import React, { useState, useEffect } from 'react';
import { Icons } from '../../constants/icons';
import {
    getPricingForPart,
    addPricing,
    updatePricing,
    deletePricing,
    checkDuplicatePricing
} from '../../services/partPricingService';

export const PartPricingTab = ({ part, suppliers }) => {
    const [pricingEntries, setPricingEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        supplier: '',
        effectiveDate: '',
        costPrice: '',
        notes: ''
    });

    // Load pricing entries
    useEffect(() => {
        if (part?.id) {
            loadPricing();
        }
    }, [part?.id]);

    const loadPricing = async () => {
        try {
            setLoading(true);
            const pricing = await getPricingForPart(part.id);
            setPricingEntries(pricing);
        } catch (err) {
            console.error('Error loading pricing:', err);
            setError('Failed to load pricing');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            // Validation
            if (!formData.supplier || !formData.effectiveDate || !formData.costPrice) {
                setError('Please fill in all required fields');
                return;
            }

            const costPriceCents = Math.round(parseFloat(formData.costPrice) * 100);
            if (costPriceCents <= 0) {
                setError('Cost price must be greater than 0');
                return;
            }

            // Check for duplicates
            const isDuplicate = await checkDuplicatePricing(
                part.id,
                formData.supplier,
                new Date(formData.effectiveDate),
                editingId
            );

            if (isDuplicate) {
                setError(`Pricing already exists for ${formData.supplier} on this date`);
                return;
            }

            if (editingId) {
                // Update existing
                await updatePricing(editingId, {
                    supplierName: formData.supplier,
                    effectiveDate: new Date(formData.effectiveDate),
                    costPrice: costPriceCents,
                    notes: formData.notes
                });
            } else {
                // Add new
                await addPricing(
                    part.id,
                    part.sku,
                    formData.supplier,
                    costPriceCents,
                    new Date(formData.effectiveDate),
                    formData.notes
                );
            }

            // Reset form and reload
            resetForm();
            await loadPricing();
        } catch (err) {
            console.error('Error saving pricing:', err);
            setError('Failed to save pricing');
        }
    };

    const handleEdit = (pricing) => {
        setEditingId(pricing.id);
        setFormData({
            supplier: pricing.supplierName,
            effectiveDate: (() => {
                const d = new Date(pricing.effectiveDate);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            })(),
            costPrice: (pricing.costPrice / 100).toFixed(2),
            notes: pricing.notes || ''
        });
        setError('');
    };

    const handleDelete = async (pricingId) => {
        if (!confirm('Are you sure you want to delete this pricing entry?')) return;

        try {
            await deletePricing(pricingId);
            await loadPricing();
        } catch (err) {
            console.error('Error deleting pricing:', err);
            setError('Failed to delete pricing');
        }
    };

    const resetForm = () => {
        setFormData({
            supplier: '',
            effectiveDate: '',
            costPrice: '',
            notes: ''
        });
        setEditingId(null);
        setError('');
    };

    const formatCurrency = (cents) => {
        return `$${(cents / 100).toFixed(2)}`;
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-AU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getPricingStatus = (effectiveDate) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const priceDate = new Date(effectiveDate);
        priceDate.setHours(0, 0, 0, 0);

        if (priceDate > today) {
            return { label: 'Future', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
        } else if (priceDate.getTime() === today.getTime()) {
            return { label: 'Today', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
        } else {
            // Check if this is the most recent for this supplier
            const supplierPricing = pricingEntries.filter(p => p.supplierName === pricingEntries.find(x => x.effectiveDate === effectiveDate)?.supplierName);
            const mostRecent = supplierPricing.filter(p => p.effectiveDate <= today).sort((a, b) => b.effectiveDate - a.effectiveDate)[0];

            if (mostRecent && mostRecent.effectiveDate.getTime() === priceDate.getTime()) {
                return { label: 'Current', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
            }
            return { label: 'Historical', color: 'bg-slate-600/20 text-slate-400 border-slate-600/30' };
        }
    };

    // Group pricing by supplier
    const groupedPricing = pricingEntries.reduce((acc, pricing) => {
        if (!acc[pricing.supplierName]) {
            acc[pricing.supplierName] = [];
        }
        acc[pricing.supplierName].push(pricing);
        return acc;
    }, {});

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Loading pricing...</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Add/Edit Form */}
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
                <h3 className="text-lg font-semibold text-white mb-4">
                    {editingId ? 'Edit Pricing Entry' : 'Add Pricing Entry'}
                </h3>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Supplier */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Supplier <span className="text-red-400">*</span>
                            </label>
                            <select
                                value={formData.supplier}
                                onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                required
                            >
                                <option value="">-- Select Supplier --</option>
                                {suppliers.map((supplier, index) => (
                                    <option key={index} value={supplier}>{supplier}</option>
                                ))}
                            </select>
                        </div>

                        {/* Effective Date */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Effective Date <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.effectiveDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, effectiveDate: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                required
                            />
                        </div>

                        {/* Cost Price */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Cost Price ($) <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={formData.costPrice}
                                onChange={(e) => setFormData(prev => ({ ...prev, costPrice: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                placeholder="0.00"
                                required
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Notes
                            </label>
                            <input
                                type="text"
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                placeholder="Optional notes..."
                                maxLength={500}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        {editingId && (
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            type="submit"
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <Icons.Plus size={16} />
                            {editingId ? 'Update Price' : 'Add Price'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Pricing List */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Pricing History</h3>

                {Object.keys(groupedPricing).length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        No pricing entries yet. Add your first pricing entry above.
                    </div>
                ) : (
                    Object.entries(groupedPricing).map(([supplierName, pricing]) => (
                        <div key={supplierName} className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
                            <h4 className="text-md font-semibold text-white mb-3">{supplierName}</h4>
                            <div className="space-y-2">
                                {pricing.map((entry) => {
                                    const status = getPricingStatus(entry.effectiveDate);
                                    return (
                                        <div
                                            key={entry.id}
                                            className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                                        >
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="text-sm text-slate-300 font-mono w-24">
                                                    {formatDate(entry.effectiveDate)}
                                                </div>
                                                <div className="text-lg font-bold text-white w-24">
                                                    {formatCurrency(entry.costPrice)}
                                                </div>
                                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${status.color}`}>
                                                    {status.label}
                                                </span>
                                                {entry.notes && (
                                                    <div className="text-sm text-slate-400 flex-1">
                                                        {entry.notes}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(entry)}
                                                    className="p-1.5 hover:bg-blue-500/20 rounded text-blue-400 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Icons.Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(entry.id)}
                                                    className="p-1.5 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Icons.Trash size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
