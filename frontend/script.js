// Header scroll effect
const header = document.getElementById('main-header');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// Navigation buttons
const contactBtn = document.getElementById('contactBtn');
const termsBtn = document.getElementById('termsBtn');
const homeBtn = document.getElementById('homeBtn');
const adminBtn = document.getElementById('adminBtn');

if (contactBtn) {
    contactBtn.onclick = () => window.location.href = 'contact.html';
}

if (termsBtn) {
    termsBtn.onclick = () => window.location.href = 'terms.html';
}

if (homeBtn) {
    homeBtn.onclick = () => window.location.href = 'index.html';
}

if (adminBtn) {
    adminBtn.onclick = () => window.location.href = 'admin-login.html';
}

// Slider functionality
const slider = document.querySelector('.slider');
if (slider) {
    const slides = document.querySelectorAll('.slide');
    const switches = document.querySelectorAll('.switch');

    switches.forEach(switchBtn => {
        switchBtn.addEventListener('click', () => {
            const target = switchBtn.dataset.target;
            slides.forEach(slide => slide.classList.remove('active'));
            if (target === 'register') {
                slider.style.transform = 'translateX(-100%)';
            } else {
                slider.style.transform = 'translateX(0)';
            }
            document.querySelector(`.${target}-slide`).classList.add('active');
        });
    });

    // Form submission handling
    document.querySelectorAll('form').forEach(form => {
        form.onsubmit = async function(e) {
            e.preventDefault();
            const button = this.querySelector('.btn');
            button.textContent = 'Processing...';
            const message = this.nextElementSibling;

            try {
                let response;

                if (form.id === 'loginForm') {
                    const email = form.querySelector('input[type="email"]').value;
                    const password = form.querySelector('input[type="password"]').value;

                    console.log('Logging in:', { email, password });
                    response = await fetch('http://localhost:3000/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                } else if (form.id === 'registerForm') {
                    const fullName = form.querySelector('input[type="text"]').value;
                    const email = form.querySelector('input[type="email"]').value;
                    const phone = form.querySelector('input[type="tel"]').value; // Added phone
                    const password = form.querySelector('input[type="password"]').value;

                    console.log('Registering:', { fullName, email, phone, password });
                    response = await fetch('http://localhost:3000/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fullName, email, phone, password }) // Updated to include phone
                    });
                }

                // Handle case where fetch fails (e.g., network error)
                if (!response) {
                    throw new Error('Fetch failed: No response received from server');
                }

                const data = await response.json();
                console.log('Response:', data);

                if (!response.ok) {
                    throw new Error(data.message || `HTTP error! Status: ${response.status}`);
                }

                message.textContent = data.message;

                if (form.id === 'registerForm' && response.ok) {
                    message.classList.add('success');
                    message.classList.remove('error', 'registration-success');
                    setTimeout(() => {
                        slides.forEach(slide => slide.classList.remove('active'));
                        slider.style.transform = 'translateX(0)';
                        const loginSlide = document.querySelector('.login-slide');
                        loginSlide.classList.add('active');
                        const loginMessage = document.querySelector('#loginMessage');
                        loginMessage.textContent = 'Registration successful! Please log in.';
                        loginMessage.classList.add('success');
                        loginMessage.classList.remove('error', 'registration-success');
                    }, 1000);
                } else if (form.id === 'loginForm' && response.ok) {
                    message.classList.add('success');
                    message.classList.remove('error', 'registration-success');
                    const userName = data.message.split(', ')[1].replace('!', '');
                    const email = form.querySelector('input[type="email"]').value;
                    console.log('Redirecting with:', { userName, email });
                    if (!email) {
                        throw new Error('Email not captured from login form');
                    }
                    window.location.href = `welcome.html?name=${encodeURIComponent(userName)}&email=${encodeURIComponent(email)}`;
                }

            } catch (error) {
                console.error('Fetch error:', error);
                message.textContent = 'An error occurred: ' + error.message;
                message.classList.add('error');
                message.classList.remove('success', 'registration-success');
            } finally {
                button.textContent = form.id === 'loginForm' ? 'Sign In' : 'Sign Up';
            }
        };
    });
}

// Card click animation
document.querySelectorAll('.feature-card, .goal-card').forEach(card => {
    card.addEventListener('click', function() {
        this.style.transform = 'scale(1.05)';
        setTimeout(() => {
            this.style.transform = 'scale(1)';
        }, 200);
    });
});