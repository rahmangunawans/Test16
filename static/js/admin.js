// Admin-specific JavaScript functions

function showEditModal(userId, username, email) {
    // Create modal HTML
    const modalHTML = `
        <div id="edit-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-gray-800 rounded-lg p-6 w-96">
                <h3 class="text-xl font-bold text-white mb-4">Edit User</h3>
                <form id="edit-form" action="/admin/users/${userId}/edit" method="POST">
                    <div class="mb-4">
                        <label class="block text-gray-300 mb-2">Username</label>
                        <input type="text" name="username" value="${username}" 
                               class="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-red-500">
                    </div>
                    <div class="mb-4">
                        <label class="block text-gray-300 mb-2">Email</label>
                        <input type="email" name="email" value="${email}" 
                               class="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-red-500">
                    </div>
                    <div class="flex justify-end space-x-2">
                        <button type="button" onclick="closeEditModal()" 
                                class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Cancel</button>
                        <button type="submit" 
                                class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Save</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) {
        modal.remove();
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.id === 'edit-modal') {
        closeEditModal();
    }
});