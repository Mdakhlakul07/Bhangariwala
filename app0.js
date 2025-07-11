// Vangariwala Waste Management App
class VangariwalApp {
    constructor() {
        this.currentUser = null;
        this.currentLanguage = 'en';
        this.supabase = null;
        this.map = null;
        this.activeTab = 'dashboard';
        
        // Enhanced waste types with BDT rates
        this.wasteTypes = [
            { type: "organic", co2_factor: 0.6, points_factor: 10, bdt_rate: 8, label_en: "Organic", label_bn: "জৈব বর্জ্য" },
            { type: "plastic", co2_factor: 1.2, points_factor: 10, bdt_rate: 25, label_en: "Plastic", label_bn: "প্লাস্টিক বর্জ্য" },
            { type: "paper", co2_factor: 0.4, points_factor: 10, bdt_rate: 18, label_en: "Paper", label_bn: "কাগজ বর্জ্য" },
            { type: "metal", co2_factor: 0.1, points_factor: 15, bdt_rate: 45, label_en: "Metal", label_bn: "ধাতব বর্জ্য" },
            { type: "glass", co2_factor: 0.1, points_factor: 12, bdt_rate: 12, label_en: "Glass", label_bn: "কাঁচ বর্জ্য" },
            { type: "electronic", co2_factor: 0.8, points_factor: 20, bdt_rate: 120, label_en: "Electronic", label_bn: "ইলেকট্রনিক বর্জ্য" }
        ];

        this.bangladeshLocations = [
            { name: "ধানমন্ডি ২৭, ঢাকা", name_en: "Dhanmondi 27, Dhaka", lat: 23.7465, lng: 90.3775, phone: "+8801700000001" },
            { name: "উত্তরা সেক্টর ৭", name_en: "Uttara Sector 7", lat: 23.8759, lng: 90.3795, phone: "+8801700000002" },
            { name: "বসুন্ধরা আ/এ ব্লক সি", name_en: "Bashundhara R/A Block C", lat: 23.8103, lng: 90.4125, phone: "+8801700000003" },
            { name: "গুলশান ২", name_en: "Gulshan 2", lat: 23.7925, lng: 90.4078, phone: "+8801700000004" },
            { name: "বনানী", name_en: "Banani", lat: 23.7936, lng: 90.4053, phone: "+8801700000005" }
        ];

        // Live counters
        this.totalPlatformCO2 = 2147.6;
        this.todayScrapKg = 128.4;

        this.demoData = {
            household_submissions: [
                { type: "plastic", weight: 2.5, points: 25, co2_saved: 3.0, date: "2025-07-01" },
                { type: "paper", weight: 1.8, points: 18, co2_saved: 0.72, date: "2025-06-28" },
                { type: "organic", weight: 3.2, points: 32, co2_saved: 1.92, date: "2025-06-25" }
            ],
            collector_requests: [
                { address: "ধানমন্ডি ২৭, ঢাকা", waste_type: "plastic", weight: 2.5, points: 25, status: "pending", lat: 23.7465, lng: 90.3775 },
                { address: "উত্তরা সেক্টর ৭", waste_type: "paper", weight: 1.8, points: 18, status: "available", lat: 23.8759, lng: 90.3795 },
                { address: "বসুন্ধরা আ/এ ব্লক সি", waste_type: "organic", weight: 3.2, points: 32, status: "available", lat: 23.8103, lng: 90.4125 }
            ],
            notifications: [
                { title: "Pickup Scheduled", message: "Your waste pickup is scheduled for tomorrow at 10 AM", time: "2 hours ago", type: "info", unread: true },
                { title: "Points Earned", message: "You earned 25 points for your plastic waste submission", time: "1 day ago", type: "success", unread: true },
                { title: "New Request", message: "New pickup request available in your area", time: "3 hours ago", type: "info", unread: true }
            ]
        };

        this.init();
    }

    async init() {
        try {
            // Initialize Supabase if available
            if (typeof supabase !== 'undefined') {
                const { createClient } = supabase;
                this.supabase = createClient(
                    'https://jmxdqbgbsuhzhcqptfyf.supabase.co',
                    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpteGRxYmdic3VoemhjcXB0ZnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0NjkzNjAsImV4cCI6MjA2NzA0NTM2MH0.D8R6E4xYE862uPCHU47bF2coYHCkMvgOTPB-4rpyvDU'
                );
            }

            this.createDemoData();
            this.initParticles();
            this.initLogoFallback();
            this.initLanguageToggle();
            this.initSplashScreen();
            this.checkExistingSession();
            this.initLiveCounters();
        } catch (error) {
            console.error('Initialization error:', error);
            this.showToast('Application initialization failed', 'error');
        }
    }

    // Initialize live counters
    initLiveCounters() {
        document.addEventListener('DOMContentLoaded', () => {
            const co2Counter = document.getElementById('live-co2-counter');
            const scrapCounter = document.getElementById('live-scrap-today');
            
            if (co2Counter) {
                co2Counter.textContent = `${this.totalPlatformCO2.toFixed(1)} kg CO₂`;
            }
            if (scrapCounter) {
                scrapCounter.textContent = `${this.todayScrapKg.toFixed(1)} kg`;
            }
        });
    }

    // Initialize Leaflet map for household dashboard
    initHouseholdMap() {
        const mapContainer = document.getElementById('leaflet-map');
        if (!mapContainer || this.map) return;

        this.map = L.map('leaflet-map').setView([23.8103, 90.4125], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Try to get user's location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    this.map.setView([lat, lng], 14);
                    
                    L.marker([lat, lng]).addTo(this.map)
                        .bindPopup('Your Location')
                        .openPopup();
                },
                (error) => {
                    console.log('Location access denied');
                }
            );
        }

        // Add collector markers
        this.bangladeshLocations.forEach(location => {
            const marker = L.marker([location.lat, location.lng]).addTo(this.map);
            marker.bindPopup(`
                <div>
                    <strong>${location.name_en}</strong><br>
                    <em>Active Now</em><br>
                    <span>${location.phone}</span>
                </div>
            `);
        });

        // Handle responsive resize
        setTimeout(() => {
            this.map.invalidateSize();
        }, 100);
    }

    // Enhanced waste calculation with BDT earnings
    calculateWasteTotals() {
        let totalWeight = 0;
        let totalPoints = 0;
        let totalCO2 = 0;
        let totalBDT = 0;

        this.wasteTypes.forEach(wasteType => {
            const input = document.querySelector(`input[data-waste="${wasteType.type}"]`);
            const weight = parseFloat(input?.value) || 0;
            
            totalWeight += weight;
            totalPoints += weight * wasteType.points_factor;
            totalCO2 += weight * wasteType.co2_factor;
            totalBDT += weight * wasteType.bdt_rate;
        });

        // Update summary display
        document.getElementById('summary-weight').textContent = totalWeight.toFixed(2);
        document.getElementById('summary-points').textContent = totalPoints.toFixed(0);
        document.getElementById('summary-co2').textContent = totalCO2.toFixed(2);
        document.getElementById('summary-bdt').textContent = totalBDT.toFixed(0);
    }

    // Logo Fallback System
    initLogoFallback() {
        const splashLogo = document.getElementById('splash-logo');
        const fallbackLogo = document.getElementById('fallback-logo');
        
        if (splashLogo && fallbackLogo) {
            splashLogo.onerror = () => {
                splashLogo.src = 'logo.jpg';
                splashLogo.onerror = () => {
                    splashLogo.src = 'logo.svg';
                    splashLogo.onerror = () => {
                        splashLogo.classList.add('hidden');
                        fallbackLogo.classList.remove('hidden');
                    };
                };
            };
            splashLogo.onload = () => {
                splashLogo.classList.remove('hidden');
            };
        }

        const headerLogo = document.getElementById('header-logo');
        const headerFallback = document.getElementById('header-fallback-logo');
        
        if (headerLogo && headerFallback) {
            headerLogo.onerror = () => {
                headerLogo.src = 'logo.jpg';
                headerLogo.onerror = () => {
                    headerLogo.src = 'logo.svg';
                    headerLogo.onerror = () => {
                        headerLogo.classList.add('hidden');
                        headerFallback.classList.remove('hidden');
                    };
                };
            };
            headerLogo.onload = () => {
                headerLogo.classList.remove('hidden');
            };
        }
    }

    // Particle Animation
    initParticles() {
        const container = document.getElementById('particles-container');
        if (!container) return;

        const particleCount = 50;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            const size = Math.random() * 6 + 2;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            particle.style.animationDelay = `${Math.random() * 6}s`;
            particle.style.animationDuration = `${6 + Math.random() * 4}s`;
            
            container.appendChild(particle);
        }
    }

    // Splash Screen
    initSplashScreen() {
        setTimeout(() => {
            document.getElementById('splash-screen').classList.add('hidden');
            document.getElementById('language-toggle').classList.remove('hidden');
            document.getElementById('auth-container').classList.remove('hidden');
            this.initEventListeners();
        }, 3000);
    }

    // Language Toggle
    initLanguageToggle() {
        const langBtn = document.getElementById('lang-btn');
        if (langBtn) {
            langBtn.addEventListener('click', () => {
                this.currentLanguage = this.currentLanguage === 'en' ? 'bn' : 'en';
                this.updateLanguage();
            });
        }
    }

    updateLanguage() {
        const langBtn = document.getElementById('lang-btn');
        const langText = langBtn?.querySelector('.lang-text');
        
        if (langText) {
            langText.textContent = this.currentLanguage === 'en' ? 'বাং' : 'ENG';
        }
        
        if (langBtn) {
            langBtn.setAttribute('data-lang', this.currentLanguage);
        }

        // Update all translatable elements
        document.querySelectorAll('[data-en]').forEach(element => {
            const text = element.getAttribute(`data-${this.currentLanguage}`);
            if (text) {
                if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'email')) {
                    if (element.hasAttribute('placeholder')) {
                        element.placeholder = text;
                    }
                } else if (element.tagName === 'OPTION') {
                    element.textContent = text;
                } else if (element.tagName !== 'INPUT' && element.tagName !== 'TEXTAREA') {
                    element.textContent = text;
                }
            }
        });

        this.updateUserGreeting();
        this.updateNavigationLabels();
    }

    updateUserGreeting() {
        const greeting = document.getElementById('user-greeting');
        if (greeting && this.currentUser) {
            const welcomeText = this.currentLanguage === 'en' ? 'Welcome' : 'স্বাগতম';
            greeting.textContent = `${welcomeText}, ${this.currentUser.name}!`;
        }
    }

    updateNavigationLabels() {
        const submitNavItem = document.querySelector('[data-tab="submit"] .nav-label');
        if (submitNavItem && this.currentUser) {
            if (this.currentUser.user_type === 'collector') {
                submitNavItem.textContent = this.currentLanguage === 'en' ? 'Requests' : 'অনুরোধ';
            } else {
                submitNavItem.textContent = this.currentLanguage === 'en' ? 'Submit' : 'জমা দিন';
            }
        }
    }

    // Event Listeners
    initEventListeners() {
        const showSignupBtn = document.getElementById('show-signup');
        const showLoginBtn = document.getElementById('show-login');
        
        if (showSignupBtn) {
            showSignupBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSignupPage();
            });
        }
        
        if (showLoginBtn) {
            showLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginPage();
            });
        }

        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin(e);
            });
        }
        
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignup(e);
            });
        }

        // Bottom navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const tab = item.dataset.tab;
                this.switchTab(tab);
            });
        });

        this.attachProfileListeners();
        this.attachActionListeners();
        this.attachModalListeners();
        this.attachWasteSubmissionListeners();
    }

    attachProfileListeners() {
        const headerProfileBtn = document.getElementById('header-profile-btn');
        const editProfileBtn = document.getElementById('edit-profile-btn');
        const cancelEditBtn = document.getElementById('cancel-edit-btn');
        const saveProfileBtn = document.getElementById('save-profile-btn');
        const logoutBtn = document.getElementById('logout-btn');

        if (headerProfileBtn) {
            headerProfileBtn.addEventListener('click', () => {
                this.switchTab('profile');
            });
        }

        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => {
                this.toggleProfileEdit(true);
            });
        }

        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => {
                this.toggleProfileEdit(false);
            });
        }

        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', () => {
                this.saveProfile();
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        const changeAvatarBtn = document.getElementById('change-avatar-btn');
        const avatarUpload = document.getElementById('avatar-upload');
        
        if (changeAvatarBtn) {
            changeAvatarBtn.addEventListener('click', () => {
                avatarUpload?.click();
            });
        }
        
        if (avatarUpload) {
            avatarUpload.addEventListener('change', (e) => {
                this.handleAvatarUpload(e);
            });
        }
    }

    attachActionListeners() {
        const callBtn = document.getElementById('call-vangariwala');
        const scheduleBtn = document.getElementById('schedule-pickup');
        
        if (callBtn) {
            callBtn.addEventListener('click', () => {
                this.showCallModal();
            });
        }
        
        if (scheduleBtn) {
            scheduleBtn.addEventListener('click', () => {
                this.showScheduleModal();
            });
        }

        const scheduleForm = document.getElementById('schedule-form');
        if (scheduleForm) {
            scheduleForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSchedulePickup(e);
            });
        }
    }

    attachModalListeners() {
        document.querySelectorAll('.modal-close, .modal-overlay').forEach(element => {
            element.addEventListener('click', (e) => {
                if (e.target === element) {
                    this.closeAllModals();
                }
            });
        });
    }

    attachWasteSubmissionListeners() {
        const wasteForm = document.getElementById('waste-submission-form');
        if (wasteForm) {
            wasteForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleWasteSubmission(e);
            });
        }

        // Real-time calculation
        document.querySelectorAll('.waste-type-card input').forEach(input => {
            input.addEventListener('input', () => {
                this.calculateWasteTotals();
            });
        });
    }

    // Tab Navigation
    switchTab(tabName) {
        this.activeTab = tabName;

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.tab === tabName);
        });

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });

        this.loadTabContent(tabName);
    }

    loadTabContent(tabName) {
        switch (tabName) {
            case 'dashboard':
                this.loadDashboardContent();
                break;
            case 'submit':
                this.loadSubmitContent();
                break;
            case 'history':
                this.loadHistoryContent();
                break;
            case 'notifications':
                this.loadNotificationsContent();
                break;
            case 'profile':
                this.loadProfileContent();
                break;
        }
    }

    loadDashboardContent() {
        if (this.currentUser?.user_type === 'collector') {
            document.getElementById('collector-dashboard').classList.remove('hidden');
            document.getElementById('household-dashboard').classList.add('hidden');
            this.loadCollectorDashboard();
        } else {
            document.getElementById('household-dashboard').classList.remove('hidden');
            document.getElementById('collector-dashboard').classList.add('hidden');
            this.loadHouseholdDashboard();
        }
    }

    loadHouseholdDashboard() {
        // Initialize the map after the dashboard is loaded
        setTimeout(() => {
            this.initHouseholdMap();
        }, 100);
    }

    loadCollectorDashboard() {
        // Collector dashboard logic
        const requestsContainer = document.getElementById('collector-requests');
        if (requestsContainer) {
            let requestsHtml = '';
            this.demoData.collector_requests.forEach(request => {
                requestsHtml += `
                    <div class="request-item">
                        <div class="request-header">
                            <span class="request-address">${request.address}</span>
                            <span class="status status--${request.status === 'available' ? 'success' : 'warning'}">${request.status}</span>
                        </div>
                        <div class="request-details">
                            <span class="waste-info">${request.weight}kg ${request.waste_type} • ${request.points} points</span>
                            <div class="request-actions">
                                <button class="btn btn--sm btn--primary">Accept</button>
                                <button class="btn btn--sm btn--secondary">View</button>
                            </div>
                        </div>
                    </div>
                `;
            });
            requestsContainer.innerHTML = requestsHtml;
        }
    }

    loadSubmitContent() {
        if (this.currentUser?.user_type === 'collector') {
            document.getElementById('requests-list').classList.remove('hidden');
            document.getElementById('submit-waste').classList.add('hidden');
            this.loadPickupRequests();
        } else {
            document.getElementById('submit-waste').classList.remove('hidden');
            document.getElementById('requests-list').classList.add('hidden');
        }
    }

    loadPickupRequests() {
        // Load pickup requests for collectors
        const requestsList = document.getElementById('requests-list');
        if (requestsList) {
            let requestsHtml = '<h2>Pickup Requests</h2><div class="requests-container">';
            this.demoData.collector_requests.forEach(request => {
                requestsHtml += `
                    <div class="request-item">
                        <div class="request-header">
                            <span class="request-address">${request.address}</span>
                            <span class="request-time">2 hours ago</span>
                        </div>
                        <div class="request-details">
                            <span class="waste-info">${request.weight}kg ${request.waste_type} waste</span>
                            <div class="request-actions">
                                <button class="btn btn--sm btn--primary">Accept</button>
                                <button class="btn btn--sm btn--secondary">View Details</button>
                            </div>
                        </div>
                    </div>
                `;
            });
            requestsHtml += '</div>';
            requestsList.innerHTML = requestsHtml;
        }
    }

    loadHistoryContent() {
        const historyContent = document.getElementById('history-content');
        if (!historyContent) return;

        let historyItems = '';
        if (this.currentUser?.user_type === 'collector') {
            historyItems = `
                <div class="history-item">
                    <div class="history-header">
                        <h4>Collected 5kg plastic waste • Earned ৳150</h4>
                        <span class="history-time">July 1, 2025 at 2:30 PM</span>
                    </div>
                </div>
                <div class="history-item">
                    <div class="history-header">
                        <h4>Collected 3kg paper waste • Earned ৳90</h4>
                        <span class="history-time">June 30, 2025 at 11:15 AM</span>
                    </div>
                </div>
                <div class="history-item">
                    <div class="history-header">
                        <h4>Collected 8kg organic waste • Earned ৳120</h4>
                        <span class="history-time">June 29, 2025 at 4:45 PM</span>
                    </div>
                </div>
            `;
        } else {
            this.demoData.household_submissions.forEach(item => {
                historyItems += `
                    <div class="history-item">
                        <div class="history-header">
                            <h4>Submitted ${item.type} waste</h4>
                            <span class="history-time">${new Date(item.date).toLocaleDateString()}</span>
                        </div>
                        <p>${item.weight}kg • ${item.points} points • ${item.co2_saved}kg CO2 saved</p>
                    </div>
                `;
            });
        }

        historyContent.innerHTML = historyItems;
    }

    loadNotificationsContent() {
        const notificationsContent = document.getElementById('notifications-content');
        if (!notificationsContent) return;

        let notificationsHtml = '';
        this.demoData.notifications.forEach(notification => {
            notificationsHtml += `
                <div class="notification-item ${notification.unread ? 'unread' : ''}">
                    <h4>${notification.title}</h4>
                    <p>${notification.message}</p>
                    <span class="notification-time">${notification.time}</span>
                </div>
            `;
        });

        notificationsContent.innerHTML = notificationsHtml;
    }

    loadProfileContent() {
        if (!this.currentUser) return;

        const profileAvatar = document.getElementById('profile-avatar');
        const profileName = document.getElementById('profile-name');
        const profileEmail = document.getElementById('profile-email');
        const profilePhone = document.getElementById('profile-phone');
        const profileAddress = document.getElementById('profile-address');
        const profileUserType = document.getElementById('profile-user-type');

        if (profileAvatar) profileAvatar.src = this.currentUser.avatar || 'https://via.placeholder.com/80';
        if (profileName) profileName.textContent = this.currentUser.name;
        if (profileEmail) profileEmail.textContent = this.currentUser.email;
        if (profilePhone) profilePhone.textContent = this.currentUser.phone;
        if (profileAddress) profileAddress.textContent = this.currentUser.address;
        if (profileUserType) profileUserType.textContent = this.currentUser.user_type === 'collector' ? 'Collector' : 'Household Owner';
    }

    // Authentication handlers
    showSignupPage() {
        document.getElementById('login-page').classList.add('hidden');
        document.getElementById('signup-page').classList.remove('hidden');
    }

    showLoginPage() {
        document.getElementById('signup-page').classList.add('hidden');
        document.getElementById('login-page').classList.remove('hidden');
    }

    handleLogin(event) {
        const formData = new FormData(event.target);
        const email = formData.get('email');
        const password = formData.get('password');

        // Demo login
        if (email === 'user@demo.com' && password === 'demo123') {
            this.currentUser = {
                name: 'Demo User',
                email: 'user@demo.com',
                phone: '+880123456789',
                address: 'Dhaka, Bangladesh',
                user_type: 'household',
                avatar: 'https://via.placeholder.com/80'
            };
            this.showMainApp();
        } else if (email === 'collector@demo.com' && password === 'demo123') {
            this.currentUser = {
                name: 'Demo Collector',
                email: 'collector@demo.com',
                phone: '+880987654321',
                address: 'Dhaka, Bangladesh',
                user_type: 'collector',
                avatar: 'https://via.placeholder.com/80'
            };
            this.showMainApp();
        } else {
            this.showToast('Invalid credentials', 'error');
        }
    }

    handleSignup(event) {
        const formData = new FormData(event.target);
        const name = formData.get('name');
        const email = formData.get('email');
        const phone = formData.get('phone');
        const address = formData.get('address');
        const userType = formData.get('user_type');

        // Demo signup
        this.currentUser = {
            name: name,
            email: email,
            phone: phone,
            address: address,
            user_type: userType,
            avatar: 'https://via.placeholder.com/80'
        };
        
        this.showMainApp();
        this.showToast('Account created successfully!', 'success');
    }

    showMainApp() {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        document.getElementById('language-toggle').classList.add('hidden');
        
        this.updateUserGreeting();
        this.loadDashboardContent();
        this.switchTab('dashboard');
    }

    handleWasteSubmission(event) {
        const formData = new FormData(event.target);
        let totalWeight = 0;
        let totalPoints = 0;
        let totalCO2 = 0;
        let totalBDT = 0;

        this.wasteTypes.forEach(wasteType => {
            const weight = parseFloat(formData.get(wasteType.type)) || 0;
            if (weight > 0) {
                totalWeight += weight;
                totalPoints += weight * wasteType.points_factor;
                totalCO2 += weight * wasteType.co2_factor;
                totalBDT += weight * wasteType.bdt_rate;
            }
        });

        if (totalWeight > 0) {
            this.showToast(`Submitted successfully! Earned ${totalPoints} points, saved ${totalCO2.toFixed(2)}kg CO2, and earned ${totalBDT.toFixed(0)} BDT`, 'success');
            event.target.reset();
            this.calculateWasteTotals();
        } else {
            this.showToast('Please enter waste amounts', 'error');
        }
    }

    showCallModal() {
        document.getElementById('call-modal').classList.remove('hidden');
    }

    showScheduleModal() {
        document.getElementById('schedule-modal').classList.remove('hidden');
    }

    handleSchedulePickup(event) {
        const formData = new FormData(event.target);
        const date = formData.get('pickup_date');
        const time = formData.get('pickup_time');
        const wasteType = formData.get('waste_type');
        const notes = formData.get('notes');

        this.showToast(`Pickup scheduled for ${date} at ${time}`, 'success');
        this.closeAllModals();
        event.target.reset();
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    }

    toggleProfileEdit(editing) {
        const profileView = document.getElementById('profile-view');
        const profileEdit = document.getElementById('profile-edit');
        
        if (editing) {
            profileView.classList.add('hidden');
            profileEdit.classList.remove('hidden');
        } else {
            profileView.classList.remove('hidden');
            profileEdit.classList.add('hidden');
        }
    }

    saveProfile() {
        const name = document.getElementById('edit-name').value;
        const phone = document.getElementById('edit-phone').value;
        const address = document.getElementById('edit-address').value;

        if (this.currentUser) {
            this.currentUser.name = name;
            this.currentUser.phone = phone;
            this.currentUser.address = address;
        }

        this.loadProfileContent();
        this.toggleProfileEdit(false);
        this.showToast('Profile updated successfully', 'success');
    }

    handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (this.currentUser) {
                    this.currentUser.avatar = e.target.result;
                }
                this.loadProfileContent();
                this.showToast('Avatar updated successfully', 'success');
            };
            reader.readAsDataURL(file);
        }
    }

    logout() {
        this.currentUser = null;
        this.closeAllModals();
        document.getElementById('main-app').classList.add('hidden');
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('language-toggle').classList.remove('hidden');
        this.showToast('Logged out successfully', 'success');
    }

    checkExistingSession() {
        // Check for existing session
        const savedUser = localStorage.getItem('vangariwala_user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.showMainApp();
        }
    }

    createDemoData() {
        // Create demo data for testing
        localStorage.setItem('vangariwala_demo_data', JSON.stringify(this.demoData));
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container') || this.createToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }
}

// Initialize the app
window.addEventListener('DOMContentLoaded', () => {
    new VangariwalApp();
});
