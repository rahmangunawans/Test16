// Authentication JavaScript for AniFlix

document.addEventListener('DOMContentLoaded', function() {
    initializeAuthForms();
});

function initializeAuthForms() {
    const signinTab = document.getElementById('signin-tab');
    const signupTab = document.getElementById('signup-tab');
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // Tab switching
    if (signinTab && signupTab && signinForm && signupForm) {
        signinTab.addEventListener('click', function() {
            switchToSignIn();
        });

        signupTab.addEventListener('click', function() {
            switchToSignUp();
        });
    }

    // Form submissions
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegisterSubmit);
    }

    // Input validation
    setupInputValidation();
    
    // Auto-focus first input
    const firstInput = document.querySelector('#signin-form input[type="email"]');
    if (firstInput) {
        firstInput.focus();
    }
}

function switchToSignIn() {
    const signinTab = document.getElementById('signin-tab');
    const signupTab = document.getElementById('signup-tab');
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');

    // Update tab appearance
    signinTab.className = 'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 bg-red-600 text-white';
    signupTab.className = 'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 text-gray-300 hover:text-white';

    // Show/hide forms
    signinForm.classList.remove('hidden');
    signupForm.classList.add('hidden');

    // Focus first input
    const emailInput = document.getElementById('signin-email');
    if (emailInput) {
        emailInput.focus();
    }

    // Clear any error states
    clearFormErrors();
}

function switchToSignUp() {
    const signinTab = document.getElementById('signin-tab');
    const signupTab = document.getElementById('signup-tab');
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');

    // Update tab appearance
    signupTab.className = 'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 bg-red-600 text-white';
    signinTab.className = 'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 text-gray-300 hover:text-white';

    // Show/hide forms
    signupForm.classList.remove('hidden');
    signinForm.classList.add('hidden');

    // Focus first input
    const usernameInput = document.getElementById('signup-username');
    if (usernameInput) {
        usernameInput.focus();
    }

    // Clear any error states
    clearFormErrors();
}

function handleLoginSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const email = form.querySelector('#signin-email').value.trim();
    const password = form.querySelector('#signin-password').value;

    // Basic validation
    if (!email || !password) {
        showFormError('Please fill in all fields');
        return;
    }

    if (!isValidEmail(email)) {
        showFormError('Please enter a valid email address');
        return;
    }

    // Show loading state
    showLoading(submitButton);
    clearFormErrors();

    // Submit form data
    const formData = new FormData(form);
    
    fetch(form.action, {
        method: 'POST',
        body: formData,
        redirect: 'follow'
    })
    .then(response => {
        if (response.ok && response.url.includes('/dashboard')) {
            // Successful login - redirect happened
            window.location.href = '/dashboard';
            return;
        } else if (response.ok) {
            // Check if redirected somewhere else
            window.location.href = response.url;
            return;
        }
        return response.text();
    })
    .then(html => {
        if (typeof html === 'string' && html.includes('auth')) {
            // Login failed, show error message
            showFormError('Email atau password salah. Silakan coba lagi.');
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        showFormError('Terjadi kesalahan saat login. Silakan coba lagi.');
    })
    .finally(() => {
        hideLoading(submitButton);
    });
}

function handleRegisterSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const username = form.querySelector('#signup-username').value.trim();
    const email = form.querySelector('#signup-email').value.trim();
    const password = form.querySelector('#signup-password').value;

    // Validation
    const validation = validateRegistrationForm(username, email, password);
    if (!validation.isValid) {
        showFormError(validation.message);
        return;
    }

    // Show loading state
    showLoading(submitButton);
    clearFormErrors();

    // Submit form data
    const formData = new FormData(form);
    
    fetch(form.action, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (response.redirected) {
            // Successful registration, redirect
            window.location.href = response.url;
            return;
        }
        return response.text();
    })
    .then(html => {
        if (typeof html === 'string') {
            // Check if there are error messages in the response
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const errorMessages = doc.querySelectorAll('.alert-error, .text-red-500');
            
            if (errorMessages.length > 0) {
                const errorText = errorMessages[0].textContent.trim();
                showFormError(errorText);
            } else {
                showFormError('Registration failed. Please try again.');
            }
        }
    })
    .catch(error => {
        console.error('Registration error:', error);
        showFormError('Registration failed. Please try again.');
    })
    .finally(() => {
        hideLoading(submitButton);
    });
}

function validateRegistrationForm(username, email, password) {
    if (!username || !email || !password) {
        return { isValid: false, message: 'Please fill in all fields' };
    }

    if (username.length < 3) {
        return { isValid: false, message: 'Username must be at least 3 characters long' };
    }

    if (username.length > 20) {
        return { isValid: false, message: 'Username must be less than 20 characters' };
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return { isValid: false, message: 'Username can only contain letters, numbers, and underscores' };
    }

    if (!isValidEmail(email)) {
        return { isValid: false, message: 'Please enter a valid email address' };
    }

    if (password.length < 6) {
        return { isValid: false, message: 'Password must be at least 6 characters long' };
    }

    if (password.length > 128) {
        return { isValid: false, message: 'Password must be less than 128 characters' };
    }

    return { isValid: true };
}

function setupInputValidation() {
    // Real-time validation for email fields
    const emailInputs = document.querySelectorAll('input[type="email"]');
    emailInputs.forEach(input => {
        input.addEventListener('blur', function() {
            const email = this.value.trim();
            if (email && !isValidEmail(email)) {
                this.classList.add('border-red-500');
                showFieldError(this, 'Please enter a valid email address');
            } else {
                this.classList.remove('border-red-500');
                hideFieldError(this);
            }
        });

        input.addEventListener('input', function() {
            this.classList.remove('border-red-500');
            hideFieldError(this);
        });
    });

    // Real-time validation for password fields
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    passwordInputs.forEach(input => {
        input.addEventListener('input', function() {
            const password = this.value;
            if (password.length > 0 && password.length < 6) {
                this.classList.add('border-yellow-500');
                showFieldError(this, 'Password should be at least 6 characters');
            } else {
                this.classList.remove('border-yellow-500', 'border-red-500');
                hideFieldError(this);
            }
        });
    });

    // Username validation
    const usernameInput = document.getElementById('signup-username');
    if (usernameInput) {
        usernameInput.addEventListener('blur', function() {
            const username = this.value.trim();
            if (username) {
                if (username.length < 3) {
                    this.classList.add('border-red-500');
                    showFieldError(this, 'Username must be at least 3 characters');
                } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                    this.classList.add('border-red-500');
                    showFieldError(this, 'Username can only contain letters, numbers, and underscores');
                } else {
                    this.classList.remove('border-red-500');
                    hideFieldError(this);
                }
            }
        });

        usernameInput.addEventListener('input', function() {
            this.classList.remove('border-red-500');
            hideFieldError(this);
        });
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showFormError(message) {
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    
    if (errorMessage && errorText) {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorMessage.classList.add('hidden');
        }, 5000);
    }
}

function showFieldError(field, message) {
    hideFieldError(field); // Remove existing error
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error text-red-400 text-xs mt-1';
    errorDiv.textContent = message;
    
    field.parentNode.appendChild(errorDiv);
}

function hideFieldError(field) {
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
}

function clearFormErrors() {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.classList.add('hidden');
    }
    
    // Remove field-specific errors
    const fieldErrors = document.querySelectorAll('.field-error');
    fieldErrors.forEach(error => error.remove());
    
    // Remove error styling from inputs
    const errorInputs = document.querySelectorAll('.border-red-500, .border-yellow-500');
    errorInputs.forEach(input => {
        input.classList.remove('border-red-500', 'border-yellow-500');
    });
}

function showLoading(button) {
    if (button) {
        button.classList.add('btn-loading');
        button.disabled = true;
        
        const originalText = button.innerHTML;
        button.setAttribute('data-original-text', originalText);
        button.innerHTML = `
            <div class="flex items-center justify-center">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
            </div>
        `;
    }
}

function hideLoading(button) {
    if (button) {
        button.classList.remove('btn-loading');
        button.disabled = false;
        
        const originalText = button.getAttribute('data-original-text');
        if (originalText) {
            button.innerHTML = originalText;
            button.removeAttribute('data-original-text');
        }
    }
}

// Handle Enter key in forms
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const activeForm = document.querySelector('.form-container:not(.hidden) form');
        if (activeForm) {
            const submitButton = activeForm.querySelector('button[type="submit"]');
            if (submitButton && !submitButton.disabled) {
                submitButton.click();
            }
        }
    }
});

// Show password toggle functionality
function addPasswordToggle() {
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    
    passwordInputs.forEach(input => {
        const wrapper = document.createElement('div');
        wrapper.className = 'relative';
        
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);
        
        const toggleButton = document.createElement('button');
        toggleButton.type = 'button';
        toggleButton.className = 'absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white';
        toggleButton.innerHTML = '<i class="fas fa-eye"></i>';
        
        toggleButton.addEventListener('click', function() {
            if (input.type === 'password') {
                input.type = 'text';
                this.innerHTML = '<i class="fas fa-eye-slash"></i>';
            } else {
                input.type = 'password';
                this.innerHTML = '<i class="fas fa-eye"></i>';
            }
        });
        
        wrapper.appendChild(toggleButton);
    });
}

// Initialize password toggles when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(addPasswordToggle, 100); // Small delay to ensure forms are rendered
});
