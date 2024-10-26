document.addEventListener('DOMContentLoaded', function() {
    const mainContent = document.querySelector('.screen');
    let loginScreen,
        loggedInScreen,
        loginBtn,
        usernameInput,
        passwordInput,
        errorMessage,
        registerLink,
        openAppBtn,
        logoutBtn,
        userName;

    const keyboard = document.getElementById('keyboard');
    const screenMessage = document.getElementById('screen-message');

    function clearKeyboardMessage() {
        keyboard.textContent = '';
    }

    function showMessage(message, isError = false) {
        keyboard.textContent = isError ? `Error: ${message}` : message;
        screenMessage.textContent = isError ? "Oops! Something went wrong. Let's try again!" : "Great job! Keep going!";
    }

    function handleLogin() {
        const username = usernameInput.value;
        const password = passwordInput.value;

        fetch('http://localhost:3000/api/user/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Incorrect username or password');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.token) {
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('username', username);
                showLoggedInScreen(username);
                showMessage('Login successful!');
            } else {
                showMessage('Login failed: ' + data.message, true);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showMessage(error.message, true);
        });
    }

    function handleOpenApp() {
        chrome.tabs.create({ url: 'http://localhost:3000/static.html' });
    }

    function handleLogout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
        clearKeyboardMessage();
        showLoginPage();
    }

    function showRegisterPage() {
        clearKeyboardMessage();
        mainContent.innerHTML = `
            <div id="register-screen">
                <h2>Registration</h2>
                <input type="text" id="register-username" placeholder="Username">
                <input type="password" id="register-password" placeholder="Password">
                <button id="register-btn">Register</button>
                <button id="back-btn">Back to Login</button>
                <p id="screen-message" class="message">Remember your username and password! They cannot be retrieved or changed once created.</p>
            </div>
        `;

        const registerBtn = document.getElementById('register-btn');
        const backBtn = document.getElementById('back-btn');
        const registerUsernameInput = document.getElementById('register-username');
        const registerPasswordInput = document.getElementById('register-password');
        const screenMessage = document.getElementById('screen-message');

        registerBtn.addEventListener('click', handleRegister);
        backBtn.addEventListener('click', showLoginPage);

        keyboard.textContent = "Ready to sign up!";

        function handleRegister() {
            const username = registerUsernameInput.value;
            const password = registerPasswordInput.value;

            if (!username || !password) {
                keyboard.textContent = "Error: Please enter both username and password.";
                return;
            }

            fetch('http://localhost:3000/api/user/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw err; });
                }
                return response.json();
            })
            .then(data => {
                if (data.user) {
                    screenMessage.textContent = `Registration successful! Welcome, ${data.user.username}. Yay! You're all signed up. Please remember your username and password!`;
                    keyboard.textContent = "Registration complete!";
                } else {
                    throw new Error(data.message || 'Unknown error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                screenMessage.textContent = error.message || 'Unknown error';
                keyboard.textContent = "Registration failed. Please try again.";
            });
        }
    }

    function showLoginPage() {
        clearKeyboardMessage();
        mainContent.innerHTML = `
            <div id="login-screen" class="active">
                <h2>DeskStation Login</h2>
                <input type="text" id="username" placeholder="Username">
                <input type="password" id="password" placeholder="Password">
                <button id="login-btn">Login</button>
                <a href="#" id="register-link">Register</a>
                <p id="error-message" class="error"></p>
            </div>
        `;

        loginScreen = document.getElementById('login-screen');
        loginBtn = document.getElementById('login-btn');
        usernameInput = document.getElementById('username');
        passwordInput = document.getElementById('password');
        errorMessage = document.getElementById('error-message');
        registerLink = document.getElementById('register-link');

        loginBtn.addEventListener('click', handleLogin);
        registerLink.addEventListener('click', showRegisterPage);
    }

    function showLoggedInScreen(username) {
        clearKeyboardMessage();
        mainContent.innerHTML = `
            <div id="logged-in-screen" class="active">
                <h2>Welcome, <span id="user-name"></span>!</h2>
                <button id="open-app-btn">Open DeskStation</button>
                <button id="logout-btn">Logout</button>
            </div>
        `;

        loggedInScreen = document.getElementById('logged-in-screen');
        userName = document.getElementById('user-name');
        openAppBtn = document.getElementById('open-app-btn');
        logoutBtn = document.getElementById('logout-btn');

        userName.textContent = username;
        openAppBtn.addEventListener('click', handleOpenApp);
        logoutBtn.addEventListener('click', handleLogout);

        loginScreen.classList.remove('active');
        loginScreen.classList.add('hidden');
        loggedInScreen.classList.remove('hidden');
        loggedInScreen.classList.add('active');
    }

    const authToken = localStorage.getItem('authToken');
    const savedUsername = localStorage.getItem('username');
    if (authToken && savedUsername) {
        showLoggedInScreen(savedUsername);
    } else {
        showLoginPage();
    }
});
