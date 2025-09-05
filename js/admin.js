/**
 * PRODUCTION Admin Dashboard JavaScript - Sai Seva Foundation
 * Complete admin panel functionality with advanced management features
 * 
 * @version 1.0.0
 * @author Sai Seva Foundation Development Team
 */

class AdminDashboard {
    constructor() {
        this.baseURL = window.location.origin;
        this.apiURL = this.baseURL + '/api';
        this.csrfToken = '4ff0c3a6f7cdb69870b0963c2cbd2f648d39f851f7bc00b42a8e69aacc8955b0';
        this.currentAdmin = null;
        this.refreshInterval = null;
        this.chartInstances = {};
        this.tableInstances = {};
        this.selectedItems = new Set();
        
        this.init();
    }

    /**
     * Initialize admin dashboard
     */
    init() {
        this.checkAdminAuthentication();
        this.initializeCSRFToken();
        this.setupEventListeners();
        this.loadDashboardData();
        this.setupAutoRefresh();
        this.initializeCharts();
        this.setupDataTables();
        this.setupNotifications();
        this.initializePermissions();
    }

    /**
     * Check admin authentication
     */
    async checkAdminAuthentication() {
        try {
            const response = await this.makeAPICall('/auth.php?action=check_session');
            
            if (!response.authenticated || response.user.user_type !== 'admin') {
                this.redirectToLogin();
                return;
            }
            
            this.currentAdmin = response.user;
            this.updateAdminInfo();
            
        } catch (error) {
            console.error('Admin authentication check failed:', error);
            this.redirectToLogin();
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Sidebar navigation
        this.setupSidebarNavigation();
        
        // Bulk actions
        this.setupBulkActions();
        
        // Modal handlers
        this.setupModalHandlers();
        
        // Form submissions
        this.setupFormHandlers();
        
        // Search and filtering
        this.setupAdvancedFiltering();
        
        // Export functionality
        this.setupExportHandlers();
        
        // Settings
        this.setupSettingsHandlers();
        
        // Real-time updates
        this.setupRealTimeUpdates();
    }

    /**
     * Setup sidebar navigation
     */
    setupSidebarNavigation() {
        const sidebarLinks = document.querySelectorAll('.admin-sidebar-nav a');
        
        sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                const targetSection = link.dataset.section;
                this.showAdminSection(targetSection);
                
                // Update active link
                sidebarLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                // Track admin navigation
                this.trackAdminEvent('admin_navigation', { section: targetSection });
            });
        });
        
        // Handle sub-menu toggles
        const menuToggles = document.querySelectorAll('.submenu-toggle');
        menuToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const submenu = toggle.nextElementSibling;
                const isOpen = submenu.classList.contains('open');
                
                // Close all submenus
                document.querySelectorAll('.submenu').forEach(menu => {
                    menu.classList.remove('open');
                });
                document.querySelectorAll('.submenu-toggle').forEach(t => {
                    t.classList.remove('active');
                });
                
                // Toggle current submenu
                if (!isOpen) {
                    submenu.classList.add('open');
                    toggle.classList.add('active');
                }
            });
        });
    }

    /**
     * Show specific admin section
     */
    showAdminSection(sectionId) {
        // Hide all sections
        const sections = document.querySelectorAll('.admin-section');
        sections.forEach(section => {
            section.classList.remove('active');
        });
        
        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            
            // Load section-specific data
            this.loadAdminSectionData(sectionId);
            
            // Update page title
            this.updatePageTitle(sectionId);
            
            // Update breadcrumb
            this.updateBreadcrumb(sectionId);
        }
    }

    /**
     * Load data for specific admin section
     */
    async loadAdminSectionData(sectionId) {
        const loadingIndicator = document.querySelector(`#${sectionId} .loading`);
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }
        
        try {
            switch (sectionId) {
                case 'admin-overview':
                    await this.loadAdminOverview();
                    break;
                case 'manage-users':
                    await this.loadUsersData();
                    break;
                case 'manage-donations':
                    await this.loadDonationsManagement();
                    break;
                case 'manage-events':
                    await this.loadEventsManagement();
                    break;
                case 'manage-volunteers':
                    await this.loadVolunteersManagement();
                    break;
                case 'manage-content':
                    await this.loadContentManagement();
                    break;
                case 'financial-reports':
                    await this.loadFinancialReports();
                    break;
                case 'system-settings':
                    await this.loadSystemSettings();
                    break;
                case 'audit-logs':
                    await this.loadAuditLogs();
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
     * Load admin overview data
     */
    async loadAdminOverview() {
        try {
            const response = await this.makeAPICall('/admin.php?action=overview');
            
            if (response.success) {
                this.updateOverviewStats(response.data.stats);
                this.updateRecentActivity(response.data.activity);
                this.updateSystemHealth(response.data.health);
                this.updatePendingTasks(response.data.pending_tasks);
                
                // Update dashboard charts
                if (response.data.charts) {
                    this.updateAdminCharts(response.data.charts);
                }
            }
        } catch (error) {
            console.error('Error loading admin overview:', error);
        }
    }

    /**
     * Load users management data
     */
    async loadUsersData() {
        try {
            const response = await this.makeAPICall('/admin.php?action=users');
            
            if (response.success) {
                this.updateUsersTable(response.data.users);
                this.updateUserStats(response.data.stats);
                this.setupUserActions();
            }
        } catch (error) {
            console.error('Error loading users data:', error);
        }
    }

    /**
     * Setup bulk actions
     */
    setupBulkActions() {
        // Select all checkbox
        const selectAllCheckboxes = document.querySelectorAll('.select-all');
        selectAllCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const table = e.target.closest('.admin-table');
                const itemCheckboxes = table.querySelectorAll('.select-item');
                
                itemCheckboxes.forEach(item => {
                    item.checked = e.target.checked;
                    this.handleItemSelection(item, e.target.checked);
                });
                
                this.updateBulkActionsUI();
            });
        });
        
        // Individual item selection
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('select-item')) {
                this.handleItemSelection(e.target, e.target.checked);
                this.updateBulkActionsUI();
            }
        });
        
        // Bulk action buttons
        const bulkActionBtns = document.querySelectorAll('.bulk-action-btn');
        bulkActionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleBulkAction(e.target.dataset.action);
            });
        });
    }

    /**
     * Handle item selection for bulk actions
     */
    handleItemSelection(checkbox, isSelected) {
        const itemId = checkbox.value;
        
        if (isSelected) {
            this.selectedItems.add(itemId);
        } else {
            this.selectedItems.delete(itemId);
        }
        
        // Update select all checkbox state
        const table = checkbox.closest('.admin-table');
        const selectAllCheckbox = table.querySelector('.select-all');
        const itemCheckboxes = table.querySelectorAll('.select-item');
        const checkedItems = table.querySelectorAll('.select-item:checked');
        
        if (selectAllCheckbox) {
            selectAllCheckbox.indeterminate = checkedItems.length > 0 && checkedItems.length < itemCheckboxes.length;
            selectAllCheckbox.checked = checkedItems.length === itemCheckboxes.length;
        }
    }

    /**
     * Update bulk actions UI
     */
    updateBulkActionsUI() {
        const selectedCount = this.selectedItems.size;
        const bulkActionsBar = document.querySelector('.bulk-actions-bar');
        
        if (bulkActionsBar) {
            if (selectedCount > 0) {
                bulkActionsBar.style.display = 'flex';
                bulkActionsBar.querySelector('.selected-count').textContent = `${selectedCount} item${selectedCount > 1 ? 's' : ''} selected`;
            } else {
                bulkActionsBar.style.display = 'none';
            }
        }
    }

    /**
     * Handle bulk actions
     */
    async handleBulkAction(action) {
        if (this.selectedItems.size === 0) {
            this.showErrorMessage('No items selected');
            return;
        }
        
        const confirmMessage = this.getBulkActionConfirmMessage(action, this.selectedItems.size);
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        try {
            const response = await this.makeAPICall('/admin.php?action=bulk_action', {
                method: 'POST',
                body: JSON.stringify({
                    action: action,
                    items: Array.from(this.selectedItems),
                    csrf_token: this.csrfToken
                })
            });
            
            if (response.success) {
                this.showNotification(`Bulk action completed: ${action}`, 'success');
                this.clearSelection();
                this.refreshCurrentSection();
                
                // Track bulk action
                this.trackAdminEvent('bulk_action', {
                    action: action,
                    count: this.selectedItems.size
                });
            } else {
                throw new Error(response.error || 'Bulk action failed');
            }
            
        } catch (error) {
            console.error('Bulk action error:', error);
            this.showErrorMessage(error.message || 'Bulk action failed');
        }
    }

    /**
     * Get confirmation message for bulk actions
     */
    getBulkActionConfirmMessage(action, count) {
        const messages = {
            'delete': `Are you sure you want to delete ${count} item${count > 1 ? 's' : ''}? This action cannot be undone.`,
            'activate': `Are you sure you want to activate ${count} item${count > 1 ? 's' : ''}?`,
            'deactivate': `Are you sure you want to deactivate ${count} item${count > 1 ? 's' : ''}?`,
            'export': `Export ${count} item${count > 1 ? 's' : ''} to CSV?`
        };
        
        return messages[action] || `Apply ${action} to ${count} item${count > 1 ? 's' : ''}?`;
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        this.selectedItems.clear();
        document.querySelectorAll('.select-item').forEach(checkbox => {
            checkbox.checked = false;
        });
        document.querySelectorAll('.select-all').forEach(checkbox => {
            checkbox.checked = false;
            checkbox.indeterminate = false;
        });
        this.updateBulkActionsUI();
    }

    /**
     * Setup advanced filtering
     */
    setupAdvancedFiltering() {
        // Date range filters
        const dateRangeInputs = document.querySelectorAll('.date-range-filter');
        dateRangeInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.applyFilters();
            });
        });
        
        // Status filters
        const statusFilters = document.querySelectorAll('.status-filter');
        statusFilters.forEach(filter => {
            filter.addEventListener('change', () => {
                this.applyFilters();
            });
        });
        
        // Search filters
        const searchFilters = document.querySelectorAll('.search-filter');
        searchFilters.forEach(filter => {
            filter.addEventListener('input', this.debounce(() => {
                this.applyFilters();
            }, 500));
        });
        
        // Clear filters button
        const clearFiltersBtn = document.querySelector('.clear-filters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }
    }

    /**
     * Apply current filters to data
     */
    applyFilters() {
        const currentSection = document.querySelector('.admin-section.active');
        if (!currentSection) return;
        
        const filters = this.collectCurrentFilters();
        
        // Apply filters to current section data
        switch (currentSection.id) {
            case 'manage-users':
                this.filterUsersData(filters);
                break;
            case 'manage-donations':
                this.filterDonationsData(filters);
                break;
            case 'manage-events':
                this.filterEventsData(filters);
                break;
            // Add more cases as needed
        }
        
        // Track filter usage
        this.trackAdminEvent('filters_applied', { filters: Object.keys(filters) });
    }

    /**
     * Collect current filter values
     */
    collectCurrentFilters() {
        const filters = {};
        
        // Date ranges
        const startDate = document.querySelector('.filter-start-date')?.value;
        const endDate = document.querySelector('.filter-end-date')?.value;
        if (startDate) filters.start_date = startDate;
        if (endDate) filters.end_date = endDate;
        
        // Status
        const status = document.querySelector('.filter-status')?.value;
        if (status) filters.status = status;
        
        // Search query
        const search = document.querySelector('.filter-search')?.value;
        if (search) filters.search = search;
        
        // Category
        const category = document.querySelector('.filter-category')?.value;
        if (category) filters.category = category;
        
        return filters;
    }

    /**
     * Setup export functionality
     */
    setupExportHandlers() {
        const exportBtns = document.querySelectorAll('.export-btn');
        exportBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleExport(e.target.dataset.format, e.target.dataset.type);
            });
        });
    }

    /**
     * Handle data export
     */
    async handleExport(format, type) {
        try {
            const filters = this.collectCurrentFilters();
            
            this.showNotification('Preparing export...', 'info');
            
            const response = await fetch(`${this.apiURL}/admin.php?action=export`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.csrfToken
                },
                body: JSON.stringify({
                    format: format,
                    type: type,
                    filters: filters,
                    selected_items: this.selectedItems.size > 0 ? Array.from(this.selectedItems) : null
                })
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${type}-export-${new Date().toISOString().split('T')[0]}.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.showNotification('Export completed successfully', 'success');
                
                // Track export
                this.trackAdminEvent('data_export', {
                    format: format,
                    type: type,
                    has_filters: Object.keys(filters).length > 0
                });
            } else {
                throw new Error('Export failed');
            }
            
        } catch (error) {
            console.error('Export error:', error);
            this.showErrorMessage('Export failed. Please try again.');
        }
    }

    /**
     * Setup real-time updates
     */
    setupRealTimeUpdates() {
        // Setup Server-Sent Events if supported
        if (typeof EventSource !== 'undefined') {
            this.setupSSE();
        }
        
        // Fallback to polling
        this.setupPolling();
    }

    /**
     * Setup Server-Sent Events for real-time updates
     */
    setupSSE() {
        this.eventSource = new EventSource(`${this.apiURL}/admin-events.php`);
        
        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleRealTimeUpdate(data);
            } catch (error) {
                console.error('SSE message parsing error:', error);
            }
        };
        
        this.eventSource.onerror = (error) => {
            console.error('SSE connection error:', error);
            // Fallback to polling
            this.eventSource.close();
            this.setupPolling();
        };
    }

    /**
     * Setup polling for updates
     */
    setupPolling() {
        this.refreshInterval = setInterval(() => {
            this.checkForUpdates();
        }, 30000); // Check every 30 seconds
    }

    /**
     * Handle real-time updates
     */
    handleRealTimeUpdate(data) {
        switch (data.type) {
            case 'new_donation':
                this.showNotification(`New donation received: ₹${data.amount}`, 'info');
                this.updateDashboardStats('donations', data);
                break;
            case 'new_user':
                this.showNotification('New user registered', 'info');
                this.updateDashboardStats('users', data);
                break;
            case 'new_contact':
                this.showNotification('New contact message received', 'info');
                this.updateNotificationsBadge();
                break;
            case 'system_alert':
                this.showNotification(data.message, data.severity || 'warning');
                break;
        }
    }

    /**
     * Initialize admin charts
     */
    initializeCharts() {
        if (typeof Chart === 'undefined') return;
        
        this.initRevenueChart();
        this.initUserGrowthChart();
        this.initDonationSourceChart();
        this.initGeographicChart();
    }

    /**
     * Initialize revenue chart
     */
    initRevenueChart() {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;
        
        this.chartInstances.revenue = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Revenue',
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
                                return '₹' + (value / 1000).toFixed(0) + 'K';
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Revenue: ₹' + context.parsed.y.toLocaleString('en-IN');
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Setup system health monitoring
     */
    setupSystemHealthMonitoring() {
        this.checkSystemHealth();
        
        // Check system health every 5 minutes
        setInterval(() => {
            this.checkSystemHealth();
        }, 5 * 60 * 1000);
    }

    /**
     * Check system health
     */
    async checkSystemHealth() {
        try {
            const response = await this.makeAPICall('/admin.php?action=system_health');
            
            if (response.success) {
                this.updateSystemHealthDisplay(response.data);
                
                // Show alerts for critical issues
                if (response.data.alerts && response.data.alerts.length > 0) {
                    response.data.alerts.forEach(alert => {
                        if (alert.severity === 'critical') {
                            this.showNotification(alert.message, 'error', 10000);
                        }
                    });
                }
            }
        } catch (error) {
            console.error('System health check error:', error);
        }
    }

    /**
     * Setup permissions and role management
     */
    initializePermissions() {
        const currentUserType = this.currentAdmin?.user_type;
        
        // Hide/show elements based on permissions
        const restrictedElements = document.querySelectorAll('[data-permission]');
        restrictedElements.forEach(element => {
            const requiredPermission = element.dataset.permission;
            if (!this.hasPermission(requiredPermission)) {
                element.style.display = 'none';
            }
        });
    }

    /**
     * Check if current admin has specific permission
     */
    hasPermission(permission) {
        // Admin permissions logic
        const adminPermissions = {
            'super_admin': ['*'], // All permissions
            'admin': ['manage_users', 'manage_content', 'view_reports', 'manage_donations'],
            'moderator': ['manage_content', 'view_reports']
        };
        
        const userPermissions = adminPermissions[this.currentAdmin?.user_type] || [];
        
        return userPermissions.includes('*') || userPermissions.includes(permission);
    }

    /**
     * Utility functions
     */
    
    debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }
    
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }
    
    formatNumber(number) {
        return new Intl.NumberFormat('en-IN').format(number);
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
     * API and core methods
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
        this.showNotification('Admin access required. Please log in.', 'warning');
        setTimeout(() => {
            window.location.href = './login.html?admin=1';
        }, 2000);
    }
    
    updatePageTitle(sectionId) {
        const titles = {
            'admin-overview': 'Admin Dashboard',
            'manage-users': 'User Management',
            'manage-donations': 'Donation Management',
            'manage-events': 'Event Management',
            'manage-volunteers': 'Volunteer Management',
            'financial-reports': 'Financial Reports',
            'system-settings': 'System Settings',
            'audit-logs': 'Audit Logs'
        };
        
        document.title = titles[sectionId] + ' - Sai Seva Foundation Admin';
    }
    
    updateBreadcrumb(sectionId) {
        const breadcrumb = document.querySelector('.breadcrumb');
        if (!breadcrumb) return;
        
        const breadcrumbs = {
            'admin-overview': 'Dashboard',
            'manage-users': 'Management > Users',
            'manage-donations': 'Management > Donations',
            'manage-events': 'Management > Events',
            'financial-reports': 'Reports > Financial',
            'system-settings': 'Settings > System'
        };
        
        breadcrumb.textContent = breadcrumbs[sectionId] || sectionId;
    }
    
    updateAdminInfo() {
        if (!this.currentAdmin) return;
        
        // Update admin name
        const adminNameElements = document.querySelectorAll('.admin-name');
        adminNameElements.forEach(element => {
            element.textContent = this.currentAdmin.name;
        });
        
        // Update admin role
        const adminRoleElements = document.querySelectorAll('.admin-role');
        adminRoleElements.forEach(element => {
            element.textContent = this.currentAdmin.user_type.replace('_', ' ').toUpperCase();
        });
    }
    
    trackAdminEvent(eventName, properties = {}) {
        if (typeof gtag === 'function') {
            gtag('event', eventName, {
                ...properties,
                admin_id: this.currentAdmin?.id,
                admin_role: this.currentAdmin?.user_type
            });
        }
        console.log('Admin event tracked:', eventName, properties);
    }

    /**
     * Cleanup when admin dashboard is destroyed
     */
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        if (this.eventSource) {
            this.eventSource.close();
        }
        
        // Destroy chart instances
        Object.values(this.chartInstances).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        
        // Clear selections
        this.clearSelection();
    }
}

// Initialize admin dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.adminDashboard) {
        window.adminDashboard.destroy();
    }
});

// Export for global access
window.AdminDashboard = AdminDashboard;