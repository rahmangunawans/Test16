// Dashboard JavaScript for AniFlix
document.addEventListener('DOMContentLoaded', function() {
    initializeSearchAndFilter();
    initializeModals();
    initializeTooltips();
    initializeProgressIndicators();
    initializeQuickActions();
});

// Search and Filter functionality
function initializeSearchAndFilter() {
    const searchInput = document.getElementById('anime-search');
    const genreFilter = document.getElementById('genre-filter');
    const statusFilter = document.getElementById('status-filter');
    const sortFilter = document.getElementById('sort-filter');
    const clearFilters = document.getElementById('clear-filters');

    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performDashboardSearch();
            }, 300);
        });
    }

    if (genreFilter) {
        genreFilter.addEventListener('change', performDashboardSearch);
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', performDashboardSearch);
    }

    if (sortFilter) {
        sortFilter.addEventListener('change', performDashboardSearch);
    }

    if (clearFilters) {
        clearFilters.addEventListener('click', function() {
            if (searchInput) searchInput.value = '';
            if (genreFilter) genreFilter.value = '';
            if (statusFilter) statusFilter.value = '';
            if (sortFilter) sortFilter.value = 'recent';
            performDashboardSearch();
        });
    }
}

function performDashboardSearch() {
    const searchQuery = document.getElementById('anime-search')?.value || '';
    const genre = document.getElementById('genre-filter')?.value || '';
    const status = document.getElementById('status-filter')?.value || '';
    const sort = document.getElementById('sort-filter')?.value || 'recent';

    const params = new URLSearchParams({
        search: searchQuery,
        genre: genre,
        status: status,
        sort: sort
    });

    // Show loading state
    const resultsContainer = document.getElementById('search-results');
    if (resultsContainer) {
        resultsContainer.innerHTML = '<div class="text-center py-8"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div><p class="text-gray-400 mt-4">Searching...</p></div>';
    }

    fetch(`/dashboard/search?${params}`)
        .then(response => response.json())
        .then(data => {
            displaySearchResults(data);
        })
        .catch(error => {
            console.error('Search error:', error);
            if (resultsContainer) {
                resultsContainer.innerHTML = '<div class="text-center py-8 text-red-400">Search failed. Please try again.</div>';
            }
        });
}

function displaySearchResults(data) {
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;

    if (data.results && data.results.length > 0) {
        resultsContainer.innerHTML = data.results.map(item => `
            <div class="bg-gray-800 rounded-lg overflow-hidden hover:transform hover:scale-105 transition-all duration-200 group">
                <div class="relative">
                    <img src="${item.thumbnail_url || '/static/images/placeholder.jpg'}" 
                         alt="${item.title}" 
                         class="w-full h-48 object-cover">
                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-200"></div>
                    <div class="absolute top-2 right-2">
                        ${item.progress ? `
                        <div class="bg-black bg-opacity-75 rounded-full px-2 py-1">
                            <span class="text-white text-xs">${Math.round(item.progress)}%</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                <div class="p-4">
                    <h3 class="text-white font-semibold truncate">${item.title}</h3>
                    <p class="text-gray-400 text-sm">${item.genre || 'Unknown Genre'}</p>
                    <p class="text-gray-500 text-xs">${item.year || ''}</p>
                    ${item.progress ? `
                    <div class="mt-3">
                        <div class="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Episode ${item.current_episode}</span>
                            <span>${Math.round(item.progress)}%</span>
                        </div>
                        <div class="w-full bg-gray-700 rounded-full h-2">
                            <div class="bg-red-500 h-2 rounded-full transition-all duration-300" style="width: ${item.progress}%"></div>
                        </div>
                    </div>
                    ` : ''}
                    <div class="mt-4 flex justify-between items-center">
                        <a href="/anime/${item.id}" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm transition-colors">
                            ${item.progress ? 'Continue' : 'Watch'}
                        </a>
                        <div class="flex space-x-2">
                            <button class="text-gray-400 hover:text-white transition-colors" onclick="toggleWatchlist(${item.id})">
                                <i class="fas fa-bookmark"></i>
                            </button>
                            <button class="text-gray-400 hover:text-white transition-colors" onclick="shareAnime(${item.id})">
                                <i class="fas fa-share"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        resultsContainer.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-search text-gray-500 text-6xl mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-400 mb-2">No results found</h3>
                <p class="text-gray-500">Try adjusting your search criteria</p>
            </div>
        `;
    }
}

// Modal functionality for confirmations
function initializeModals() {
    // Confirmation modal
    window.showConfirmModal = function(title, message, onConfirm, onCancel) {
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirm-title');
        const messageEl = document.getElementById('confirm-message');
        const confirmBtn = document.getElementById('confirm-btn');
        const cancelBtn = document.getElementById('cancel-btn');

        if (modal && titleEl && messageEl && confirmBtn && cancelBtn) {
            titleEl.textContent = title;
            messageEl.textContent = message;
            
            confirmBtn.onclick = function() {
                modal.classList.add('hidden');
                if (onConfirm) onConfirm();
            };
            
            cancelBtn.onclick = function() {
                modal.classList.add('hidden');
                if (onCancel) onCancel();
            };
            
            modal.classList.remove('hidden');
        }
    };

    // Close modal on backdrop click
    const modal = document.getElementById('confirm-modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    }
}

// Admin tooltips
function initializeTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    tooltipElements.forEach(element => {
        const tooltip = document.createElement('div');
        tooltip.className = 'absolute z-50 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 tooltip invisible';
        tooltip.textContent = element.getAttribute('data-tooltip');
        
        element.appendChild(tooltip);
        
        element.addEventListener('mouseenter', function() {
            tooltip.classList.remove('invisible', 'opacity-0');
            tooltip.classList.add('opacity-100');
        });
        
        element.addEventListener('mouseleave', function() {
            tooltip.classList.add('invisible', 'opacity-0');
            tooltip.classList.remove('opacity-100');
        });
    });
}

// Progress indicators
function initializeProgressIndicators() {
    const progressBars = document.querySelectorAll('.progress-bar');
    
    progressBars.forEach(bar => {
        const progress = bar.getAttribute('data-progress');
        const fill = bar.querySelector('.progress-fill');
        
        if (fill && progress) {
            setTimeout(() => {
                fill.style.width = progress + '%';
            }, 100);
        }
    });
}

// Quick actions
function initializeQuickActions() {
    // Quick search
    window.quickSearch = function(query) {
        const searchInput = document.getElementById('anime-search');
        if (searchInput) {
            searchInput.value = query;
            performDashboardSearch();
        }
    };

    // Quick filter
    window.quickFilter = function(type, value) {
        const filterElement = document.getElementById(type + '-filter');
        if (filterElement) {
            filterElement.value = value;
            performDashboardSearch();
        }
    };
}

// Utility functions
function toggleWatchlist(animeId) {
    fetch(`/api/watchlist/toggle/${animeId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        showNotification(data.message, data.success ? 'success' : 'error');
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Failed to update watchlist', 'error');
    });
}

function shareAnime(animeId) {
    const url = `${window.location.origin}/anime/${animeId}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Check out this anime on AniFlix',
            url: url
        });
    } else {
        navigator.clipboard.writeText(url).then(() => {
            showNotification('Link copied to clipboard!', 'success');
        });
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-lg text-white font-medium transform translate-x-full transition-transform duration-300 ${
        type === 'success' ? 'bg-green-600' : 
        type === 'error' ? 'bg-red-600' : 
        type === 'warning' ? 'bg-yellow-600' : 'bg-blue-600'
    }`;
    
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${
                type === 'success' ? 'fa-check-circle' : 
                type === 'error' ? 'fa-exclamation-circle' : 
                type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'
            } mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Admin functions
window.deleteItem = function(type, id, name) {
    showConfirmModal(
        'Confirm Delete',
        `Are you sure you want to delete "${name}"? This action cannot be undone.`,
        function() {
            fetch(`/admin/${type}/${id}/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('Item deleted successfully', 'success');
                    location.reload();
                } else {
                    showNotification(data.message || 'Delete failed', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Delete failed', 'error');
            });
        }
    );
};

window.editItem = function(type, id) {
    window.location.href = `/admin/${type}/${id}/edit`;
};