/**
 * PRODUCTION Dashboard JavaScript - Sai Seva Foundation
 * Complete dashboard functionality for user and volunteer dashboards
 * 
 * @version 1.0.0
 * @author Sai Seva Foundation Development Team
 */

class Dashboard {
    constructor() {
        this.baseURL = window.location.origin;
        this.apiURL = this.baseURL + '/api';
        this.csrfToken = '4ff0c3a6f7cdb69870b0963c2cbd2f648d39f851f7bc00b42a8e69aacc8955b0';
        this.currentUser = null;
        this.refreshInterval = null;
        this.chartInstances = {};
        
        this.init();
    }

    /**
     * Initialize dashboard
     */
    init() {
        this.checkAuthentication();
        this.initializeCSRFToken();
        this.setupEventListeners();
        this.loadDashboardData();
        this.setupAutoRefresh();
        this.initializeCharts();
        this.setupNotifications();
    }

    /**
     * Check if user is authenticated
     */
    async checkAuthentication() {
        try {
            const response = await this.makeAPICall('/auth.php?action=check_session');
            
            if (!response.authenticated) {
                this.redirectToLogin();
                return;
            }
            
            this.currentUser = response.user;
            this.updateUserInfo();
            
        } catch (error) {
            console.error('Authentication check failed:', error);
            this.redirectToLogin();
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Sidebar navigation
        this.setupSidebarNavigation();
        
        // Profile update form
        this.setupProfileForm();
        
        // Settings forms
        this.setupSettingsForms();
        
        // Modal handlers
        this.setupModalHandlers();
        
        // Table sorting and filtering
        this.setupTableControls();
        
        // Search functionality
        this.setupSearch();
        
        // Responsive menu toggle
        this.setupMobileMenu();
        
        // Logout handler
        this.setupLogoutHandler();
    }

    /**
     * Setup sidebar navigation
     */
    setupSidebarNavigation() {
        const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
        
        sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                const targetSection = link.dataset.section;
                this.showSection(targetSection);
                
                // Update active link
                sidebarLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                // Track navigation
                this.trackEvent('dashboard_navigation', { section: targetSection });
            });
        });
    }

    /**
     * Show specific dashboard section
     */
    showSection(sectionId) {
        // Hide all sections
        const sections = document.querySelectorAll('.dashboard-section');
        sections.forEach(section => {
            section.classList.remove('active');
        });
        
        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            
            // Load section-specific data
            this.loadSectionData(sectionId);
            
            // Update page title
            this.updatePageTitle(sectionId);
        }
    }

    /**
     * Load data for specific section
     */
    async loadSectionData(sectionId) {
        const loadingIndicator = document.querySelector(`#${sectionId} .loading`);
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }
        
        try {
            switch (sectionId) {
                case 'overview':
                    await this.loadOverviewData();
                    break;
                case 'donations':
                    await this.loadDonationsData();
                    break;
                case 'events':
                    await this.loadEventsData();
                    break;
                case 'volunteering':
                    await this.loadVolunteeringData();
                    break;
                case 'profile':
                    await this.loadProfileData();
                    break;
                case 'settings':
                    await this.loadSettingsData();
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${sectionId} data:`, error);
            this.showErrorMessage(`Failed to load ${sectionId} data`);
        } finally {
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
        }
    }

    /**
     * Load overview/dashboard data
     */
    async loadOverviewData() {
        try {
            const response = await this.makeAPICall('/dashboard.php?action=overview');
            
            if (response.success) {
                this.updateOverviewStats(response.data.stats);
                this.updateRecentActivity(response.data.activity);
                this.updateUpcomingEvents(response.data.events);
                
                // Update charts
                if (response.data.charts) {
                    this.updateDashboardCharts(response.data.charts);
                }
            }
        } catch (error) {
            console.error('Error loading overview data:', error);
        }
    }

    /**
     * Load donations data
     */
    async loadDonationsData() {
        try {
            const response = await this.makeAPICall('/dashboard.php?action=donations');
            
            if (response.success) {
                this.updateDonationsTable(response.data.donations);
                this.updateDonationStats(response.data.stats);
                
                if (response.data.tax_receipts) {
                    this.updateTaxReceipts(response.data.tax_receipts);
                }
            }
        } catch (error) {
            console.error('Error loading donations data:', error);
        }
    }

    /**
     * Load events data
     */
    async loadEventsData() {
        try {
            const response = await this.makeAPICall('/dashboard.php?action=events');
            
            if (response.success) {
                this.updateEventsCalendar(response.data.events);
                this.updateRegisteredEvents(response.data.registered);
            }
        } catch (error) {
            console.error('Error loading events data:', error);
        }
    }

    /**
     * Load volunteering data
     */
    async loadVolunteeringData() {
        try {
            const response = await this.makeAPICall('/dashboard.php?action=volunteering');
            
            if (response.success) {
                this.updateVolunteerStats(response.data.stats);
                this.updateVolunteerOpportunities(response.data.opportunities);
                this.updateVolunteerHistory(response.data.history);
            }
        } catch (error) {
            console.error('Error loading volunteering data:', error);
        }
    }

    /**
     * Load profile data
     */
    async loadProfileData() {
        try {
            const response = await this.makeAPICall('/dashboard.php?action=profile');
            
            if (response.success) {
                this.populateProfileForm(response.data);
            }
        } catch (error) {
            console.error('Error loading profile data:', error);
        }
    }

    /**
     * Setup profile update form
     */
    setupProfileForm() {
        const profileForm = document.getElementById('profileForm');
        if (!profileForm) return;
        
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(profileForm);
            const data = Object.fromEntries(formData.entries());
            data.csrf_token = this.csrfToken;
            
            const submitButton = profileForm.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            
            try {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
                
                const response = await this.makeAPICall('/dashboard.php?action=update_profile', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });

                if (response.success) {
                    this.showNotification('Profile updated successfully!', 'success');
                    this.currentUser = { ...this.currentUser, ...response.data };
                    this.updateUserInfo();
                } else {
                    throw new Error(response.error || 'Profile update failed');
                }

            } catch (error) {
                console.error('Profile update error:', error);
                this.showNotification(error.message || 'Profile update failed', 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
            }
        });
        
        // Avatar upload
        const avatarInput = document.getElementById('avatar');
        if (avatarInput) {
            avatarInput.addEventListener('change', (e) => {
                this.handleAvatarUpload(e);
            });
        }
    }

    /**
     * Handle avatar upload
     */
    async handleAvatarUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file
        if (!file.type.startsWith('image/')) {
            this.showNotification('Please select an image file', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            this.showNotification('File size must be less than 5MB', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('avatar', file);
        formData.append('csrf_token', this.csrfToken);
        
        try {
            const response = await fetch(`${this.apiURL}/upload.php?type=avatar`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Update avatar display
                const avatarElements = document.querySelectorAll('.user-avatar');
                avatarElements.forEach(img => {
                    img.src = result.avatar_url;
                });
                
                this.showNotification('Avatar updated successfully!', 'success');
            } else {
                throw new Error(result.error || 'Avatar upload failed');
            }
            
        } catch (error) {
            console.error('Avatar upload error:', error);
            this.showNotification(error.message || 'Avatar upload failed', 'error');
        }
    }

    /**
     * Setup table controls (sorting, filtering, pagination)
     */
    setupTableControls() {
        // Table sorting
        const sortableHeaders = document.querySelectorAll('.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                this.sortTable(e.target.closest('table'), e.target.cellIndex, header);
            });
        });
        
        // Table filtering
        const filterInputs = document.querySelectorAll('.table-filter');
        filterInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                this.filterTable(e.target.dataset.table, e.target.value);
            });
        });
        
        // Pagination
        this.setupPagination();
    }

    /**
     * Sort table by column
     */
    sortTable(table, columnIndex, header) {
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const isAscending = !header.classList.contains('sort-asc');
        
        // Remove sort classes from all headers
        table.querySelectorAll('.sortable').forEach(h => {
            h.classList.remove('sort-asc', 'sort-desc');
        });
        
        // Add sort class to current header
        header.classList.add(isAscending ? 'sort-asc' : 'sort-desc');
        
        // Sort rows
        rows.sort((a, b) => {
            const aText = a.cells[columnIndex].textContent.trim();
            const bText = b.cells[columnIndex].textContent.trim();
            
            // Check if values are numbers
            const aNum = parseFloat(aText.replace(/[^0-9.-]/g, ''));
            const bNum = parseFloat(bText.replace(/[^0-9.-]/g, ''));
            
            if (!isNaN(aNum) && !isNaN(bNum)) {
                return isAscending ? aNum - bNum : bNum - aNum;
            } else {
                return isAscending 
                    ? aText.localeCompare(bText)
                    : bText.localeCompare(aText);
            }
        });
        
        // Update table
        rows.forEach(row => tbody.appendChild(row));
    }

    /**
     * Filter table rows
     */
    filterTable(tableId, filterValue) {
        const table = document.getElementById(tableId);
        if (!table) return;
        
        const rows = table.querySelectorAll('tbody tr');
        const filter = filterValue.toLowerCase();
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(filter) ? '' : 'none';
        });
        
        // Update row count
        const visibleRows = table.querySelectorAll('tbody tr:not([style*="display: none"])');
        const countElement = table.querySelector('.row-count');
        if (countElement) {
            countElement.textContent = `${visibleRows.length} of ${rows.length} records`;
        }
    }

    /**
     * Setup pagination
     */
    setupPagination() {
        const paginationContainers = document.querySelectorAll('.pagination-container');
        
        paginationContainers.forEach(container => {
            const table = container.previousElementSibling;
            if (table && table.tagName === 'TABLE') {
                this.initTablePagination(table, container);
            }
        });
    }

    /**
     * Initialize table pagination
     */
    initTablePagination(table, container) {
        const rowsPerPage = parseInt(container.dataset.perPage) || 10;
        const rows = table.querySelectorAll('tbody tr');
        const totalPages = Math.ceil(rows.length / rowsPerPage);
        let currentPage = 1;
        
        const showPage = (page) => {
            const start = (page - 1) * rowsPerPage;
            const end = start + rowsPerPage;
            
            rows.forEach((row, index) => {
                row.style.display = (index >= start && index < end) ? '' : 'none';
            });
            
            // Update pagination controls
            this.updatePaginationControls(container, page, totalPages);
        };
        
        // Initial page display
        showPage(1);
        
        // Add event listeners to pagination controls
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('page-btn')) {
                const page = parseInt(e.target.dataset.page);
                if (page >= 1 && page <= totalPages) {
                    currentPage = page;
                    showPage(currentPage);
                }
            }
        });
    }

    /**
     * Update pagination controls
     */
    updatePaginationControls(container, currentPage, totalPages) {
        let paginationHTML = '';
        
        // Previous button
        if (currentPage > 1) {
            paginationHTML += `<button class="page-btn" data-page="${currentPage - 1}">Previous</button>`;
        }
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === currentPage) {
                paginationHTML += `<button class="page-btn active" data-page="${i}">${i}</button>`;
            } else if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
                paginationHTML += `<button class="page-btn" data-page="${i}">${i}</button>`;
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                paginationHTML += `<span class="pagination-dots">...</span>`;
            }
        }
        
        // Next button
        if (currentPage < totalPages) {
            paginationHTML += `<button class="page-btn" data-page="${currentPage + 1}">Next</button>`;
        }
        
        container.innerHTML = paginationHTML;
    }

    /**
     * Initialize charts
     */
    initializeCharts() {
        // Only initialize if Chart.js is available
        if (typeof Chart === 'undefined') return;
        
        this.initDonationChart();
        this.initActivityChart();
        this.initImpactChart();
    }

    /**
     * Initialize donation chart
     */
    initDonationChart() {
        const ctx = document.getElementById('donationChart');
        if (!ctx) return;
        
        this.chartInstances.donation = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Donations',
                    data: [],
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + value.toLocaleString('en-IN');
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Amount: ₹' + context.parsed.y.toLocaleString('en-IN');
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Update dashboard data automatically
     */
    setupAutoRefresh() {
        // Refresh every 5 minutes
        this.refreshInterval = setInterval(() => {
            const activeSection = document.querySelector('.dashboard-section.active');
            if (activeSection) {
                this.loadSectionData(activeSection.id);
            }
        }, 5 * 60 * 1000);
    }

    /**
     * Setup notifications
     */
    setupNotifications() {
        // Check for new notifications
        this.checkNotifications();
        
        // Setup notification handlers
        const notificationBtn = document.querySelector('.notifications-btn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => {
                this.toggleNotificationsPanel();
            });
        }
        
        // Mark notifications as read
        const notificationItems = document.querySelectorAll('.notification-item');
        notificationItems.forEach(item => {
            item.addEventListener('click', () => {
                this.markNotificationRead(item.dataset.id);
            });
        });
    }

    /**
     * Check for new notifications
     */
    async checkNotifications() {
        try {
            const response = await this.makeAPICall('/notifications.php');
            
            if (response.success) {
                this.updateNotificationsBadge(response.data.unread_count);
                this.updateNotificationsList(response.data.notifications);
            }
        } catch (error) {
            console.error('Error checking notifications:', error);
        }
    }

    /**
     * Update user info display
     */
    updateUserInfo() {
        if (!this.currentUser) return;
        
        // Update user name
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(element => {
            element.textContent = this.currentUser.name;
        });
        
        // Update user email
        const userEmailElements = document.querySelectorAll('.user-email');
        userEmailElements.forEach(element => {
            element.textContent = this.currentUser.email;
        });
        
        // Update user avatar
        const userAvatarElements = document.querySelectorAll('.user-avatar');
        userAvatarElements.forEach(element => {
            element.src = this.currentUser.avatar_url || './images/default-avatar.png';
        });
        
        // Update user type badge
        const userTypeElements = document.querySelectorAll('.user-type');
        userTypeElements.forEach(element => {
            element.textContent = this.capitalize(this.currentUser.user_type);
            element.className = `user-type ${this.currentUser.user_type}`;
        });
    }

    /**
     * Setup mobile menu
     */
    setupMobileMenu() {
        const mobileToggle = document.querySelector('.mobile-menu-toggle');
        const sidebar = document.querySelector('.dashboard-sidebar');
        
        if (mobileToggle && sidebar) {
            mobileToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
                mobileToggle.classList.toggle('active');
            });
            
            // Close sidebar when clicking outside
            document.addEventListener('click', (e) => {
                if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
                    sidebar.classList.remove('active');
                    mobileToggle.classList.remove('active');
                }
            });
        }
    }

    /**
     * Setup logout handler
     */
    setupLogoutHandler() {
        const logoutButtons = document.querySelectorAll('.logout-btn');
        logoutButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                
                if (confirm('Are you sure you want to logout?')) {
                    try {
                        await this.makeAPICall('/auth.php?action=logout', {
                            method: 'POST'
                        });
                        
                        this.showNotification('Logged out successfully', 'success');
                        
                        setTimeout(() => {
                            window.location.href = './index.html';
                        }, 1000);
                        
                    } catch (error) {
                        console.error('Logout error:', error);
                        this.showNotification('Logout failed', 'error');
                    }
                }
            });
        });
    }

    /**
     * Utility functions
     */
    
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }
    
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * API and utility methods
     */
    
    async initializeCSRFToken() {
        try {
            const response = await fetch(`${this.apiURL}/auth.php?action=csrf_token`);
            const data = await response.json();
            this.csrfToken = data.csrf_token || '';
        } catch (error) {
            console.error('CSRF token initialization failed:', error);
        }
    }
    
    async makeAPICall(endpoint, options = {}) {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': this.csrfToken
            }
        };

        const finalOptions = { ...defaultOptions, ...options };
        
        const response = await fetch(`${this.apiURL}${endpoint}`, finalOptions);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    }
    
    showNotification(message, type = 'info', duration = 5000) {
        const existing = document.querySelectorAll('.notification');
        existing.forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.setAttribute('role', 'alert');
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-message">${message}</div>
                <button class="notification-close" aria-label="Close notification" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        document.body.appendChild(notification);

        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
    }
    
    showErrorMessage(message) {
        this.showNotification(message, 'error');
    }
    
    redirectToLogin() {
        this.showNotification('Please log in to access this page', 'warning');
        setTimeout(() => {
            window.location.href = './login.html';
        }, 2000);
    }
    
    updatePageTitle(sectionId) {
        const titles = {
            'overview': 'Dashboard Overview',
            'donations': 'My Donations',
            'events': 'Events',
            'volunteering': 'Volunteering',
            'profile': 'My Profile',
            'settings': 'Settings'
        };
        
        document.title = titles[sectionId] + ' - Sai Seva Foundation';
    }
    
    trackEvent(eventName, properties = {}) {
        if (typeof gtag === 'function') {
            gtag('event', eventName, {
                ...properties,
                user_type: this.currentUser?.user_type
            });
        }
        console.log('Dashboard event tracked:', eventName, properties);
    }

    /**
     * Cleanup when dashboard is destroyed
     */
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        // Destroy chart instances
        Object.values(this.chartInstances).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.dashboard) {
        window.dashboard.destroy();
    }
});

// Export for global access
window.Dashboard = Dashboard;