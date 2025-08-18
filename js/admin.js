// Admin dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check admin authentication
    const currentUser = window.auth.requireAuth('admin');
    if (!currentUser) return;

    const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
    const contentSections = document.querySelectorAll('.content-section');
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modalContent');
    const closeModal = document.querySelector('.close');

    // Sidebar navigation
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const sectionName = this.getAttribute('data-section');
            
            // Remove active class from all links and sections
            sidebarLinks.forEach(l => l.parentElement.classList.remove('active'));
            contentSections.forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked link and corresponding section
            this.parentElement.classList.add('active');
            document.getElementById(sectionName + '-section').classList.add('active');
            
            // Load section data
            loadSectionData(sectionName);
        });
    });

    // Modal functionality
    closeModal.addEventListener('click', function() {
        modal.style.display = 'none';
    });

    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Load dashboard data
    function loadDashboardData() {
        const donations = JSON.parse(localStorage.getItem('donations') || '[]');
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const projects = JSON.parse(localStorage.getItem('projects') || '[]');
        const events = JSON.parse(localStorage.getItem('events') || '[]');

        // Update statistics
        const totalDonations = donations.reduce((sum, d) => sum + d.amount, 0);
        const activeVolunteers = users.filter(u => u.type === 'volunteer' && u.isActive).length;
        const activeProjectsCount = projects.filter(p => p.status === 'active').length;
        const upcomingEventsCount = events.filter(e => new Date(e.date) > new Date()).length;

        document.getElementById('totalDonations').textContent = window.utils.formatCurrency(totalDonations);
        document.getElementById('totalVolunteers').textContent = activeVolunteers;
        document.getElementById('activeProjects').textContent = activeProjectsCount;
        document.getElementById('upcomingEvents').textContent = upcomingEventsCount;

        // Load recent donations widget
        loadRecentDonationsWidget();
        loadActiveProjectsWidget();
    }

    function loadRecentDonationsWidget() {
        const donations = JSON.parse(localStorage.getItem('donations') || '[]');
        const recentDonations = donations.slice(0, 5);
        const widget = document.getElementById('recentDonationsWidget');

        if (recentDonations.length === 0) {
            widget.innerHTML = '<p>No recent donations</p>';
            return;
        }

        const donationsHTML = recentDonations.map(donation => `
            <div class="widget-item">
                <strong>${donation.donor.name}</strong>
                <span>${window.utils.formatCurrency(donation.amount)}</span>
                <small>${window.utils.formatDate(donation.date)}</small>
            </div>
        `).join('');

        widget.innerHTML = donationsHTML;
    }

    function loadActiveProjectsWidget() {
        const projects = JSON.parse(localStorage.getItem('projects') || '[]');
        const activeProjects = projects.filter(p => p.status === 'active').slice(0, 5);
        const widget = document.getElementById('activeProjectsWidget');

        if (activeProjects.length === 0) {
            widget.innerHTML = '<p>No active projects</p>';
            return;
        }

        const projectsHTML = activeProjects.map(project => `
            <div class="widget-item">
                <strong>${project.name}</strong>
                <span>${project.progress}% complete</span>
                <small>Due: ${window.utils.formatDate(project.endDate)}</small>
            </div>
        `).join('');

        widget.innerHTML = projectsHTML;
    }

    function loadSectionData(section) {
        switch(section) {
            case 'donations':
                loadDonationsData();
                break;
            case 'volunteers':
                loadVolunteersData();
                break;
            case 'projects':
                loadProjectsData();
                break;
            case 'events':
                loadEventsData();
                break;
            case 'reports':
                loadReportsData();
                break;
            case 'users':
                loadUsersData();
                break;
        }
    }

    function loadDonationsData() {
        const donations = JSON.parse(localStorage.getItem('donations') || '[]');
        const tableBody = document.querySelector('#donationsTable tbody');

        const donationsHTML = donations.map(donation => `
            <tr>
                <td>${donation.id}</td>
                <td>${donation.donor.name}</td>
                <td>${window.utils.formatCurrency(donation.amount)}</td>
                <td>${getCauseLabel(donation.cause)}</td>
                <td>${window.utils.formatDate(donation.date)}</td>
                <td><span class="status ${donation.status}">${donation.status}</span></td>
                <td>
                    <button class="btn-sm btn-primary" onclick="viewDonation('${donation.id}')">View</button>
                    <button class="btn-sm btn-secondary" onclick="sendReceipt('${donation.id}')">Receipt</button>
                </td>
            </tr>
        `).join('');

        tableBody.innerHTML = donationsHTML;
    }

    function loadVolunteersData() {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const volunteers = users.filter(u => u.type === 'volunteer');
        const volunteerGrid = document.getElementById('volunteerGrid');

        const volunteersHTML = volunteers.map(volunteer => `
            <div class="volunteer-card">
                <h3>${volunteer.name}</h3>
                <p>Email: ${volunteer.email}</p>
                <p>Phone: ${volunteer.phone}</p>
                <p>Status: <span class="status ${volunteer.isActive ? 'active' : 'inactive'}">${volunteer.isActive ? 'Active' : 'Inactive'}</span></p>
                <div class="volunteer-actions">
                    <button class="btn-sm btn-primary" onclick="editVolunteer('${volunteer.id}')">Edit</button>
                    <button class="btn-sm btn-secondary" onclick="scheduleVolunteer('${volunteer.id}')">Schedule</button>
                </div>
            </div>
        `).join('');

        volunteerGrid.innerHTML = volunteersHTML;
    }

    function loadProjectsData() {
        const projects = JSON.parse(localStorage.getItem('projects') || '[]');
        const projectsGrid = document.getElementById('projectsGrid');

        const projectsHTML = projects.map(project => `
            <div class="project-card">
                <h3>${project.name}</h3>
                <p>${project.description}</p>
                <div class="project-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${project.progress}%"></div>
                    </div>
                    <span>${project.progress}%</span>
                </div>
                <p>Budget: ${window.utils.formatCurrency(project.budget)}</p>
                <p>Status: <span class="status ${project.status}">${project.status}</span></p>
                <div class="project-actions">
                    <button class="btn-sm btn-primary" onclick="editProject('${project.id}')">Edit</button>
                    <button class="btn-sm btn-secondary" onclick="viewProjectDetails('${project.id}')">Details</button>
                </div>
            </div>
        `).join('');

        projectsGrid.innerHTML = projectsHTML;
    }

    function loadEventsData() {
        const events = JSON.parse(localStorage.getItem('events') || '[]');
        const eventsList = document.getElementById('eventsList');

        const eventsHTML = events.map(event => `
            <div class="event-card">
                <h3>${event.name}</h3>
                <p>${event.description}</p>
                <p>Date: ${window.utils.formatDate(event.date)}</p>
                <p>Location: ${event.location}</p>
                <p>Attendees: ${event.attendees || 0}</p>
                <div class="event-actions">
                    <button class="btn-sm btn-primary" onclick="editEvent('${event.id}')">Edit</button>
                    <button class="btn-sm btn-secondary" onclick="manageAttendees('${event.id}')">Attendees</button>
                </div>
            </div>
        `).join('');

        eventsList.innerHTML = eventsHTML;
    }

    // Helper functions
    function getCauseLabel(cause) {
        const labels = {
            'poor-feeding': 'Poor Feeding Programs',
            'education': 'Educational Assistance',
            'medical': 'Medical Camps',
            'disaster': 'Disaster Relief',
            'general': 'General Fund'
        };
        return labels[cause];
    }

    // Global functions for buttons
    window.viewDonation = function(id) {
        const donations = JSON.parse(localStorage.getItem('donations') || '[]');
        const donation = donations.find(d => d.id === id);
        
        modalContent.innerHTML = `
            <h2>Donation Details</h2>
            <div class="donation-details">
                <p><strong>ID:</strong> ${donation.id}</p>
                <p><strong>Donor:</strong> ${donation.donor.name}</p>
                <p><strong>Email:</strong> ${donation.donor.email}</p>
                <p><strong>Amount:</strong> ${window.utils.formatCurrency(donation.amount)}</p>
                <p><strong>Cause:</strong> ${getCauseLabel(donation.cause)}</p>
                <p><strong>Date:</strong> ${window.utils.formatDate(donation.date)}</p>
                <p><strong>Status:</strong> ${donation.status}</p>
                ${donation.transactionId ? `<p><strong>Transaction ID:</strong> ${donation.transactionId}</p>` : ''}
            </div>
        `;
        modal.style.display = 'block';
    };

    window.editProject = function(id) {
        const projects = JSON.parse(localStorage.getItem('projects') || '[]');
        const project = projects.find(p => p.id === id);
        
        modalContent.innerHTML = `
            <h2>Edit Project</h2>
            <form id="editProjectForm">
                <div class="form-group">
                    <label>Project Name</label>
                    <input type="text" value="${project.name}" required>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea required>${project.description}</textarea>
                </div>
                <div class="form-group">
                    <label>Budget</label>
                    <input type="number" value="${project.budget}" required>
                </div>
                <div class="form-group">
                    <label>Progress (%)</label>
                    <input type="number" min="0" max="100" value="${project.progress}" required>
                </div>
                <button type="submit" class="btn-primary">Update Project</button>
            </form>
        `;
        modal.style.display = 'block';
    };

    // Initialize dashboard
    loadDashboardData();

    // Add some sample data if none exists
    if (!localStorage.getItem('projects')) {
        const sampleProjects = [
            {
                id: '1',
                name: 'Poor Feeding Program - Shirdi',
                description: 'Daily meal program for underprivileged children',
                budget: 500000,
                progress: 75,
                status: 'active',
                startDate: '2025-01-01',
                endDate: '2025-12-31'
            },
            {
                id: '2',
                name: 'Educational Support Initiative',
                description: 'Providing books and materials to students',
                budget: 200000,
                progress: 50,
                status: 'active',
                startDate: '2025-02-01',
                endDate: '2025-11-30'
            }
        ];
        localStorage.setItem('projects', JSON.stringify(sampleProjects));
    }

    if (!localStorage.getItem('events')) {
        const sampleEvents = [
            {
                id: '1',
                name: 'Free Medical Camp',
                description: 'Health checkup and medicine distribution',
                date: '2025-08-15',
                location: 'Ghanagapur',
                attendees: 150
            },
            {
                id: '2',
                name: 'Educational Seminar',
                description: 'Values and ethics seminar for youth',
                date: '2025-08-20',
                location: 'Shirdi',
                attendees: 75
            }
        ];
        localStorage.setItem('events', JSON.stringify(sampleEvents));
    }
});
