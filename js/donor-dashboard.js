/**
 * Donor Dashboard JavaScript - Sai Seva Foundation
 * Complete donor dashboard functionality with enhanced features
 * 
 * @version 1.0.0
 * @author Sai Seva Foundation Development Team
 */

class DonorDashboard {
    constructor() {
        this.baseURL = window.location.origin;
        this.apiURL = this.baseURL + '/api';
        this.currentSection = 'dashboard';
        this.donorId = null;
        this.donorData = {};
        this.csrfToken = null;
        this.charts = {};
        
        this.init();
    }

    /**
     * Initialize donor dashboard
     */
    async init() {
        try {
            // Check authentication
            await this.checkAuthentication();
            
            // Initialize CSRF token
            await this.initializeCSRFToken();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadDashboardData();
            
            // Initialize charts
            this.initializeCharts();
            
            // Setup notifications
            this.setupNotifications();
            
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            this.showNotification('Failed to initialize dashboard', 'error');
        }
    }

    /**
     * Check user authentication
     */
    async checkAuthentication() {
        try {
            const response = await this.makeAPICall('/auth.php?action=check_session');
            
            if (!response.authenticated || response.user.user_type !== 'user') {
                window.location.href = '/login.html?tab=login';
                return;
            }
            
            this.donorId = response.user.id;
            this.donorData = response.user;
            
            // Update UI with user info
            this.updateUserInfo();
            
        } catch (error) {
            console.error('Authentication check failed:', error);
            window.location.href = '/login.html';
        }
    }

    /**
     * Update user information in UI
     */
    updateUserInfo() {
        const nameElements = document.querySelectorAll('#donorName');
        nameElements.forEach(el => {
            el.textContent = this.donorData.name || 'Donor';
        });
        
        // Update profile avatar if available
        const avatarElements = document.querySelectorAll('#profileAvatar');
        if (this.donorData.avatar) {
            avatarElements.forEach(el => {
                el.src = this.donorData.avatar;
            });
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Sidebar navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.switchSection(section);
            });
        });

        // Quick action buttons
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.dataset.action;
                this.handleQuickAction(action);
            });
        });

        // Profile dropdown
        this.setupProfileDropdown();

        // Forms
        this.setupForms();

        // Filters
        this.setupFilters();

        // Logout button
        document.querySelectorAll('.logout-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        });

        // Export buttons
        document.getElementById('exportDonations')?.addEventListener('click', () => {
            this.exportDonations();
        });

        // Tax certificate downloads
        document.querySelectorAll('[data-year]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const year = e.target.dataset.year;
                this.downloadTaxCertificate(year);
            });
        });

        // Setup recurring donation
        document.getElementById('setupRecurring')?.addEventListener('click', () => {
            this.openModal('recurringModal');
        });
    }

    /**
     * Setup profile dropdown
     */
    setupProfileDropdown() {
        const dropdownToggle = document.querySelector('.dropdown-toggle');
        const dropdownMenu = document.querySelector('.dropdown-menu');
        
        if (dropdownToggle && dropdownMenu) {
            dropdownToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownMenu.classList.toggle('active');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                dropdownMenu.classList.remove('active');
            });
        }
    }

    /**
     * Setup forms
     */
    setupForms() {
        // Profile form
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleUpdateProfile(e);
            });
        }

        // Recurring donation form
        const recurringForm = document.getElementById('recurringForm');
        if (recurringForm) {
            recurringForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSetupRecurring(e);
            });
        }

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModals();
            });
        });

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModals();
                }
            });
        });
    }

    /**
     * Setup filters
     */
    setupFilters() {
        // Year filter
        document.getElementById('yearFilter')?.addEventListener('change', (e) => {
            this.filterDonations();
        });

        // Status filter
        document.getElementById('statusFilter')?.addEventListener('change', (e) => {
            this.filterDonations();
        });

        // Cause filter
        document.getElementById('causeFilter')?.addEventListener('change', (e) => {
            this.filterDonations();
        });
    }

    /**
     * Switch dashboard sections
     */
    switchSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`)?.classList.add('active');

        // Update content sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${sectionName}-section`)?.classList.add('active');

        this.currentSection = sectionName;

        // Load section-specific data
        this.loadSectionData(sectionName);
    }

    /**
     * Handle quick actions
     */
    handleQuickAction(action) {
        switch (action) {
            case 'download-receipt':
                this.switchSection('receipts');
                break;
            case 'update-profile':
                this.switchSection('profile');
                break;
            case 'view-impact':
                this.switchSection('impact');
                break;
            default:
                console.log('Unknown action:', action);
        }
    }

    /**
     * Load dashboard data
     */
    async loadDashboardData() {
        try {
            this.showLoading(true);
            
            // Load stats
            await this.loadStats();
            
            // Load recent donations
            await this.loadRecentDonations();
            
            // Load impact data
            await this.loadImpactData();
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showNotification('Failed to load dashboard data', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Load donor statistics
     */
    async loadStats() {
        try {
            const response = await this.makeAPICall('/donor.php?action=stats');
            
            if (response.success) {
                this.updateStatsDisplay(response.stats);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    /**
     * Update stats display
     */
    updateStatsDisplay(stats) {
        document.getElementById('totalDonated').textContent = this.formatCurrency(stats.total_donated || 0);
        document.getElementById('donationCount').textContent = stats.donation_count || '0';
        document.getElementById('livesImpacted').textContent = stats.lives_impacted || '0';
        document.getElementById('taxSavings').textContent = this.formatCurrency(stats.tax_savings || 0);
    }

    /**
     * Load recent donations
     */
    async loadRecentDonations() {
        try {
            const response = await this.makeAPICall('/donor.php?action=recent_donations');
            
            if (response.success) {
                this.displayRecentDonations(response.donations);
            }
        } catch (error) {
            console.error('Error loading recent donations:', error);
        }
    }

    /**
     * Display recent donations
     */
    displayRecentDonations(donations) {
        const container = document.getElementById('recentDonations');
        if (!container) return;

        if (!donations || donations.length === 0) {
            container.innerHTML = '<p class="no-data">No recent donations found</p>';
            return;
        }

        container.innerHTML = donations.map(donation => `
            <div class="donation-item">
                <div class="donation-header">
                    <span class="donation-amount">${this.formatCurrency(donation.amount)}</span>
                    <span class="donation-date">${this.formatDate(donation.date)}</span>
                </div>
                <span class="donation-cause">${this.formatCause(donation.cause)}</span>
                <div class="donation-meta">
                    <span class="donation-status ${donation.status}">${donation.status}</span>
                    ${donation.receipt_number ? `<span class="receipt-number">Receipt: ${donation.receipt_number}</span>` : ''}
                </div>
            </div>
        `).join('');
    }

    /**
     * Load impact data
     */
    async loadImpactData() {
        try {
            const response = await this.makeAPICall('/donor.php?action=impact');
            
            if (response.success) {
                this.updateImpactDisplay(response.impact);
            }
        } catch (error) {
            console.error('Error loading impact data:', error);
        }
    }

    /**
     * Update impact display
     */
    updateImpactDisplay(impact) {
        document.getElementById('mealsProvided').textContent = impact.meals_provided || '0';
        document.getElementById('studentsSupported').textContent = impact.students_supported || '0';
        document.getElementById('medicalAid').textContent = impact.medical_aid || '0';
        document.getElementById('familiesHelped').textContent = impact.families_helped || '0';
    }

    /**
     * Load section-specific data
     */
    async loadSectionData(section) {
        switch (section) {
            case 'donations':
                await this.loadDonations();
                break;
            case 'impact':
                await this.loadImpactReport();
                break;
            case 'receipts':
                await this.loadReceipts();
                break;
            case 'recurring':
                await this.loadRecurringDonations();
                break;
            case 'updates':
                await this.loadProjectUpdates();
                break;
            case 'recognition':
                await this.loadRecognition();
                break;
            case 'profile':
                await this.loadProfile();
                break;
        }
    }

    /**
     * Load donations
     */
    async loadDonations() {
        try {
            const response = await this.makeAPICall('/donor.php?action=donations');
            
            if (response.success) {
                this.displayDonationsTable(response.donations);
            }
        } catch (error) {
            console.error('Error loading donations:', error);
        }
    }

    /**
     * Display donations table
     */
    displayDonationsTable(donations) {
        const tbody = document.getElementById('donationsTableBody');
        if (!tbody) return;

        if (!donations || donations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No donations found</td></tr>';
            return;
        }

        tbody.innerHTML = donations.map(donation => `
            <tr>
                <td>${this.formatDate(donation.date)}</td>
                <td>${this.formatCurrency(donation.amount)}</td>
                <td>${this.formatCause(donation.cause)}</td>
                <td><span class="donation-status ${donation.status}">${donation.status}</span></td>
                <td>
                    ${donation.receipt_number ? 
                        `<button class="btn btn-sm btn-secondary" onclick="donorDashboard.downloadReceipt('${donation.receipt_number}')">
                            <i class="fas fa-download"></i>
                        </button>` : 
                        'N/A'
                    }
                </td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="donorDashboard.viewDonation(${donation.id})">
                        View
                    </button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Load impact report
     */
    async loadImpactReport() {
        try {
            const response = await this.makeAPICall('/donor.php?action=impact_report');
            
            if (response.success) {
                this.displayImpactReport(response.report);
                this.updateCharts(response.chart_data);
            }
        } catch (error) {
            console.error('Error loading impact report:', error);
        }
    }

    /**
     * Initialize charts
     */
    initializeCharts() {
        // Cause distribution chart
        const causeChartCanvas = document.getElementById('causeChart');
        if (causeChartCanvas) {
            const ctx = causeChartCanvas.getContext('2d');
            this.charts.causeChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [
                            '#dc3545',
                            '#fd7e14',
                            '#28a745',
                            '#17a2b8',
                            '#6f42c1'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }

        // Trend chart
        const trendChartCanvas = document.getElementById('trendChart');
        if (trendChartCanvas) {
            const ctx = trendChartCanvas.getContext('2d');
            this.charts.trendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Monthly Donations',
                        data: [],
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
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
                                    return '₹' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    /**
     * Update charts with data
     */
    updateCharts(chartData) {
        if (this.charts.causeChart && chartData.cause_distribution) {
            this.charts.causeChart.data.labels = chartData.cause_distribution.labels;
            this.charts.causeChart.data.datasets[0].data = chartData.cause_distribution.data;
            this.charts.causeChart.update();
        }

        if (this.charts.trendChart && chartData.monthly_trend) {
            this.charts.trendChart.data.labels = chartData.monthly_trend.labels;
            this.charts.trendChart.data.datasets[0].data = chartData.monthly_trend.data;
            this.charts.trendChart.update();
        }
    }

    /**
     * Filter donations
     */
    async filterDonations() {
        const year = document.getElementById('yearFilter')?.value;
        const status = document.getElementById('statusFilter')?.value;
        const cause = document.getElementById('causeFilter')?.value;

        const params = new URLSearchParams();
        if (year && year !== 'all') params.append('year', year);
        if (status && status !== 'all') params.append('status', status);
        if (cause && cause !== 'all') params.append('cause', cause);

        try {
            const response = await this.makeAPICall(`/donor.php?action=donations&${params}`);
            
            if (response.success) {
                this.displayDonationsTable(response.donations);
            }
        } catch (error) {
            console.error('Error filtering donations:', error);
        }
    }

    /**
     * Export donations
     */
    async exportDonations() {
        try {
            const response = await this.makeAPICall('/donor.php?action=export_donations', {
                method: 'POST',
                body: JSON.stringify({
                    csrf_token: this.csrfToken
                })
            });

            if (response.success) {
                // Create download link
                const link = document.createElement('a');
                link.href = response.download_url;
                link.download = 'donations_report.csv';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                this.showNotification('Donations exported successfully!', 'success');
            } else {
                throw new Error(response.error || 'Failed to export donations');
            }

        } catch (error) {
            console.error('Error exporting donations:', error);
            this.showNotification(error.message || 'Failed to export donations', 'error');
        }
    }

    /**
     * Download tax certificate
     */
    async downloadTaxCertificate(year) {
        try {
            const response = await this.makeAPICall(`/donor.php?action=tax_certificate&year=${year}`, {
                method: 'POST',
                body: JSON.stringify({
                    csrf_token: this.csrfToken
                })
            });

            if (response.success) {
                // Create download link
                const link = document.createElement('a');
                link.href = response.certificate_url;
                link.download = `tax_certificate_${year}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                this.showNotification('Tax certificate downloaded successfully!', 'success');
            } else {
                throw new Error(response.error || 'Failed to download certificate');
            }

        } catch (error) {
            console.error('Error downloading certificate:', error);
            this.showNotification(error.message || 'Failed to download certificate', 'error');
        }
    }

    /**
     * Handle setup recurring donation
     */
    async handleSetupRecurring(event) {
        const form = event.target;
        const formData = new FormData(form);
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;

        try {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Setting up...';

            const data = {
                amount: parseFloat(formData.get('amount')),
                cause: formData.get('cause'),
                start_date: formData.get('start_date'),
                csrf_token: this.csrfToken
            };

            const response = await this.makeAPICall('/donor.php?action=setup_recurring', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (response.success) {
                this.showNotification('Recurring donation set up successfully!', 'success');
                form.reset();
                this.closeModals();
                await this.loadRecurringDonations();
            } else {
                throw new Error(response.error || 'Failed to setup recurring donation');
            }

        } catch (error) {
            console.error('Error setting up recurring donation:', error);
            this.showNotification(error.message || 'Failed to setup recurring donation', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    }

    /**
     * Handle profile update
     */
    async handleUpdateProfile(event) {
        const form = event.target;
        const formData = new FormData(form);
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;

        try {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

            const data = {
                full_name: formData.get('full_name'),
                phone: formData.get('phone'),
                address: formData.get('address'),
                pan_number: formData.get('pan_number'),
                preferred_causes: formData.getAll('causes[]'),
                communication_preferences: formData.getAll('communication[]'),
                anonymous_donations: formData.has('anonymous_donations'),
                csrf_token: this.csrfToken
            };

            const response = await this.makeAPICall('/donor.php?action=update_profile', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (response.success) {
                this.showNotification('Profile updated successfully!', 'success');
                this.donorData = { ...this.donorData, ...data };
                this.updateUserInfo();
            } else {
                throw new Error(response.error || 'Failed to update profile');
            }

        } catch (error) {
            console.error('Error updating profile:', error);
            this.showNotification(error.message || 'Failed to update profile', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    }

    /**
     * View donation details
     */
    async viewDonation(donationId) {
        try {
            const response = await this.makeAPICall(`/donor.php?action=donation_details&id=${donationId}`);
            
            if (response.success) {
                this.displayDonationModal(response.donation);
            } else {
                throw new Error(response.error || 'Failed to load donation details');
            }

        } catch (error) {
            console.error('Error loading donation details:', error);
            this.showNotification(error.message || 'Failed to load donation details', 'error');
        }
    }

    /**
     * Display donation modal
     */
    displayDonationModal(donation) {
        const modalBody = document.getElementById('donationModalBody');
        if (!modalBody) return;

        modalBody.innerHTML = `
            <div class="donation-details">
                <h3>Donation Details</h3>
                <div class="detail-row">
                    <label>Amount:</label>
                    <span>${this.formatCurrency(donation.amount)}</span>
                </div>
                <div class="detail-row">
                    <label>Date:</label>
                    <span>${this.formatDate(donation.date)}</span>
                </div>
                <div class="detail-row">
                    <label>Cause:</label>
                    <span>${this.formatCause(donation.cause)}</span>
                </div>
                <div class="detail-row">
                    <label>Status:</label>
                    <span class="donation-status ${donation.status}">${donation.status}</span>
                </div>
                <div class="detail-row">
                    <label>Transaction ID:</label>
                    <span>${donation.transaction_id}</span>
                </div>
                ${donation.receipt_number ? `
                <div class="detail-row">
                    <label>Receipt Number:</label>
                    <span>${donation.receipt_number}</span>
                </div>
                ` : ''}
                <div class="modal-actions">
                    ${donation.receipt_number ? `
                    <button class="btn btn-primary" onclick="donorDashboard.downloadReceipt('${donation.receipt_number}')">
                        <i class="fas fa-download"></i>
                        Download Receipt
                    </button>
                    ` : ''}
                </div>
            </div>
        `;

        this.openModal('donationModal');
    }

    /**
     * Download receipt
     */
    async downloadReceipt(receiptNumber) {
        try {
            const response = await this.makeAPICall(`/donor.php?action=download_receipt&receipt=${receiptNumber}`);

            if (response.success) {
                // Create download link
                const link = document.createElement('a');
                link.href = response.receipt_url;
                link.download = `receipt_${receiptNumber}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                this.showNotification('Receipt downloaded successfully!', 'success');
            } else {
                throw new Error(response.error || 'Failed to download receipt');
            }

        } catch (error) {
            console.error('Error downloading receipt:', error);
            this.showNotification(error.message || 'Failed to download receipt', 'error');
        }
    }

    /**
     * Handle logout
     */
    async handleLogout() {
        try {
            const response = await this.makeAPICall('/auth.php?action=logout', {
                method: 'POST'
            });

            if (response.success) {
                this.showNotification('Logged out successfully', 'success');
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 1000);
            }

        } catch (error) {
            console.error('Logout error:', error);
            this.showNotification('Logout failed', 'error');
        }
    }

    /**
     * Initialize CSRF token
     */
    async initializeCSRFToken() {
        try {
            const response = await fetch(`${this.apiURL}/auth.php?action=csrf_token`);
            const data = await response.json();
            
            if (data.success && data.csrf_token) {
                this.csrfToken = data.csrf_token;
            }
        } catch (error) {
            console.error('Failed to initialize CSRF token:', error);
        }
    }

    /**
     * Make API call
     */
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

    /**
     * Show/hide loading overlay
     */
    showLoading(show = true) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Open modal
     */
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Close all modals
     */
    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = 5000) {
        // Remove existing notifications
        const existing = document.querySelectorAll('.notification');
        existing.forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.setAttribute('role', 'alert');
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            ${message}
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.appendChild(notification);

        // Animate in
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // Auto remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
    }

    /**
     * Setup notifications
     */
    setupNotifications() {
        // Check for browser notifications permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    /**
     * Format date
     */
    formatDate(dateString) {
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        };
        return new Date(dateString).toLocaleDateString('en-IN', options);
    }

    /**
     * Format currency
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    /**
     * Format cause
     */
    formatCause(cause) {
        const causes = {
            'general': 'General Fund',
            'poor-feeding': 'Poor Feeding',
            'education': 'Education',
            'medical': 'Medical',
            'disaster': 'Disaster Relief'
        };
        return causes[cause] || cause;
    }
}

// Initialize donor dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.donorDashboard = new DonorDashboard();
});

// Export for global access
window.DonorDashboard = DonorDashboard;