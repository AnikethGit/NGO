// Donation functionality with API integration
document.addEventListener('DOMContentLoaded', function() {
    const donationForm = document.getElementById('donationForm');
    const amountBtns = document.querySelectorAll('.amount-btn');
    const customAmount = document.getElementById('customAmount');
    const causeRadios = document.querySelectorAll('input[name="cause"]');
    const frequencyRadios = document.querySelectorAll('input[name="frequency"]');
    
    const selectedCause = document.getElementById('selectedCause');
    const selectedAmount = document.getElementById('selectedAmount');
    const selectedFrequency = document.getElementById('selectedFrequency');

    let currentAmount = 0;

    // Amount button selection
    amountBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            amountBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            currentAmount = parseInt(this.getAttribute('data-amount'));
            customAmount.value = '';
            updateAmountDisplay();
        });
    });

    // Custom amount input
    customAmount.addEventListener('input', function() {
        amountBtns.forEach(b => b.classList.remove('active'));
        currentAmount = parseInt(this.value) || 0;
        updateAmountDisplay();
    });

    // Cause and frequency selection
    causeRadios.forEach(radio => {
        radio.addEventListener('change', updateCauseDisplay);
    });

    frequencyRadios.forEach(radio => {
        radio.addEventListener('change', updateFrequencyDisplay);
    });

    // Form submission with API
    if (donationForm) {
        donationForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            if (currentAmount <= 0) {
                showNotification('Please select or enter a donation amount', 'error');
                return;
            }

            if (!validateForm(this)) {
                showNotification('Please fill all required fields', 'error');
                return;
            }

            const donationData = {
                donor_name: document.getElementById('donorName').value,
                donor_email: document.getElementById('donorEmail').value,
                donor_phone: document.getElementById('donorPhone').value,
                donor_pan: document.getElementById('donorPan').value,
                donor_address: document.getElementById('donorAddress').value,
                amount: currentAmount,
                cause: document.querySelector('input[name="cause"]:checked').value,
                frequency: document.querySelector('input[name="frequency"]:checked').value
            };

            try {
                showLoading(true);
                showNotification('Processing your donation...');

                const response = await fetch('api/donations.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(donationData)
                });

                const result = await response.json();

                if (result.success) {
                    showNotification('Thank you for your generous donation!');
                    
                    // Reset form
                    this.reset();
                    amountBtns.forEach(b => b.classList.remove('active'));
                    currentAmount = 0;
                    updateDisplays();
                    
                    // Show success details
                    showDonationSuccess(result);
                    
                    // Reload recent donations
                    await loadRecentDonations();
                } else {
                    showNotification(result.error || 'Donation processing failed', 'error');
                }
            } catch (error) {
                showNotification('Network error. Please try again.', 'error');
            } finally {
                showLoading(false);
            }
        });
    }

    async function loadRecentDonations() {
        const recentDonationsContainer = document.getElementById('recentDonations');
        if (!recentDonationsContainer) return;

        try {
            const response = await fetch('api/donations.php?limit=5');
            const result = await response.json();

            if (result.success && result.data.length > 0) {
                const donationsHTML = result.data.map(donation => `
                    <div class="donation-item">
                        <div class="donation-info">
                            <h4>${donation.donor_name}</h4>
                            <p>${formatCurrency(donation.amount)} for ${getCauseLabel(donation.cause)}</p>
                            <small>${formatDate(donation.created_at)}</small>
                        </div>
                        <div class="donation-status ${donation.status}">
                            ${donation.status}
                        </div>
                    </div>
                `).join('');

                recentDonationsContainer.innerHTML = donationsHTML;
            } else {
                recentDonationsContainer.innerHTML = '<p>No recent donations</p>';
            }
        } catch (error) {
            console.error('Failed to load recent donations:', error);
        }
    }

    function showDonationSuccess(result) {
        const modal = document.createElement('div');
        modal.className = 'donation-success-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h2>Donation Successful!</h2>
                <p>Transaction ID: <strong>${result.transaction_id}</strong></p>
                <p>A receipt has been sent to your email.</p>
                <button class="btn-primary" onclick="this.parentElement.parentElement.remove()">
                    Close
                </button>
            </div>
        `;
        
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        document.body.appendChild(modal);
    }

    // Helper functions
    function updateAmountDisplay() {
        selectedAmount.textContent = formatCurrency(currentAmount);
    }

    function updateCauseDisplay() {
        const selectedCauseValue = document.querySelector('input[name="cause"]:checked').value;
        selectedCause.textContent = getCauseLabel(selectedCauseValue);
    }

    function updateFrequencyDisplay() {
        const selectedFrequencyValue = document.querySelector('input[name="frequency"]:checked').value;
        const frequencyLabels = {
            'one-time': 'One-time',
            'monthly': 'Monthly',
            'yearly': 'Yearly'
        };
        selectedFrequency.textContent = frequencyLabels[selectedFrequencyValue];
    }

    function updateDisplays() {
        updateAmountDisplay();
        updateCauseDisplay();
        updateFrequencyDisplay();
    }

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

    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    }

    function formatDate(dateString) {
        return new Intl.DateTimeFormat('en-IN').format(new Date(dateString));
    }

    function validateForm(form) {
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('error');
                isValid = false;
            } else {
                field.classList.remove('error');
            }
        });

        return isValid;
    }

    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : '#dc3545'};
            color: white;
            padding: 1rem 2rem;
            border-radius: 5px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    function showLoading(show) {
        let loader = document.getElementById('loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'loader';
            loader.innerHTML = '<div class="spinner"></div>';
            loader.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            `;
            document.body.appendChild(loader);
        }
        
        loader.style.display = show ? 'flex' : 'none';
    }

    // Initialize displays
    updateDisplays();
    loadRecentDonations();
});
