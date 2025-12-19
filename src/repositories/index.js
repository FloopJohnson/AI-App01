import { QuoteRepository } from './QuoteRepository';
import { CustomerRepository } from './CustomerRepository';
import { SiteRepository } from './SiteRepository';
import { EmployeeRepository } from './EmployeeRepository';
import { PartCostHistoryRepository } from './PartCostHistoryRepository';
import { ProductRepository } from './ProductRepository';
import { ProductCompositionRepository } from './ProductCompositionRepository';
import { ProductCostHistoryRepository } from './ProductCostHistoryRepository';

// Singleton instances - use these throughout the app
export const quoteRepository = new QuoteRepository();
export const customerRepository = new CustomerRepository();
export const siteRepository = new SiteRepository();
export const employeeRepository = new EmployeeRepository();
export const partCostHistoryRepository = new PartCostHistoryRepository();
export const productRepository = new ProductRepository();
export const productCompositionRepository = new ProductCompositionRepository();
export const productCostHistoryRepository = new ProductCostHistoryRepository();

// Export classes for testing or custom instances
export {
    QuoteRepository,
    CustomerRepository,
    SiteRepository,
    EmployeeRepository,
    PartCostHistoryRepository,
    ProductRepository,
    ProductCompositionRepository,
    ProductCostHistoryRepository
};
export { BaseRepository } from './BaseRepository';
