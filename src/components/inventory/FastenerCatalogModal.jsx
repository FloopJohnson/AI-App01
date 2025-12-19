import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import { addFastenerToCatalog, updateFastener } from '../../services/inventoryService';
import { addCategory } from '../../services/categoryService';
import { generateNextFastenerSKU, checkFastenerSKUExists } from '../../utils/skuGenerator';
import { PartPricingTab } from './PartPricingTab';
import { ListPriceToggle } from './ListPriceToggle';
import { getLowestSupplierPrice } from '../../services/partPricingService';

export const FastenerCatalogModal = ({ isOpen, onClose, editingFastener = null }) => {
    const [categories, setCategories] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [generatingSKU, setGeneratingSKU] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [activeTab, setActiveTab] = useState('details');
    const [lowestSupplierPrice, setLowestSupplierPrice] = useState(null);
    const [listPriceSource, setListPriceSource] = useState('MANUAL');
    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        category: '',
        suppliers: [],
        description: '',
        costPrice: '',
        costPriceSource: 'MANUAL',
        listPrice: '',
        targetMarginPercent: 30,
        isSerialized: false,
        isSaleable: false,
        reorderLevel: 10
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Preserve list price and margin when toggling saleable
    const [preservedListPrice, setPreservedListPrice] = useState('');
    const [preservedTargetMargin, setPreservedTargetMargin] = useState(30);

    // Load categories from Firestore (filter for fastener categories)
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'part_categories'), (snap) => {
            const categoriesList = snap.docs
                .map(doc => doc.data())
                .filter(cat => cat.type === 'fastener'); // Filter only fastener categories
            categoriesList.sort((a, b) => a.name.localeCompare(b.name));
            setCategories(categoriesList);

            // Set default category if none selected
            if (!formData.category && categoriesList.length > 0) {
                setFormData(prev => ({ ...prev, category: categoriesList[0].name }));
            }
        });

        return () => unsubscribe();
    }, []);

    // Load suppliers from Firestore
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'suppliers'), (snap) => {
            const suppliersList = snap.docs.map(doc => doc.data());
            suppliersList.sort((a, b) => a.name.localeCompare(b.name));
            setSuppliers(suppliersList);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (editingFastener) {
            setFormData({
                sku: editingFastener.sku,
                name: editingFastener.name,
                category: editingFastener.category,
                // Migration: convert old supplier string to array
                suppliers: editingFastener.suppliers || (editingFastener.supplier ? [editingFastener.supplier] : []),
                description: editingFastener.description || '',
                costPrice: (editingFastener.costPrice / 100).toFixed(2),
                costPriceSource: editingFastener.costPriceSource || 'MANUAL',
                listPrice: (editingFastener.listPrice / 100).toFixed(2),
                targetMarginPercent: editingFastener.targetMarginPercent,
                isSerialized: editingFastener.isSerialized,
                isSaleable: editingFastener.isSaleable || false,
                reorderLevel: editingFastener.reorderLevel
            });
            setListPriceSource(editingFastener.listPriceSource || 'MANUAL');
        } else {
            setFormData({
                sku: '',
                name: '',
                category: categories.length > 0 ? categories[0].name : '',
                suppliers: [],
                description: '',
                costPrice: '',
                costPriceSource: 'MANUAL',
                listPrice: '',
                targetMarginPercent: 30,
                isSerialized: false,
                isSaleable: false,
                reorderLevel: 10
            });
            setListPriceSource('MANUAL');
        }
        setError('');
        setShowAddCategory(false);
        setNewCategoryName('');
        setActiveTab('details'); // Reset to details tab
    }, [editingFastener, isOpen, categories]);

    // Load lowest supplier price when editing
    useEffect(() => {
        const loadLowestPrice = async () => {
            if (editingFastener?.id) {
                try {
                    const validSuppliers = editingFastener.suppliers || [];
                    const lowest = await getLowestSupplierPrice(editingFastener.id, new Date(), validSuppliers);
                    setLowestSupplierPrice(lowest);
                } catch (err) {
                    console.error('Error loading lowest supplier price:', err);
                }
            } else {
                setLowestSupplierPrice(null);
            }
        };

        if (isOpen) {
            loadLowestPrice();
        }
    }, [editingFastener?.id, isOpen, formData.suppliers]);

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;

        try {
            await addCategory(newCategoryName, 'fastener'); // Add type parameter
            setFormData(prev => ({ ...prev, category: newCategoryName.trim() }));
            setNewCategoryName('');
            setShowAddCategory(false);
        } catch (err) {
            setError(err.message || 'Failed to add category');
        }
    };

    const handleGenerateSKU = async () => {
        if (!formData.category) {
            setError('Please select a category first');
            return;
        }

        setGeneratingSKU(true);
        try {
            const newSKU = await generateNextFastenerSKU(formData.category);
            setFormData(prev => ({ ...prev, sku: newSKU }));
        } catch (err) {
            setError(err.message || 'Failed to generate SKU');
        } finally {
            setGeneratingSKU(false);
        }
    };

    const handleAddSupplier = () => {
        if (!selectedSupplier) return;

        // Prevent duplicates
        const currentSuppliers = formData.suppliers || [];
        if (currentSuppliers.includes(selectedSupplier)) {
            setError(`"${selectedSupplier}" is already added`);
            setTimeout(() => setError(''), 3000);
            return;
        }

        setFormData(prev => ({
            ...prev,
            suppliers: [...(prev.suppliers || []), selectedSupplier]
        }));
        setSelectedSupplier('');
        setError('');
    };

    const handleRemoveSupplier = (supplierToRemove) => {
        setFormData(prev => ({
            ...prev,
            suppliers: (prev.suppliers || []).filter(s => s !== supplierToRemove)
        }));
    };

    // Calculate list price when in CALCULATED mode for saleable fasteners
    const calculatedListPrice = useMemo(() => {
        if (formData.isSaleable && listPriceSource === 'CALCULATED') {
            // Use active cost price based on source
            let costPrice;
            if (formData.costPriceSource === 'SUPPLIER_LOWEST' && lowestSupplierPrice) {
                costPrice = lowestSupplierPrice.costPrice; // Already in cents
            } else {
                costPrice = parseFloat(formData.costPrice || 0) * 100; // Convert to cents
            }

            const marginPercent = parseFloat(formData.targetMarginPercent || 0) / 100;

            if (marginPercent >= 1 || costPrice === 0) {
                return 0;
            }

            return Math.round(costPrice / (1 - marginPercent));
        }
        return 0;
    }, [formData.isSaleable, listPriceSource, formData.costPrice, formData.costPriceSource, formData.targetMarginPercent, lowestSupplierPrice]);

    // Auto-generate SKU when category changes (only for new fasteners)
    useEffect(() => {
        if (!editingFastener && formData.category && !formData.sku) {
            handleGenerateSKU();
        }
    }, [formData.category]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
            // Check for duplicate SKU
            const skuExists = await checkFastenerSKUExists(formData.sku.trim(), editingFastener?.id);
            if (skuExists) {
                setError(`SKU "${formData.sku}" already exists. Please use a different SKU.`);
                setSaving(false);
                return;
            }

            // Convert dollars to cents, handle empty/optional values
            const costPriceValue = parseFloat(formData.costPrice || '0');
            const costPriceCents = Math.round(costPriceValue * 100);

            // Calculate list price based on source
            let listPriceCents;
            if (formData.isSaleable && listPriceSource === 'CALCULATED') {
                listPriceCents = calculatedListPrice;
            } else {
                const listPriceValue = parseFloat(formData.listPrice || '0');
                listPriceCents = Math.round(listPriceValue * 100);
            }

            const fastenerData = {
                sku: formData.sku.trim(),
                name: formData.name.trim(),
                category: formData.category.trim(),
                suppliers: formData.suppliers || [],
                description: formData.description.trim(),
                costPrice: costPriceCents,
                costPriceSource: formData.costPriceSource,
                listPrice: listPriceCents,
                listPriceSource: formData.isSaleable ? listPriceSource : 'MANUAL',
                targetMarginPercent: parseFloat(formData.targetMarginPercent || '0'),
                isSerialized: formData.isSerialized,
                isSaleable: formData.isSaleable,
                reorderLevel: parseInt(formData.reorderLevel || '0')
            };

            if (editingFastener) {
                await updateFastener(editingFastener.id, fastenerData);
            } else {
                await addFastenerToCatalog(fastenerData);
            }

            onClose();
        } catch (err) {
            setError(err.message || 'Failed to save fastener');
        } finally {
            setSaving(false);
        }
    };

    const calculatedMargin = useMemo(() => {
        // Determine active cost based on cost source
        const activeCost = formData.costPriceSource === 'SUPPLIER_LOWEST' && lowestSupplierPrice
            ? lowestSupplierPrice.costPrice / 100  // Convert from cents to dollars
            : parseFloat(formData.costPrice) || 0;

        const list = parseFloat(formData.listPrice) || 0;
        if (list === 0) return 0;
        return ((list - activeCost) / list * 100).toFixed(1);
    }, [formData.costPrice, formData.listPrice, formData.costPriceSource, lowestSupplierPrice]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-slate-900 w-full max-w-2xl rounded-xl border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
                    <div className="flex items-center justify-between p-6 pb-0">
                        <h2 className="text-xl font-bold text-white">
                            {editingFastener ? 'Edit Fastener' : 'Add New Fastener'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <Icons.X size={20} className="text-slate-400" />
                        </button>
                    </div>

                    {/* Tab Navigation */}
                    {editingFastener && (
                        <div className="flex gap-2 px-6 pt-4">
                            <button
                                type="button"
                                onClick={() => setActiveTab('details')}
                                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${activeTab === 'details'
                                    ? 'bg-slate-800 text-white border-b-2 border-cyan-500'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                                    }`}
                            >
                                Details
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('pricing')}
                                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${activeTab === 'pricing'
                                    ? 'bg-slate-800 text-white border-b-2 border-cyan-500'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                                    }`}
                            >
                                Pricing
                            </button>
                        </div>
                    )}
                </div>

                {/* Tab Content */}
                {activeTab === 'details' ? (
                    /* Form */
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">{error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                        <div className="grid grid-cols-2 gap-4">
                            {/* SKU */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    SKU <span className="text-red-400">*</span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        required
                                        value={formData.sku}
                                        onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        placeholder="BOLT-001"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleGenerateSKU}
                                        disabled={generatingSKU || !formData.category}
                                        className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Auto-generate SKU"
                                    >
                                        {generatingSKU ? (
                                            <Icons.Loader size={16} className="animate-spin" />
                                        ) : (
                                            <Icons.RotateCcw size={16} />
                                        )}
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">
                                    Auto-generates based on category
                                </p>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Category <span className="text-red-400">*</span>
                                </label>
                                {showAddCategory ? (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                                            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                            placeholder="New category name"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddCategory}
                                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                                        >
                                            <Icons.Check size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowAddCategory(false)}
                                            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                        >
                                            <Icons.X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <select
                                            required
                                            value={formData.category}
                                            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        >
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => setShowAddCategory(true)}
                                            className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                                            title="Add new category"
                                        >
                                            <Icons.Plus size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Name <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                placeholder="M8 x 50mm Hex Bolt"
                            />
                        </div>

                        {/* Suppliers */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Suppliers
                            </label>
                            <div className="space-y-3">
                                {/* Add Supplier */}
                                <div className="flex gap-2">
                                    <select
                                        value={selectedSupplier}
                                        onChange={(e) => setSelectedSupplier(e.target.value)}
                                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    >
                                        <option value="">-- Select Supplier --</option>
                                        {suppliers.map(supplier => (
                                            <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={handleAddSupplier}
                                        disabled={!selectedSupplier}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        <Icons.Plus size={16} />
                                        Add
                                    </button>
                                </div>

                                {/* Suppliers List */}
                                {formData.suppliers?.length > 0 && (
                                    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <p className="text-xs text-slate-400 mb-2">Added Suppliers:</p>
                                        <div className="space-y-1">
                                            {formData.suppliers.map((supplier, index) => (
                                                <div key={index} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                                                    <span className="text-sm text-white">{supplier}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveSupplier(supplier)}
                                                        className="p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                                                        title="Remove supplier"
                                                    >
                                                        <Icons.X size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                rows="2"
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                placeholder="Optional details..."
                            />
                        </div>

                        {/* Cost Price Source & Pricing */}
                        <div className="space-y-4">
                            {/* Cost Price Source Toggle */}
                            {editingFastener && (
                                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                    <label className="block text-sm font-medium text-slate-300 mb-3">
                                        Cost Price Source
                                    </label>
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="costPriceSource"
                                                value="MANUAL"
                                                checked={formData.costPriceSource === 'MANUAL'}
                                                onChange={(e) => setFormData(prev => ({ ...prev, costPriceSource: e.target.value }))}
                                                className="w-4 h-4 text-cyan-600"
                                            />
                                            <span className="text-white">Manual Entry</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="costPriceSource"
                                                value="SUPPLIER_LOWEST"
                                                checked={formData.costPriceSource === 'SUPPLIER_LOWEST'}
                                                onChange={(e) => setFormData(prev => ({ ...prev, costPriceSource: e.target.value }))}
                                                className="w-4 h-4 text-cyan-600"
                                            />
                                            <span className="text-white">Lowest Supplier Price</span>
                                        </label>
                                    </div>

                                    {/* Price Comparison */}
                                    <div className="mt-4 pt-4 border-t border-slate-600 space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Manual Cost:</span>
                                            <span className="text-white font-mono">
                                                {formData.costPrice ? `$${parseFloat(formData.costPrice).toFixed(2)}` : '--'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Lowest Supplier:</span>
                                            <span className="text-white font-mono">
                                                {lowestSupplierPrice ? (
                                                    <>
                                                        ${(lowestSupplierPrice.costPrice / 100).toFixed(2)}
                                                        <span className="text-slate-500 ml-2">({lowestSupplierPrice.supplierName})</span>
                                                    </>
                                                ) : '--'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t border-slate-600">
                                            <span className="text-cyan-400 font-medium">Active Cost:</span>
                                            <span className="text-cyan-400 font-bold font-mono">
                                                {formData.costPriceSource === 'SUPPLIER_LOWEST' && lowestSupplierPrice
                                                    ? `$${(lowestSupplierPrice.costPrice / 100).toFixed(2)}`
                                                    : formData.costPrice ? `$${parseFloat(formData.costPrice).toFixed(2)}` : '--'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Cost and List Price Inputs */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Manual Cost Price - Only show when using manual entry */}
                                {(!editingFastener || formData.costPriceSource === 'MANUAL') && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">
                                            {editingFastener ? 'Manual Cost Price ($)' : 'Cost Price ($)'}
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={formData.costPrice}
                                            onChange={(e) => setFormData(prev => ({ ...prev, costPrice: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                            placeholder="0.00"
                                        />
                                    </div>
                                )}

                                {/* List Price - Only show if saleable */}
                                {formData.isSaleable && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">
                                            List Price ($)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={formData.listPrice}
                                            onChange={(e) => setFormData(prev => ({ ...prev, listPrice: e.target.value }))}
                                            disabled={listPriceSource === 'CALCULATED'}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            placeholder="0.00"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* List Price Source Toggle - Only show if saleable */}
                        {formData.isSaleable && (
                            <ListPriceToggle
                                listPriceSource={listPriceSource}
                                onChange={setListPriceSource}
                                itemType="part"
                            />
                        )}

                        {/* Calculated List Price Display - Only show if saleable and CALCULATED */}
                        {formData.isSaleable && listPriceSource === 'CALCULATED' && (
                            <div className="p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/30 space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-300">
                                        Cost Price ({formData.costPriceSource === 'SUPPLIER_LOWEST' ? 'Supplier Lowest' : 'Manual'}):
                                    </span>
                                    <span className="font-mono text-white">
                                        ${(() => {
                                            if (formData.costPriceSource === 'SUPPLIER_LOWEST' && lowestSupplierPrice) {
                                                return (lowestSupplierPrice.costPrice / 100).toFixed(2);
                                            }
                                            return formData.costPrice || '0.00';
                                        })()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-300">Target Margin:</span>
                                    <span className="font-mono text-white">{formData.targetMarginPercent}%</span>
                                </div>
                                <div className="h-px bg-cyan-500/30"></div>
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-white">Calculated List Price:</span>
                                    <span className="text-xl font-bold text-cyan-400">
                                        ${(calculatedListPrice / 100).toFixed(2)}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-2">
                                    <Icons.Info size={12} className="inline mr-1" />
                                    This price will update automatically when cost price changes
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2"></div>

                            {/* Target Margin - Only show if saleable */}
                            {formData.isSaleable && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                        Target Margin
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="1"
                                            value={formData.targetMarginPercent}
                                            onChange={(e) => setFormData(prev => ({ ...prev, targetMarginPercent: e.target.value }))}
                                            className="w-full pr-7 pl-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Calculated Margin Display - Only show if saleable */}
                        {formData.isSaleable && (
                            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-400">Calculated Margin:</span>
                                    <span className={`text-lg font-bold ${parseFloat(calculatedMargin) >= formData.targetMarginPercent
                                        ? 'text-emerald-400'
                                        : 'text-amber-400'
                                        }`}>
                                        {calculatedMargin}%
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-4">
                            {/* Serialized Toggle */}
                            <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                <input
                                    type="checkbox"
                                    id="isSerialized"
                                    checked={formData.isSerialized}
                                    onChange={(e) => setFormData(prev => ({ ...prev, isSerialized: e.target.checked }))}
                                    className="w-4 h-4 rounded border-slate-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900"
                                />
                                <label htmlFor="isSerialized" className="text-sm text-slate-300 cursor-pointer">
                                    Track by Serial Number
                                </label>
                            </div>

                            {/* Saleable Toggle */}
                            <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                <input
                                    type="checkbox"
                                    id="isSaleable"
                                    checked={formData.isSaleable}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        if (!checked) {
                                            // Unchecking: Preserve values then clear
                                            setPreservedListPrice(formData.listPrice);
                                            setPreservedTargetMargin(formData.targetMarginPercent);
                                            setFormData(prev => ({
                                                ...prev,
                                                isSaleable: false,
                                                listPrice: '',
                                                targetMarginPercent: 30
                                            }));
                                        } else {
                                            // Checking: Restore preserved values
                                            setFormData(prev => ({
                                                ...prev,
                                                isSaleable: true,
                                                listPrice: preservedListPrice,
                                                targetMarginPercent: preservedTargetMargin
                                            }));
                                        }
                                    }}
                                    className="w-4 h-4 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-900"
                                />
                                <label htmlFor="isSaleable" className="text-sm text-slate-300 cursor-pointer">
                                    Saleable to Customers
                                </label>
                            </div>

                            {/* Reorder Level */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Reorder Level
                                </label>
                                <input
                                    type="number"
                                    value={formData.reorderLevel}
                                    onChange={(e) => setFormData(prev => ({ ...prev, reorderLevel: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Saving...' : (editingFastener ? 'Update Fastener' : 'Add Fastener')}
                            </button>
                        </div>
                    </form>
                ) : (
                    /* Pricing Tab */
                    <PartPricingTab
                        part={editingFastener}
                        suppliers={formData.suppliers || []}
                    />
                )}
            </div>
        </div >
    );
};
