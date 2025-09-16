/**
 * Volunteer Dashboard JavaScript - Sai Seva Foundation
 * Complete volunteer dashboard functionality with enhanced features
 * 
 * @version 1.0.0
 * @author Sai Seva Foundation Development Team
 */

class VolunteerDashboard {
    constructor() {
        this.baseURL = window.location.origin;
        this.apiURL = this.baseURL + '/api';
        this.currentSection = 'dashboard';
        this.volunteerId = null;
        this.volunteerData = {};
        this.csrfToken = null;
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
        
        this.init();
    }

    /**
     * Initialize volunteer dashboard
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
            
            // Initialize calendar
            this.initializeCalendar();
            
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
            
            if (!response.authenticated || response.user.user_type !== 'volunteer') {
                window.location.href = '/login.html?tab=login';
                return;
            }
            
            this.volunteerId = response.user.id;
            this.volunteerData = response.user;
            
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
        const nameElements = document.querySelectorAll('#volunteerName');
        nameElements.forEach(el => {
            el.textContent = this.volunteerData.name || 'Volunteer';
        });
        
        // Update profile avatar if available
        const avatarElements = document.querySelectorAll('#profileAvatar');
        if (this.volunteerData.avatar) {
            avatarElements.forEach(el => {
                el.src = this.volunteerData.avatar;
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

        // Calendar navigation
        document.getElementById('prevMonth')?.addEventListener('click', () => {
            this.navigateCalendar(-1);
        });
        
        document.getElementById('nextMonth')?.addEventListener('click', () => {
            this.navigateCalendar(1);
        });

        // Logout button
        document.querySelectorAll('.logout-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
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
        // Log activity form
        const logActivityForm = document.getElementById('logActivityForm');
        if (logActivityForm) {
            logActivityForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogActivity(e);
            });
        }

        // Profile form
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleUpdateProfile(e);
            });
        }

        // Availability form
        const availabilityForm = document.getElementById('availabilityForm');
        if (availabilityForm) {
            availabilityForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleUpdateAvailability(e);
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
            case 'register-event':
                this.switchSection('events');
                break;
            case 'log-hours':
                this.openModal('logActivityModal');
                break;
            case 'update-availability':
                this.switchSection('schedule');
                break;
            case 'view-training':
                this.switchSection('training');
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
            
            // Load recent activities
            await this.loadRecentActivities();
            
            // Load upcoming events
            await this.loadUpcomingEvents();
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showNotification('Failed to load dashboard data', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Load volunteer statistics
     */
    async loadStats() {
        try {
            const response = await this.makeAPICall('/volunteer.php?action=stats');
            
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
        document.getElementById('totalHours').textContent = stats.total_hours || '0';
        document.getElementById('eventsAttended').textContent = stats.events_attended || '0';
        document.getElementById('peopleHelped').textContent = stats.people_helped || '0';
        document.getElementById('achievements').textContent = stats.achievements || '0';
    }

    /**
     * Load recent activities
     */
    async loadRecentActivities() {
        try {
            const response = await this.makeAPICall('/volunteer.php?action=recent_activities');
            
            if (response.success) {
                this.displayRecentActivities(response.activities);
            }
        } catch (error) {
            console.error('Error loading recent activities:', error);
        }
    }

    /**
     * Display recent activities
     */
    displayRecentActivities(activities) {
        const container = document.getElementById('recentActivities');
        if (!container) return;

        if (!activities || activities.length === 0) {
            container.innerHTML = '<p class="no-data">No recent activities found</p>';
            return;
        }

        container.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-header">
                    <h3 class="activity-title">${activity.title}</h3>
                    <span class="activity-date">${this.formatDate(activity.date)}</span>
                </div>
                <p class="activity-description">${activity.description}</p>
                <div class="activity-meta">
                    <span class="activity-hours">${activity.hours}h</span>
                    <span class="activity-status ${activity.status}">${activity.status}</span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Load upcoming events
     */
    async loadUpcomingEvents() {
        try {
            const response = await this.makeAPICall('/volunteer.php?action=upcoming_events');
            
            if (response.success) {
                this.displayUpcomingEvents(response.events);
            }
        } catch (error) {
            console.error('Error loading upcoming events:', error);
        }
    }

    /**
     * Display upcoming events
     */
    displayUpcomingEvents(events) {
        const container = document.getElementById('upcomingEvents');
        if (!container) return;

        if (!events || events.length === 0) {
            container.innerHTML = '<p class="no-data">No upcoming events</p>';
            return;
        }

        container.innerHTML = events.map(event => `
            <div class="event-item">
                <div class="event-header">
                    <h3 class="event-title">${event.title}</h3>
                    <span class="event-date">${this.formatDate(event.date)}</span>
                </div>
                <div class="event-details">
                    <span class="event-time"><i class="fas fa-clock"></i> ${event.time}</span>
                    <span class="event-location"><i class="fas fa-map-marker-alt"></i> ${event.location}</span>
                </div>
                <div class="event-actions">
                    <button class="btn btn-primary" onclick="volunteerDashboard.registerForEvent(${event.id})">
                        Register
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Load section-specific data
     */
    async loadSectionData(section) {
        switch (section) {
            case 'activities':
                await this.loadActivities();
                break;
            case 'events':
                await this.loadEvents();
                break;
            case 'schedule':
                await this.loadSchedule();
                break;
            case 'training':
                await this.loadTraining();
                break;
            case 'hours':
                await this.loadHours();
                break;
            case 'certificates':
                await this.loadCertificates();
                break;
            case 'profile':
                await this.loadProfile();
                break;
        }
    }

    /**
     * Load volunteer activities
     */
    async loadActivities() {
        try {
            const response = await this.makeAPICall('/volunteer.php?action=activities');
            
            if (response.success) {
                this.displayActivitiesTable(response.activities);
            }
        } catch (error) {
            console.error('Error loading activities:', error);
        }
    }

    /**
     * Display activities table
     */
    displayActivitiesTable(activities) {
        const tbody = document.getElementById('activitiesTableBody');
        if (!tbody) return;

        if (!activities || activities.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No activities found</td></tr>';
            return;
        }

        tbody.innerHTML = activities.map(activity => `
            <tr>
                <td>${this.formatDate(activity.date)}</td>
                <td>${activity.title}</td>
                <td>${activity.hours}h</td>
                <td><span class="activity-status ${activity.status}">${activity.status}</span></td>
                <td>${activity.location || 'N/A'}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="volunteerDashboard.viewActivity(${activity.id})">
                        View
                    </button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Load events
     */
    async loadEvents() {
        try {
            const response = await this.makeAPICall('/volunteer.php?action=events');
            
            if (response.success) {
                this.displayEventsGrid(response.events);
            }
        } catch (error) {
            console.error('Error loading events:', error);
        }
    }

    /**
     * Display events grid
     */
    displayEventsGrid(events) {
        const container = document.getElementById('eventsGrid');
        if (!container) return;

        if (!events || events.length === 0) {
            container.innerHTML = '<p class="no-data">No events available</p>';
            return;
        }

        container.innerHTML = events.map(event => `
            <div class="event-card">
                <div class="event-image">
                    <i class="fas fa-calendar-alt"></i>
                </div>
                <div class="event-content">
                    <h3 class="event-title">${event.title}</h3>
                    <div class="event-details">
                        <div class="event-detail">
                            <i class="fas fa-calendar"></i>
                            <span>${this.formatDate(event.date)}</span>
                        </div>
                        <div class="event-detail">
                            <i class="fas fa-clock"></i>
                            <span>${event.time}</span>
                        </div>
                        <div class="event-detail">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${event.location}</span>
                        </div>
                        <div class="event-detail">
                            <i class="fas fa-users"></i>
                            <span>${event.volunteers_needed} volunteers needed</span>
                        </div>
                    </div>
                    <div class="event-actions">
                        ${event.registered ? 
                            '<button class="btn btn-success" disabled>Registered</button>' :
                            `<button class="btn btn-primary" onclick="volunteerDashboard.registerForEvent(${event.id})">Register</button>`
                        }
                        <button class="btn btn-secondary" onclick="volunteerDashboard.viewEventDetails(${event.id})">
                            Details
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Initialize calendar
     */
    initializeCalendar() {
        this.updateCalendar();
    }

    /**
     * Navigate calendar
     */
    navigateCalendar(direction) {
        this.currentMonth += direction;
        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        } else if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        }
        this.updateCalendar();
    }

    /**
     * Update calendar display
     */
    updateCalendar() {
        const currentMonthElement = document.getElementById('currentMonth');
        const calendarGrid = document.getElementById('calendar');
        
        if (!currentMonthElement || !calendarGrid) return;

        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        currentMonthElement.textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;

        // Generate calendar days
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        let calendarHTML = '';
        
        // Day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            calendarHTML += `<div class="calendar-day header">${day}</div>`;
        });

        // Empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            calendarHTML += '<div class="calendar-day empty"></div>';
        }

        // Days of the month
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = today.getDate() === day && 
                           today.getMonth() === this.currentMonth && 
                           today.getFullYear() === this.currentYear;
            
            calendarHTML += `
                <div class="calendar-day ${isToday ? 'today' : ''}" 
                     onclick="volunteerDashboard.selectDate(${this.currentYear}, ${this.currentMonth}, ${day})">
                    <span class="day-number">${day}</span>
                </div>
            `;
        }

        calendarGrid.innerHTML = calendarHTML;
    }

    /**
     * Handle date selection
     */
    selectDate(year, month, day) {
        const selectedDate = new Date(year, month, day);
        console.log('Selected date:', selectedDate);
        // Add logic to show events for selected date
    }

    /**
     * Handle log activity
     */
    async handleLogActivity(event) {
        const form = event.target;
        const formData = new FormData(form);
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;

        try {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging...';

            const data = {
                activity_date: formData.get('activity_date'),
                activity_type: formData.get('activity_type'),
                description: formData.get('description'),
                hours: parseFloat(formData.get('hours')),
                location: formData.get('location'),
                csrf_token: this.csrfToken
            };

            const response = await this.makeAPICall('/volunteer.php?action=log_activity', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (response.success) {
                this.showNotification('Activity logged successfully!', 'success');
                form.reset();
                this.closeModals();
                await this.loadDashboardData();
            } else {
                throw new Error(response.error || 'Failed to log activity');
            }

        } catch (error) {
            console.error('Error logging activity:', error);
            this.showNotification(error.message || 'Failed to log activity', 'error');
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
                skills: formData.get('skills'),
                availability: formData.get('availability'),
                experience: formData.get('experience'),
                emergency_contact: formData.get('emergency_contact'),
                csrf_token: this.csrfToken
            };

            const response = await this.makeAPICall('/volunteer.php?action=update_profile', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (response.success) {
                this.showNotification('Profile updated successfully!', 'success');
                this.volunteerData = { ...this.volunteerData, ...data };
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
     * Register for event
     */
    async registerForEvent(eventId) {
        try {
            const response = await this.makeAPICall('/volunteer.php?action=register_event', {
                method: 'POST',
                body: JSON.stringify({
                    event_id: eventId,
                    csrf_token: this.csrfToken
                })
            });

            if (response.success) {
                this.showNotification('Successfully registered for event!', 'success');
                await this.loadEvents();
                await this.loadUpcomingEvents();
            } else {
                throw new Error(response.error || 'Failed to register for event');
            }

        } catch (error) {
            console.error('Error registering for event:', error);
            this.showNotification(error.message || 'Failed to register for event', 'error');
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
            currency: 'INR'
        }).format(amount);
    }
}

// Initialize volunteer dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.volunteerDashboard = new VolunteerDashboard();
});

// Export for global access
window.VolunteerDashboard = VolunteerDashboard;