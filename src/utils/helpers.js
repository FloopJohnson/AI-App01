// ==========================================
// HELPER: DATE FORMATTER
// ==========================================
/**
 * Formats a date string into DD-MM-YYYY format with optional time
 * 
 * @description Converts ISO date strings or Date objects into a human-readable
 * format. Handles invalid dates gracefully by returning the original string.
 * Optionally includes time in HH:MM format.
 * @param {string|Date} dateString - The date to format (ISO string or Date object)
 * @param {boolean} [includeTime=false] - Whether to append time in HH:MM format
 * @returns {string} Formatted date string in DD-MM-YYYY format, or original string if invalid
 * @example
 * // Basic date formatting
 * formatDate('2024-12-13'); // Returns: '13-12-2024'
 * 
 * @example
 * // With time
 * formatDate('2024-12-13T09:30:00', true); // Returns: '13-12-2024 09:30'
 * 
 * @example
 * // Invalid date handling
 * formatDate('invalid'); // Returns: 'invalid'
 */
export const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    let result = `${day}-${month}-${year}`;

    if (includeTime) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        result += ` ${hours}:${minutes}`;
    }

    return result;
};

/**
 * Formats a complete location string from site address components
 * 
 * @description Constructs a human-readable location string by combining street address,
 * city, state, postcode, and country. Falls back to location name if no detailed address
 * is provided. Omits 'Australia' from output unless country is different.
 * @param {Object} siteForm - Site form object containing address fields
 * @param {string} [siteForm.streetAddress] - Street address
 * @param {string} [siteForm.city] - City or suburb name
 * @param {string} [siteForm.state] - State abbreviation (e.g., 'QLD')
 * @param {string} [siteForm.postcode] - Postal code
 * @param {string} [siteForm.country] - Country name
 * @param {string} [siteForm.location] - Fallback location name
 * @returns {string} Formatted location string or placeholder text
 * @example
 * // Full address
 * formatFullLocation({
 *   streetAddress: '123 Main St',
 *   city: 'Townsville',
 *   state: 'QLD',
 *   postcode: '4810',
 *   country: 'Australia'
 * }); // Returns: '123 Main St, Townsville, QLD, 4810'
 * 
 * @example
 * // Fallback to location name
 * formatFullLocation({ location: 'North Mine' }); // Returns: 'North Mine'
 * 
 * @example
 * // Empty form
 * formatFullLocation({}); // Returns: 'Location will appear here...'
 */
export const formatFullLocation = (siteForm) => {
  const parts = [];

  if (siteForm.streetAddress) parts.push(siteForm.streetAddress);
  if (siteForm.city) parts.push(siteForm.city);
  if (siteForm.state) parts.push(siteForm.state);
  if (siteForm.postcode) parts.push(siteForm.postcode);
  if (siteForm.country && siteForm.country !== 'Australia') parts.push(siteForm.country);

  // If no detailed address, fallback to location name
  if (parts.length === 0 && siteForm.location) {
    return siteForm.location;
  }

  return parts.join(', ') || 'Location will appear here...';
};

