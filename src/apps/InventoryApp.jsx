import React, { useState } from 'react';
import { PartCatalogTable } from '../components/inventory/PartCatalogTable';
import { PartCatalogModal } from '../components/inventory/PartCatalogModal';
import { ProductCatalogTable } from '../components/inventory/ProductCatalogTable';
import { ProductCatalogModal } from '../components/inventory/ProductCatalogModal';
import { LocationManager } from '../components/inventory/LocationManager';
import { SupplierManager } from '../components/inventory/SupplierManager';
import { StockOverview } from '../components/inventory/StockOverview';
import { StockAdjustmentModal } from '../components/inventory/StockAdjustmentModal';
import { SerializedAssetsView } from '../components/inventory/SerializedAssetsView';
import { StockMovementHistory } from '../components/inventory/StockMovementHistory';
import { StockTakeMode } from '../components/inventory/StockTakeMode';
import { CategoryManager } from '../components/inventory/CategoryManager';
import { FastenerCatalogTable } from '../components/inventory/FastenerCatalogTable';
import { FastenerCatalogModal } from '../components/inventory/FastenerCatalogModal';
import { LabourRateModal } from '../components/settings/LabourRateModal';
import { initializeInventorySystem } from '../services/initInventory';
import { Icons } from '../constants/icons';

export function InventoryApp() {
    const [activeTab, setActiveTab] = useState('catalog');
    const [isPartModalOpen, setIsPartModalOpen] = useState(false);
    const [editingPart, setEditingPart] = useState(null);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [isStockAdjustmentOpen, setIsStockAdjustmentOpen] = useState(false);
    const [adjustingPart, setAdjustingPart] = useState(null);
    const [initializing, setInitializing] = useState(false);
    const [refreshProductCosts, setRefreshProductCosts] = useState(0);

    // Fastener catalog state
    const [showFastenerModal, setShowFastenerModal] = useState(false);
    const [editingFastener, setEditingFastener] = useState(null);
    const [showLabourRateModal, setShowLabourRateModal] = useState(false);

    const handleAddPart = () => {
        setEditingPart(null);
        setIsPartModalOpen(true);
    };

    const handleEditPart = (part) => {
        setEditingPart(part);
        setIsPartModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsPartModalOpen(false);
        setEditingPart(null);
    };

    const handleAddProduct = () => {
        setEditingProduct(null);
        setIsProductModalOpen(true);
    };

    const handleEditProduct = (product) => {
        setEditingProduct(product);
        setIsProductModalOpen(true);
    };

    const handleCloseProductModal = () => {
        setIsProductModalOpen(false);
        setEditingProduct(null);
    };

    const handleAddFastener = () => {
        setEditingFastener(null);
        setShowFastenerModal(true);
    };

    const handleEditFastener = (fastener) => {
        setEditingFastener(fastener);
        setShowFastenerModal(true);
    };

    const handleCloseFastenerModal = () => {
        setShowFastenerModal(false);
        setEditingFastener(null);
    };

    const handleAdjustStock = (part) => {
        setAdjustingPart(part);
        setIsStockAdjustmentOpen(true);
    };

    const handleCloseStockAdjustment = () => {
        setIsStockAdjustmentOpen(false);
        setAdjustingPart(null);
    };

    const handleInitialize = async () => {
        if (!confirm('Initialize default categories and Warehouse - Banyo location?')) return;

        setInitializing(true);
        try {
            await initializeInventorySystem();
            alert('✅ Inventory system initialized successfully!');
        } catch (err) {
            alert('❌ Initialization failed: ' + err.message);
        } finally {
            setInitializing(false);
        }
    };

    const tabs = [
        { id: 'catalog', label: 'Part Catalog', icon: Icons.Package },
        { id: 'fasteners', label: 'Fastener Catalog', icon: Icons.Wrench },
        { id: 'products', label: 'Product Catalog', icon: Icons.Box },
        { id: 'stock', label: 'Stock Levels', icon: Icons.Database },
        { id: 'serialized', label: 'Serialized Assets', icon: Icons.Barcode },
        { id: 'categories', label: 'Categories', icon: Icons.FolderTree },
        { id: 'locations', label: 'Locations', icon: Icons.MapPin },
        { id: 'suppliers', label: 'Suppliers', icon: Icons.Truck },
        { id: 'stocktake', label: 'Stock Take', icon: Icons.ClipboardList },
        { id: 'history', label: 'Movement History', icon: Icons.History }
    ];

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
            {/* Header */}
            <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Inventory Management</h1>
                        <p className="text-sm text-slate-400 mt-1">Track parts, stock levels, and serialized assets</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleInitialize}
                            disabled={initializing}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50"
                            title="Initialize default categories and location"
                        >
                            <Icons.Zap size={18} />
                            {initializing ? 'Initializing...' : 'Initialize System'}
                        </button>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowLabourRateModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                                title="Labour Rate Settings"
                            >
                                <Icons.Settings size={18} />
                                Settings
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                            >
                                <Icons.ArrowLeft size={18} />
                                Return to Portal
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Tab Navigation */}
            <div className="bg-slate-800/60 border-b border-slate-700 px-6">
                <div className="flex gap-1 overflow-x-auto">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 font-medium transition-all whitespace-nowrap ${isActive
                                    ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-700/50'
                                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'
                                    }`}
                            >
                                <Icon size={18} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 p-6">
                <div className="max-w-7xl mx-auto h-full">
                    {activeTab === 'catalog' && (
                        <PartCatalogTable
                            onAddPart={handleAddPart}
                            onEditPart={handleEditPart}
                        />
                    )}

                    {activeTab === 'fasteners' && (
                        <FastenerCatalogTable
                            onAddFastener={handleAddFastener}
                            onEditFastener={handleEditFastener}
                        />
                    )}

                    {activeTab === 'products' && (
                        <ProductCatalogTable
                            onAddProduct={handleAddProduct}
                            onEditProduct={handleEditProduct}
                            refreshTrigger={refreshProductCosts}
                        />
                    )}

                    {activeTab === 'stock' && (
                        <StockOverview onAdjustStock={handleAdjustStock} />
                    )}

                    {activeTab === 'serialized' && <SerializedAssetsView />}

                    {activeTab === 'categories' && <CategoryManager />}

                    {activeTab === 'locations' && <LocationManager />}

                    {activeTab === 'suppliers' && <SupplierManager />}

                    {activeTab === 'stocktake' && <StockTakeMode />}

                    {activeTab === 'history' && <StockMovementHistory />}
                </div>
            </main>

            {/* Modals */}
            <PartCatalogModal
                isOpen={isPartModalOpen}
                onClose={handleCloseModal}
                editingPart={editingPart}
            />
            <ProductCatalogModal
                isOpen={isProductModalOpen}
                onClose={handleCloseProductModal}
                editingProduct={editingProduct}
                onSuccess={() => setRefreshProductCosts(prev => prev + 1)}
            />
            <FastenerCatalogModal
                isOpen={showFastenerModal}
                onClose={handleCloseFastenerModal}
                editingFastener={editingFastener}
            />

            {/* Labour Rate Settings Modal */}
            <LabourRateModal
                isOpen={showLabourRateModal}
                onClose={() => setShowLabourRateModal(false)}
            />
            <StockAdjustmentModal
                isOpen={isStockAdjustmentOpen}
                onClose={handleCloseStockAdjustment}
                part={adjustingPart}
            />
        </div>
    );
}
