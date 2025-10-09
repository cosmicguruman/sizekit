/**
 * Utility functions for SizeKit
 */

const Utils = {
    /**
     * Sleep for specified milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Format error message for display
     * @param {Error} error - Error object
     * @returns {string} Formatted error message
     */
    formatError(error) {
        return `Error: ${error.message}`;
    }
};

// Export as global for now
window.Utils = Utils;
