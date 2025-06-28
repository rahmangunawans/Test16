// Main application JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle - Optimized
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    let isMenuOpen = false;
    
    function toggleMobileMenu() {
        if (!mobileMenu) return;
        
        isMenuOpen = !isMenuOpen;
        
        if (isMenuOpen) {
            mobileMenu.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        } else {
            mobileMenu.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }
    
    // Single event listener for menu button
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleMobileMenu();
        });
        
        // Close menu events
        mobileMenu.addEventListener('click', function(e) {
            // Close on backdrop click or close button
            if (e.target === mobileMenu || e.target.closest('#mobile-menu-close')) {
                e.preventDefault();
                if (isMenuOpen) toggleMobileMenu();
            }
        });
        
        // Close on navigation link click
        mobileMenu.addEventListener('click', function(e) {
            if (e.target.tagName === 'A' && e.target.closest('a[href]')) {
                if (isMenuOpen) toggleMobileMenu();
            }
        });
        
        // Close on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && isMenuOpen) {
                toggleMobileMenu();
            }
        });
    }
    
    // Enhanced search functionality for both desktop and mobile
    const searchInput = document.getElementById('search-input');
    const mobileSearchInput = document.getElementById('mobile-search-input');
    const mobileSearchInputLogged = document.getElementById('mobile-search-input-logged');
    let searchTimeout;
    let currentSearchQuery = '';
    
    // Initialize search inputs
    
    // Function to setup search functionality
    function setupSearchInput(inputElement, containerId) {
        if (!inputElement) return;
        
        // Create search container if it doesn't exist
        const existingContainer = document.getElementById(containerId);
        if (!existingContainer && containerId === 'search-container') {
            const searchContainer = document.createElement('div');
            searchContainer.id = containerId;
            searchContainer.className = 'relative';
            inputElement.parentNode.insertBefore(searchContainer, inputElement);
            searchContainer.appendChild(inputElement);
        }
        
        inputElement.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            currentSearchQuery = query;
            
            if (query.length >= 2) {
                showSearchLoading(containerId);
                searchTimeout = setTimeout(() => {
                    performSearch(query, containerId);
                }, 200);
            } else {
                hideSearchResults(containerId);
            }
        });
        
        // Handle keyboard navigation
        inputElement.addEventListener('keydown', function(e) {
            const results = document.querySelector('#search-results, #mobile-search-results');
            if (!results) return;
            
            const items = results.querySelectorAll('.search-result-item');
            const currentActive = results.querySelector('.search-result-item.active');
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentActive) {
                    currentActive.classList.remove('active');
                    const next = currentActive.nextElementSibling;
                    if (next) {
                        next.classList.add('active');
                    } else {
                        items[0]?.classList.add('active');
                    }
                } else {
                    items[0]?.classList.add('active');
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentActive) {
                    currentActive.classList.remove('active');
                    const prev = currentActive.previousElementSibling;
                    if (prev) {
                        prev.classList.add('active');
                    } else {
                        items[items.length - 1]?.classList.add('active');
                    }
                } else {
                    items[items.length - 1]?.classList.add('active');
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const activeItem = results.querySelector('.search-result-item.active');
                if (activeItem) {
                    const link = activeItem.querySelector('a');
                    if (link) {
                        window.location.href = link.href;
                    }
                }
            } else if (e.key === 'Escape') {
                hideSearchResults(containerId);
                inputElement.blur();
            }
        });
        
        // Focus handling
        inputElement.addEventListener('focus', function() {
            if (currentSearchQuery.length >= 2) {
                performSearch(currentSearchQuery, containerId);
            }
        });
    }
    
    // Setup all search inputs
    setupSearchInput(searchInput, 'search-container');
    setupSearchInput(mobileSearchInput, 'mobile-search-container');
    setupSearchInput(mobileSearchInputLogged, 'mobile-search-container-logged');
    
    // Hide search results when clicking outside
    document.addEventListener('click', function(e) {
        const searchContainer = document.getElementById('search-container');
        const mobileSearchContainer = document.getElementById('mobile-search-container');
        const mobileSearchContainerLogged = document.getElementById('mobile-search-container-logged');
        
        if (searchContainer && !searchContainer.contains(e.target)) {
            hideSearchResults('search-container');
        }
        if (mobileSearchContainer && !mobileSearchContainer.contains(e.target)) {
            hideSearchResults('mobile-search-container');
        }
        if (mobileSearchContainerLogged && !mobileSearchContainerLogged.contains(e.target)) {
            hideSearchResults('mobile-search-container-logged');
        }
    });
    
    if (searchInput || mobileSearchInput) {
        // Create search container if it doesn't exist
        if (!document.getElementById('search-container')) {
            const searchContainer = document.createElement('div');
            searchContainer.id = 'search-container';
            searchContainer.className = 'relative';
            searchInput.parentNode.insertBefore(searchContainer, searchInput);
            searchContainer.appendChild(searchInput);
        }
        
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            currentSearchQuery = query;
            
            console.log('Search input changed:', query);
            
            if (query.length >= 2) {
                console.log('Starting search for:', query);
                // Show loading indicator
                showSearchLoading();
                searchTimeout = setTimeout(() => {
                    performSearch(query);
                }, 200); // Reduced delay for faster response
            } else {
                hideSearchResults();
            }
        });
        
        // Handle keyboard navigation
        searchInput.addEventListener('keydown', function(e) {
            const results = document.querySelector('#search-results');
            if (!results) return;
            
            const items = results.querySelectorAll('.search-result-item');
            const currentActive = results.querySelector('.search-result-item.active');
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentActive) {
                    currentActive.classList.remove('active');
                    const next = currentActive.nextElementSibling;
                    if (next) {
                        next.classList.add('active');
                    } else {
                        items[0]?.classList.add('active');
                    }
                } else {
                    items[0]?.classList.add('active');
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentActive) {
                    currentActive.classList.remove('active');
                    const prev = currentActive.previousElementSibling;
                    if (prev) {
                        prev.classList.add('active');
                    } else {
                        items[items.length - 1]?.classList.add('active');
                    }
                } else {
                    items[items.length - 1]?.classList.add('active');
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const activeItem = results.querySelector('.search-result-item.active');
                if (activeItem) {
                    const link = activeItem.querySelector('a');
                    if (link) {
                        window.location.href = link.href;
                    }
                }
            } else if (e.key === 'Escape') {
                hideSearchResults();
                searchInput.blur();
            }
        });
        
        // Hide search results when clicking outside
        document.addEventListener('click', function(e) {
            const searchContainer = document.getElementById('search-container');
            if (searchContainer && !searchContainer.contains(e.target)) {
                hideSearchResults();
            }
        });
        
        // Focus handling
        searchInput.addEventListener('focus', function() {
            if (currentSearchQuery.length >= 2) {
                performSearch(currentSearchQuery);
            }
        });
    }
    
    // Auto-hide flash messages
    const flashMessages = document.querySelectorAll('[class*="alert-"]');
    flashMessages.forEach(message => {
        setTimeout(() => {
            message.style.opacity = '0';
            setTimeout(() => {
                message.remove();
            }, 300);
        }, 5000);
    });
    
    // Smooth scrolling for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Carousel scroll buttons (if present)
    initializeCarousels();
    
    // Initialize tooltips
    initializeTooltips();
    
    // Watch progress tracking
    initializeWatchProgress();
});

// Enhanced search functionality
function performSearch(query, containerId) {
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Search request failed');
            }
            return response.json();
        })
        .then(data => {
            hideSearchLoading(containerId);
            displaySearchResults(data.results || [], data.total || 0, query, containerId);
        })
        .catch(error => {
            console.error('Search error:', error);
            hideSearchLoading(containerId);
            showSearchError(containerId);
        });
}

function showSearchLoading(containerId) {
    let resultsId;
    if (containerId === 'mobile-search-container') {
        resultsId = 'mobile-search-results';
    } else if (containerId === 'mobile-search-container-logged') {
        resultsId = 'mobile-search-results-logged';
    } else {
        resultsId = 'search-results';
    }
    let searchResults = document.getElementById(resultsId);
    if (!searchResults) {
        searchResults = createSearchResultsContainer(containerId);
    }
    
    searchResults.innerHTML = `
        <div class="p-4 text-center">
            <div class="inline-flex items-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="text-sm text-gray-600">Mencari...</span>
            </div>
        </div>
    `;
    searchResults.classList.remove('hidden');
}

function hideSearchLoading(containerId) {
    // This will be handled by displaySearchResults
}

function showSearchError(containerId) {
    let resultsId;
    if (containerId === 'mobile-search-container') {
        resultsId = 'mobile-search-results';
    } else if (containerId === 'mobile-search-container-logged') {
        resultsId = 'mobile-search-results-logged';
    } else {
        resultsId = 'search-results';
    }
    let searchResults = document.getElementById(resultsId);
    if (!searchResults) {
        searchResults = createSearchResultsContainer(containerId);
    }
    
    searchResults.innerHTML = `
        <div class="p-4 text-center text-red-500">
            <i class="fas fa-exclamation-triangle mb-2"></i>
            <div class="text-sm">Terjadi kesalahan saat mencari</div>
        </div>
    `;
    searchResults.classList.remove('hidden');
}

function createSearchResultsContainer(containerId) {
    const isMobile = containerId === 'mobile-search-container' || containerId === 'mobile-search-container-logged';
    let resultsId;
    if (containerId === 'mobile-search-container') {
        resultsId = 'mobile-search-results';
    } else if (containerId === 'mobile-search-container-logged') {
        resultsId = 'mobile-search-results-logged';
    } else {
        resultsId = 'search-results';
    }
    const searchContainer = document.getElementById(containerId);
    
    const searchResults = document.createElement('div');
    searchResults.id = resultsId;
    
    if (isMobile) {
        // Mobile search results styling
        searchResults.className = 'absolute top-full left-0 right-0 bg-white shadow-xl rounded-lg border border-gray-200 mt-1 z-50 max-h-80 overflow-y-auto hidden';
    } else {
        // Desktop search results styling
        searchResults.className = 'absolute top-full left-0 right-0 bg-white shadow-xl rounded-lg border border-gray-200 mt-1 z-50 max-h-96 overflow-y-auto hidden';
    }
    
    if (searchContainer) {
        searchContainer.appendChild(searchResults);
    } else {
        // Fallback: append to search input parent
        const searchInput = document.getElementById(isMobile ? 'mobile-search-input' : 'search-input');
        if (searchInput && searchInput.parentNode) {
            searchInput.parentNode.appendChild(searchResults);
        }
    }
    
    return searchResults;
}

function displaySearchResults(results, total, query, containerId) {
    let resultsId;
    if (containerId === 'mobile-search-container') {
        resultsId = 'mobile-search-results';
    } else if (containerId === 'mobile-search-container-logged') {
        resultsId = 'mobile-search-results-logged';
    } else {
        resultsId = 'search-results';
    }
    let searchResults = document.getElementById(resultsId);
    
    if (!searchResults) {
        searchResults = createSearchResultsContainer(containerId);
    }
    
    if (results.length === 0) {
        searchResults.innerHTML = `
            <div class="p-6 text-center">
                <i class="fas fa-search text-gray-400 text-2xl mb-2"></i>
                <div class="text-gray-600">Tidak ada hasil untuk "${query}"</div>
                <div class="text-sm text-gray-500 mt-1">Coba kata kunci lain</div>
            </div>
        `;
    } else {
        const headerHTML = total > results.length ? 
            `<div class="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600">
                Menampilkan ${results.length} dari ${total} hasil untuk "${query}"
            </div>` : 
            `<div class="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600">
                ${results.length} hasil untuk "${query}"
            </div>`;
        
        const resultsHTML = results.map((result, index) => `
            <div class="search-result-item p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors" data-index="${index}">
                <a href="${result.url}" class="flex items-start space-x-3 text-decoration-none">
                    <div class="flex-shrink-0">
                        <img src="${result.thumbnail || '/static/img/placeholder.jpg'}" 
                             alt="${result.title}" 
                             class="w-12 h-16 object-cover rounded shadow-sm"
                             onerror="this.src='/static/img/placeholder.jpg'">
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="font-medium text-gray-900 hover:text-blue-600 truncate">${highlightSearchTerm(result.title, query)}</div>
                        <div class="flex items-center space-x-2 mt-1">
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                                ${result.type}
                            </span>
                            <span class="text-gray-500 text-xs">${result.year || ''}</span>
                            ${result.rating ? `<span class="text-yellow-500 text-xs">★ ${result.rating}</span>` : ''}
                            ${result.episode_count ? `<span class="text-gray-500 text-xs">${result.episode_count} eps</span>` : ''}
                        </div>
                        ${result.description ? `<div class="text-sm text-gray-600 mt-1 line-clamp-2">${highlightSearchTerm(result.description, query)}</div>` : ''}
                        ${result.genre ? `<div class="text-xs text-gray-500 mt-1">${result.genre}</div>` : ''}
                    </div>
                </a>
            </div>
        `).join('');
        
        searchResults.innerHTML = headerHTML + resultsHTML;
        
        // Add mouse hover handlers for keyboard navigation
        searchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('mouseenter', () => {
                // Remove active class from all items
                searchResults.querySelectorAll('.search-result-item').forEach(i => i.classList.remove('active'));
                // Add active class to hovered item
                item.classList.add('active');
            });
        });
    }
    
    searchResults.classList.remove('hidden');
}

function highlightSearchTerm(text, query) {
    if (!text || !query) return text || '';
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
}

function hideSearchResults(containerId) {
    if (containerId) {
        let resultsId;
        if (containerId === 'mobile-search-container') {
            resultsId = 'mobile-search-results';
        } else if (containerId === 'mobile-search-container-logged') {
            resultsId = 'mobile-search-results-logged';
        } else {
            resultsId = 'search-results';
        }
        const searchResults = document.getElementById(resultsId);
        if (searchResults) {
            searchResults.classList.add('hidden');
        }
    } else {
        // Hide all if no specific container specified
        const desktopResults = document.getElementById('search-results');
        const mobileResults = document.getElementById('mobile-search-results');
        const mobileResultsLogged = document.getElementById('mobile-search-results-logged');
        if (desktopResults) desktopResults.classList.add('hidden');
        if (mobileResults) mobileResults.classList.add('hidden');
        if (mobileResultsLogged) mobileResultsLogged.classList.add('hidden');
    }
}

// Carousel initialization - Skip hero carousel (handled separately)
function initializeCarousels() {
    const carousels = document.querySelectorAll('.carousel');
    
    carousels.forEach(carousel => {
        // Skip hero carousel - it has its own vertical implementation
        if (carousel.closest('#hero-carousel')) {
            return;
        }
        
        let isDown = false;
        let startX;
        let scrollLeft;
        
        carousel.addEventListener('mousedown', (e) => {
            isDown = true;
            carousel.classList.add('active');
            startX = e.pageX - carousel.offsetLeft;
            scrollLeft = carousel.scrollLeft;
        });
        
        carousel.addEventListener('mouseleave', () => {
            isDown = false;
            carousel.classList.remove('active');
        });
        
        carousel.addEventListener('mouseup', () => {
            isDown = false;
            carousel.classList.remove('active');
        });
        
        carousel.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - carousel.offsetLeft;
            const walk = (x - startX) * 2;
            carousel.scrollLeft = scrollLeft - walk;
        });
        
        // Touch support
        carousel.addEventListener('touchstart', (e) => {
            startX = e.touches[0].pageX - carousel.offsetLeft;
            scrollLeft = carousel.scrollLeft;
        });
        
        carousel.addEventListener('touchmove', (e) => {
            const x = e.touches[0].pageX - carousel.offsetLeft;
            const walk = (x - startX) * 2;
            carousel.scrollLeft = scrollLeft - walk;
        });
    });
}

// Tooltip initialization
function initializeTooltips() {
    const tooltips = document.querySelectorAll('[data-tooltip]');
    
    tooltips.forEach(element => {
        const tooltipText = element.getAttribute('data-tooltip');
        
        const tooltip = document.createElement('div');
        tooltip.className = 'absolute bg-gray-800 text-white text-xs rounded px-2 py-1 z-50 pointer-events-none opacity-0 transition-opacity duration-200';
        tooltip.textContent = tooltipText;
        tooltip.style.bottom = '100%';
        tooltip.style.left = '50%';
        tooltip.style.transform = 'translateX(-50%)';
        tooltip.style.marginBottom = '5px';
        
        element.style.position = 'relative';
        element.appendChild(tooltip);
        
        element.addEventListener('mouseenter', () => {
            tooltip.style.opacity = '1';
        });
        
        element.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
        });
    });
}

// Watch progress tracking
function initializeWatchProgress() {
    // This will be used by the video player to track watch progress
    window.updateWatchProgress = function(episodeId, watchTime, completed = false) {
        fetch('/api/update-progress', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                episode_id: episodeId,
                watch_time: watchTime,
                completed: completed
            })
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                console.error('Failed to update watch progress:', data.message);
            }
        })
        .catch(error => {
            console.error('Error updating watch progress:', error);
        });
    };
}

// Utility functions
function showLoading(element) {
    if (element) {
        element.classList.add('btn-loading');
        element.disabled = true;
    }
}

function hideLoading(element) {
    if (element) {
        element.classList.remove('btn-loading');
        element.disabled = false;
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm alert-${type}`;
    notification.innerHTML = `
        <div class="flex items-center">
            <div class="text-white">
                ${message}
            </div>
            <button class="ml-4 text-white hover:text-gray-300" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Export functions for use in other scripts
window.AniFlix = {
    showLoading,
    hideLoading,
    showNotification,
    updateWatchProgress: window.updateWatchProgress
};
