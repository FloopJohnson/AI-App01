// Type declarations for categoryService.js

export interface Category {
    id: string;
    name: string;
    parentId: string | null;
    path: string[];
    createdAt: any;
    updatedAt: any;
}

export interface CategoryUsage {
    inUse: boolean;
    count: number;
    collections?: string[];
}

export function getAllCategories(): Promise<Category[]>;
export function getCategoryById(id: string): Promise<Category | null>;
export function createCategory(data: Partial<Category>): Promise<string>;
export function updateCategory(id: string, data: Partial<Category>): Promise<void>;
export function deleteCategory(id: string): Promise<void>;
export function checkCategoryUsage(id: string): Promise<CategoryUsage>;
export function initializeDefaultCategories(): Promise<void>;
