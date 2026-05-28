//All manual code for frontend interactions with the API Gateway

async function authenticateUser() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const loginResponse = await fetch('http://localhost:3000/api/account/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const loginData = await loginResponse.json();

        if (loginData.message === 'Login successful') {
            const profileResponse = await fetch(`http://localhost:3000/api/account/${email}`, {
                headers: { 'Authorization': `Bearer ${loginData.token}` }
            });
            const user = await profileResponse.json();

            populateUI(user);
            fetchNotifications(email);
            fetchLocations(email);
            document.getElementById('screen-login').classList.remove('is-active');
            document.getElementById('screen-app').classList.add('is-active');
        } else {
            document.getElementById('login-error').style.display = 'block';
        }

    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while authenticating');
    }
}

async function CreateAccount() {
    const username = document.getElementById('reg-username').value;
    const name = document.getElementById('reg-name').value;
    const surname = document.getElementById('reg-surname').value;
    const email = document.getElementById('reg-email').value;
    const age = document.getElementById('reg-age').value;
    const password = document.getElementById('reg-password').value;

    // Hide both banners before each attempt
    document.getElementById('reg-success').style.display = 'none';
    document.getElementById('reg-failure').style.display = 'none';

    try {
        const response = await fetch('http://localhost:3000/api/account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, name, surname, email, age, password })
        });
        const data = await response.json();

        if (data.message === 'Account created') {
            document.getElementById('reg-success').style.display = 'block';
            document.getElementById('btn-register').disabled = true;
            document.getElementById('btn-register').style.opacity = '.6';

            setTimeout(() => {
                document.getElementById('reg-success').style.display = 'none';
                document.getElementById('btn-register').disabled = false;
                document.getElementById('btn-register').style.opacity = '';
                ['reg-username', 'reg-name', 'reg-surname', 'reg-email', 'reg-age', 'reg-password', 'reg-confirm'].forEach(id => {
                    document.getElementById(id).value = '';
                });
                document.getElementById('reg-strength-bar').style.width = '0%';
                document.getElementById('reg-strength-label').textContent = '-';
                showScreen('screen-login');
            }, 3000);

        } else {
            document.getElementById('reg-failure').style.display = 'block';
        }

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('reg-failure').style.display = 'block';
    }
}

async function fetchLocations(email) {
    try {
        const response = await fetch(`http://localhost:3000/api/location/${email}`);
        const locations = await response.json();

        for (const location of locations) {
            const item = document.createElement('div');
            item.className = 'location-card';
            item.innerHTML = `
                 <div class="location-address">${location.houseNum}, ${location.street}</div>
                    <div class="location-country">${location.city}, ${location.country}</div>
                    <div class="location-actions">
                        <button class="button is-outline-gold is-small btn-edit-loc">
                            <span class="icon"><i class="fas fa-pen"></i></span>
                            <span>Edit</span>
                        </button>
                        <button class="button is-ghost-danger is-small btn-delete-loc">
                            <span class="icon"><i class="fas fa-trash"></i></span>
                            <span>Delete</span>
                        </button>
                    </div>
            `;
            document.getElementById('locations-grid').appendChild(item);
        }

        const locationSize = locations.length;
        document.getElementById('spots-stat-value').textContent = locationSize;
    }
    catch (err) {
        console.error('Error fetching notifications:', err);
    }
}

async function fetchNotifications(email) {
    try {
        const response = await fetch(`http://localhost:3000/api/notification/${email}`);
        const notifications = await response.json();

        for (const notification of notifications) {
            const timeString = converttoTimeString(notification.createdAt._seconds);

            const iconMap = {
                cabReady: 'fas fa-car',
                discount: 'fas fa-tag',
                Short: 'fas fa-bell',
            };
            const icon = iconMap[notification.type] || 'fas fa-bell';

            const item = document.createElement('div');
            item.className = 'notif-dd-item';
            item.innerHTML = `
                <div class="notif-dd-icon"><i class="${icon}"></i></div>
                <div class="notif-dd-text">
                    <div class="title">${notification.header}</div>
                    <div class="msg">${notification.message}</div>
                    <div class="time">${timeString}</div>
                </div>
            `;

            const fullItem = document.createElement('div');
            fullItem.className = 'notif-item';
            fullItem.innerHTML = `
                <div class="notif-icon"><i class="${icon}"></i></div>
                    <div class="notif-body">
                        <div class="notif-title">${notification.header}</div>
                        <div class="notif-msg">${notification.message}</div>
                        <div class="notif-time"><i class="fas fa-clock" style="font-size:.65rem"></i> ${timeString}</div>
                    </div>
                    <div class="notif-dot"></div>
            `;

            document.getElementById('notif-dropdown-list').appendChild(item);
            document.getElementById('notif-list').appendChild(fullItem);
        }
    }
    catch (err) {
        console.error('Error fetching notifications:', err);
    }

}

function converttoTimeString(timeInSeconds) {
    debugger
    const date = new Date(timeInSeconds * 1000);
    const timeString = date.toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
    return timeString;
}