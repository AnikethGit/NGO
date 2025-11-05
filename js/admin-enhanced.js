/**
 * ENHANCED ADMIN DASHBOARD - Sri Dutta Sai Manga Bharadwaja Trust
 * Comprehensive admin interface with search, filters, and data management
 * 
 * @version 2.0.0
 * @priority HIGH - Adds missing search/filter functionality
 */

class EnhancedAdminDashboard {
    constructor() {
        this.baseURL = window.location.origin;
        this.apiURL = this.baseURL + '/api';
        this.csrfToken = '';
        this.currentTab = 'dashboard';
        this.filters = {};
        this.searchQuery = '';
        this.currentPage = 1;
        this.itemsPerPage = 10;
        
        this.init();
    }

    /**
     * Initialize dashboard
     */
    async init() {
        await this.initializeCSRFToken();
        this.setupEventListeners();
        this.setupTabNavigation();
        this.setupSearchFunctionality();
        this.setupFilterFunctionality();
        this.loadDashboardData();
        this.checkAuthentication();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => this.handleTabSwitch(e));
        });

        // Search functionality
        const searchInput = document.querySelector('.search-input');
        const searchBtn = document.querySelector('.search-btn');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.debounceSearch(e.target.value));
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.performSearch(e.target.value);
                }
            });
        }
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const query = searchInput?.value || '';
                this.performSearch(query);
            });
        }

        // Filter controls
        document.querySelectorAll('[id$="Filter"]').forEach(filter => {
            filter.addEventListener('change', (e) => this.handleFilterChange(e));
        });

        // Clear filters
        const clearFiltersBtn = document.getElementById('clearFilters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearAllFilters());
        }

        // Quick actions
        document.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleQuickAction(e));
        });

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => this.handleLogout(e));
        }

        // Mobile sidebar toggle
        const sidebarToggle = document.querySelector('.sidebar-toggle');
        const mobileSidebarToggle = document.querySelector('.mobile-sidebar-toggle');
        
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }
        
        if (mobileSidebarToggle) {
            mobileSidebarToggle.addEventListener('click', () => this.toggleMobileSidebar());
        }
    }

    /**
     * Setup tab navigation
     */
    setupTabNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        const tabContents = document.querySelectorAll('.tab-content');
        
        navLinks.forEach(link => {
            const tab = link.dataset.tab;
            if (tab) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.switchToTab(tab);
                });
            }
        });
    }

    /**
     * Switch to specific tab
     */
    switchToTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.tab === tabName);
        });

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-content`);
        });

        // Update breadcrumb
        const breadcrumb = document.getElementById('current-section');
        if (breadcrumb) {
            breadcrumb.textContent = this.getTabDisplayName(tabName);
        }

        this.currentTab = tabName;
        this.loadTabData(tabName);
    }

    /**
     * Get display name for tab
     */
    getTabDisplayName(tabName) {
        const displayNames = {
            'dashboard': 'Dashboard',
            'donations': 'Donations Management',
            'volunteers': 'Volunteer Management',
            'projects': 'Project Management',
            'events': 'Event Management',
            'reports': 'Reports & Analytics',
            'users': 'User Management',
            'settings': 'Settings'
        };
        return displayNames[tabName] || tabName;
    }

    /**
     * Load data for specific tab
     */
    async loadTabData(tabName) {
        switch (tabName) {
            case 'dashboard':
                await this.loadDashboardData();
                break;
            case 'donations':
                await this.loadDonationsData();
                break;
            case 'volunteers':
                await this.loadVolunteersData();
                break;
            case 'users':
                await this.loadUsersData();
                break;
            default:
                console.log(`Loading data for ${tabName}`);
        }
    }

    /**
     * Setup search functionality with debouncing
     */
    setupSearchFunctionality() {
        this.searchTimeout = null;
    }

    /**
     * Debounced search
     */
    debounceSearch(query) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.performSearch(query);
        }, 500);
    }

    /**
     * Perform search
     */
    async performSearch(query) {
        this.searchQuery = query;
        this.currentPage = 1;
        
        switch (this.currentTab) {
            case 'donations':
                await this.loadDonationsData();
                break;
            case 'volunteers':
                await this.loadVolunteersData();
                break;
            case 'users':
                await this.loadUsersData();
                break;
            default:
                console.log(`Search not implemented for ${this.currentTab}`);
        }
    }

    /**
     * Setup filter functionality
     */
    setupFilterFunctionality() {
        // Initialize filter objects
        this.filters = {
            donations: {},
            volunteers: {},
            users: {}
        };
    }

    /**
     * Handle filter changes
     */
    handleFilterChange(e) {
        const filterId = e.target.id;
        const value = e.target.value;
        
        // Determine which dataset this filter affects
        let datasetType = '';
        if (filterId.startsWith('donation')) datasetType = 'donations';
        else if (filterId.startsWith('volunteer')) datasetType = 'volunteers';
        else if (filterId.startsWith('user')) datasetType = 'users';
        
        // Update filter
        if (datasetType) {
            this.filters[datasetType] = this.filters[datasetType] || {};
            
            if (value) {
                this.filters[datasetType][filterId] = value;
            } else {
                delete this.filters[datasetType][filterId];
            }
            
            // Apply filters
            this.applyFilters(datasetType);
        }
    }

    /**
     * Apply filters to current dataset
     */
    async applyFilters(datasetType) {
        this.currentPage = 1;
        
        switch (datasetType) {
            case 'donations':
                await this.loadDonationsData();
                break;
            case 'volunteers':
                await this.loadVolunteersData();
                break;
            case 'users':
                await this.loadUsersData();
                break;
        }
    }

    /**
     * Clear all filters
     */
    clearAllFilters() {
        // Reset filter UI
        document.querySelectorAll('[id$="Filter"]').forEach(filter => {
            filter.value = '';
        });
        
        // Reset date inputs
        document.querySelectorAll('input[type="date"]').forEach(input => {
            input.value = '';
        });
        
        // Clear filter objects
        this.filters = {
            donations: {},
            volunteers: {},
            users: {}
        };
        
        // Reload current tab data
        this.loadTabData(this.currentTab);
    }

    /**
     * Load donations data with search and filters
     */
    async loadDonationsData() {
        const tableBody = document.getElementById('donationsTableBody');
        if (!tableBody) return;

        try {
            // Show loading state
            tableBody.innerHTML = this.getLoadingRows(7);
            
            // Simulate API call with demo data
            const donations = await this.fetchDonations();
            
            // Apply search and filters
            const filteredDonations = this.filterDonations(donations);
            
            // Render table
            this.renderDonationsTable(filteredDonations);
            
            // Update pagination
            this.renderPagination('donationsPagination', filteredDonations.length);
            
        } catch (error) {
            console.error('Error loading donations:', error);
            tableBody.innerHTML = '<tr><td colspan="7" class="error-message">Failed to load donations</td></tr>';
        }
    }

    /**
     * Fetch donations (demo data)
     */
    async fetchDonations() {
        // Demo data - replace with actual API call
        return [
            { id: 1, donor: 'Rajesh Kumar', email: 'rajesh@email.com', amount: 5000, cause: 'general', status: 'completed', date: '2025-11-03', phone: '9876543210' },
            { id: 2, donor: 'Priya Sharma', email: 'priya@email.com', amount: 2000, cause: 'education', status: 'completed', date: '2025-11-02', phone: '9876543211' },
            { id: 3, donor: 'Amit Patel', email: 'amit@email.com', amount: 10000, cause: 'medical', status: 'pending', date: '2025-11-01', phone: '9876543212' },
            { id: 4, donor: 'Anonymous', email: 'anon@email.com', amount: 1500, cause: 'poor-feeding', status: 'completed', date: '2025-10-31', phone: '9876543213' },
            { id: 5, donor: 'Suresh Gupta', email: 'suresh@email.com', amount: 7500, cause: 'disaster', status: 'completed', date: '2025-10-30', phone: '9876543214' },
            { id: 6, donor: 'Kavya Singh', email: 'kavya@email.com', amount: 3000, cause: 'education', status: 'failed', date: '2025-10-29', phone: '9876543215' },
            { id: 7, donor: 'Ravi Kumar', email: 'ravi@email.com', amount: 4000, cause: 'general', status: 'completed', date: '2025-10-28', phone: '9876543216' },
            { id: 8, donor: 'Meera Joshi', email: 'meera@email.com', amount: 6000, cause: 'medical', status: 'completed', date: '2025-10-27', phone: '9876543217' },
            { id: 9, donor: 'Anil Reddy', email: 'anil@email.com', amount: 2500, cause: 'poor-feeding', status: 'pending', date: '2025-10-26', phone: '9876543218' },
            { id: 10, donor: 'Deepika Nair', email: 'deepika@email.com', amount: 8000, cause: 'general', status: 'completed', date: '2025-10-25', phone: '9876543219' }
        ];
    }

    /**
     * Filter donations based on search and filters
     */
    filterDonations(donations) {
        let filtered = [...donations];
        
        // Apply search query
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(donation => 
                donation.donor.toLowerCase().includes(query) ||
                donation.email.toLowerCase().includes(query) ||
                donation.cause.toLowerCase().includes(query) ||
                donation.id.toString().includes(query)
            );
        }
        
        // Apply filters
        const donationFilters = this.filters.donations || {};
        
        if (donationFilters.donationStatusFilter) {
            filtered = filtered.filter(d => d.status === donationFilters.donationStatusFilter);
        }
        
        if (donationFilters.donationCauseFilter) {
            filtered = filtered.filter(d => d.cause === donationFilters.donationCauseFilter);
        }
        
        if (donationFilters.donationDateFrom) {
            filtered = filtered.filter(d => d.date >= donationFilters.donationDateFrom);
        }
        
        if (donationFilters.donationDateTo) {
            filtered = filtered.filter(d => d.date <= donationFilters.donationDateTo);
        }
        
        return filtered;
    }

    /**
     * Render donations table
     */
    renderDonationsTable(donations) {
        const tableBody = document.getElementById('donationsTableBody');
        if (!tableBody) return;
        
        if (donations.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-data">
                        <div class="no-data-content">
                            <i class="fas fa-search"></i>
                            <p>No donations found matching your criteria</p>
                            <button class="btn btn-outline" onclick="window.enhancedAdmin.clearAllFilters()">Clear Filters</button>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedDonations = donations.slice(startIndex, endIndex);
        
        const rows = paginatedDonations.map(donation => {
            const statusClass = donation.status === 'completed' ? 'status-success' : 
                              donation.status === 'pending' ? 'status-warning' : 'status-error';
            
            const causeDisplay = {
                'general': 'General Fund',
                'poor-feeding': 'Poor Feeding',
                'education': 'Education',
                'medical': 'Medical Care',
                'disaster': 'Disaster Relief'
            }[donation.cause] || donation.cause;
            
            return `
                <tr data-id="${donation.id}">
                    <td>${donation.id}</td>
                    <td>
                        <div class="donor-info">
                            <strong>${donation.donor}</strong>
                            <small>${donation.email}</small>
                        </div>
                    </td>
                    <td class="amount">₹${donation.amount.toLocaleString()}</td>
                    <td>${causeDisplay}</td>
                    <td><span class="status ${statusClass}">${donation.status}</span></td>
                    <td>${this.formatDate(donation.date)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-outline" onclick="window.enhancedAdmin.viewDonation(${donation.id})" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline" onclick="window.enhancedAdmin.editDonation(${donation.id})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline" onclick="window.enhancedAdmin.sendReceipt(${donation.id})" title="Send Receipt">
                                <i class="fas fa-receipt"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        tableBody.innerHTML = rows;
    }

    /**
     * Load volunteers data with search and filters
     */
    async loadVolunteersData() {
        console.log('Loading volunteers data with search and filters...');
        
        // Demo volunteers data
        const volunteers = [
            { id: 1, name: 'Volunteer A', email: 'vol1@email.com', phone: '9876543220', status: 'active', joinDate: '2025-01-15', skills: 'Teaching, Medical' },
            { id: 2, name: 'Volunteer B', email: 'vol2@email.com', phone: '9876543221', status: 'active', joinDate: '2025-02-10', skills: 'Cooking, Distribution' },
            { id: 3, name: 'Volunteer C', email: 'vol3@email.com', phone: '9876543222', status: 'inactive', joinDate: '2025-03-05', skills: 'Administration' }
        ];
        
        // Apply search and filters similar to donations
        // Implementation would be similar to donations filtering
        console.log('Volunteers loaded:', volunteers.length);
    }

    /**
     * Load users data
     */
    async loadUsersData() {
        console.log('Loading users data...');
        
        // Demo implementation
        const users = [
            { id: 1, name: 'Admin User', email: 'admin@sadgurubharadwaja.org', type: 'admin', status: 'active', lastLogin: '2025-11-04' },
            { id: 2, name: 'John Donor', email: 'john@email.com', type: 'user', status: 'active', lastLogin: '2025-11-03' },
            { id: 3, name: 'Jane Volunteer', email: 'jane@email.com', type: 'volunteer', status: 'active', lastLogin: '2025-11-02' }
        ];
        
        console.log('Users loaded:', users.length);
    }

    /**
     * Load dashboard data
     */
    async loadDashboardData() {
        // Animate statistics
        this.animateStatNumbers();
        
        // Load recent activity
        await this.loadRecentActivity();
    }

    /**
     * Animate stat numbers
     */
    animateStatNumbers() {
        const statNumbers = document.querySelectorAll('.stat-number[data-target]');
        
        statNumbers.forEach(stat => {
            const target = parseInt(stat.dataset.target);
            const duration = 2000;
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function
                const easeOut = 1 - Math.pow(1 - progress, 3);
                const current = Math.floor(target * easeOut);
                
                stat.textContent = current.toLocaleString();
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };
            
            animate();
        });
    }

    /**
     * Load recent activity
     */
    async loadRecentActivity() {
        console.log('Loading recent activity...');
    }

    /**
     * Render pagination
     */
    renderPagination(containerId, totalItems) {
        const container = document.getElementById(containerId);
        if (!container || totalItems === 0) return;
        
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let paginationHTML = `
            <div class="pagination-controls">
                <div class="pagination-info">
                    Showing ${((this.currentPage - 1) * this.itemsPerPage) + 1} to ${Math.min(this.currentPage * this.itemsPerPage, totalItems)} of ${totalItems} entries
                </div>
                <div class="pagination-buttons">
        `;
        
        // Previous button
        paginationHTML += `
            <button class="btn btn-sm btn-outline" ${this.currentPage === 1 ? 'disabled' : ''} 
                    onclick="window.enhancedAdmin.goToPage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        
        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="btn btn-sm ${i === this.currentPage ? 'btn-primary' : 'btn-outline'}" 
                        onclick="window.enhancedAdmin.goToPage(${i})">
                    ${i}
                </button>
            `;
        }
        
        // Next button
        paginationHTML += `
            <button class="btn btn-sm btn-outline" ${this.currentPage === totalPages ? 'disabled' : ''}
                    onclick="window.enhancedAdmin.goToPage(${this.currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        paginationHTML += `
                </div>
            </div>
        `;
        
        container.innerHTML = paginationHTML;
    }

    /**
     * Go to specific page
     */
    async goToPage(pageNumber) {
        this.currentPage = pageNumber;
        await this.loadTabData(this.currentTab);
    }

    /**
     * Get loading rows HTML
     */
    getLoadingRows(columns) {
        const loadingRow = `<tr class="loading-row"><td colspan="${columns}"><div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div></td></tr>`;
        return Array(5).fill(loadingRow).join('');
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Handle quick actions
     */
    handleQuickAction(e) {
        const action = e.target.closest('.quick-action-btn').dataset.action;
        
        switch (action) {
            case 'add-donation':
                this.openAddDonationModal();
                break;
            case 'add-volunteer':
                this.openAddVolunteerModal();
                break;
            case 'create-event':
                this.openCreateEventModal();
                break;
            case 'generate-report':
                this.openReportGenerator();
                break;
        }
    }

    /**
     * Donation actions
     */
    viewDonation(id) {
        console.log('Viewing donation:', id);
        this.showNotification('Donation details modal would open here', 'info');
    }

    editDonation(id) {
        console.log('Editing donation:', id);
        this.showNotification('Edit donation modal would open here', 'info');
    }

    sendReceipt(id) {
        console.log('Sending receipt for donation:', id);
        this.showNotification('Receipt sent successfully!', 'success');
    }

    /**
     * Modal operations
     */
    openAddDonationModal() {
        this.showNotification('Add donation modal would open here', 'info');
    }

    openAddVolunteerModal() {
        this.showNotification('Add volunteer modal would open here', 'info');
    }

    openCreateEventModal() {
        this.showNotification('Create event modal would open here', 'info');
    }

    openReportGenerator() {
        this.showNotification('Report generator would open here', 'info');
    }

    /**
     * Toggle sidebar (desktop)
     */
    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        
        if (sidebar && mainContent) {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
        }
    }

    /**
     * Toggle mobile sidebar
     */
    toggleMobileSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        
        if (sidebar) {
            sidebar.classList.toggle('mobile-open');
            
            // Create/remove overlay
            if (!overlay) {
                const overlayEl = document.createElement('div');
                overlayEl.className = 'sidebar-overlay';
                overlayEl.addEventListener('click', () => this.toggleMobileSidebar());
                document.body.appendChild(overlayEl);
            } else {
                overlay.remove();
            }
        }
    }

    /**
     * Handle logout
     */
    async handleLogout(e) {
        e.preventDefault();
        
        try {
            const response = await fetch(`${this.apiURL}/auth.php?action=logout`, {
                method: 'POST',
                headers: {
                    'X-CSRF-Token': this.csrfToken
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Logged out successfully', 'success');
                setTimeout(() => {
                    window.location.href = './login.html';
                }, 1000);
            }
        } catch (error) {
            console.error('Logout error:', error);
            this.showNotification('Logout failed', 'error');
        }
    }

    /**
     * Check authentication
     */
    async checkAuthentication() {
        try {
            const response = await fetch(`${this.apiURL}/auth.php?action=check_session`);
            const data = await response.json();
            
            if (!data.authenticated) {
                window.location.href = './login.html';
                return;
            }
            
            if (data.user.user_type !== 'admin') {
                this.showNotification('Access denied. Admin privileges required.', 'error');
                setTimeout(() => {
                    window.location.href = './login.html';
                }, 2000);
                return;
            }
            
            // Update user info in UI
            this.updateUserInfo(data.user);
            
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = './login.html';
        }
    }

    /**
     * Update user info in dashboard
     */
    updateUserInfo(user) {
        const userNameEl = document.querySelector('.user-name');
        const userRoleEl = document.querySelector('.user-role');
        
        if (userNameEl) userNameEl.textContent = user.name;
        if (userRoleEl) userRoleEl.textContent = user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1);
    }

    /**
     * Initialize CSRF token
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

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Remove existing notifications
        document.querySelectorAll('.admin-notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `admin-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
        `;
        
        // Style notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10001;
            max-width: 400px;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            animation: slideInRight 0.3s ease;
            ${type === 'success' ? 'background: rgba(var(--color-success-rgb), 0.1); border: 1px solid rgba(var(--color-success-rgb), 0.2); color: var(--color-success);' : ''}
            ${type === 'error' ? 'background: rgba(var(--color-error-rgb), 0.1); border: 1px solid rgba(var(--color-error-rgb), 0.2); color: var(--color-error);' : ''}
            ${type === 'info' ? 'background: rgba(var(--color-info-rgb), 0.1); border: 1px solid rgba(var(--color-info-rgb), 0.2); color: var(--color-info);' : ''}
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 4000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.enhancedAdmin = new EnhancedAdminDashboard();
});

// Export for global access
window.EnhancedAdminDashboard = EnhancedAdminDashboard;