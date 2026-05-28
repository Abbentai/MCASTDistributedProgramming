//All manual code for frontend interactions with the API Gateway
//Gateway URL depending on development or production environment
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3000': 'https://api-gateway-63oa.onrender.com/';

// -------- Account Section -------
async function authenticateUser() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const loginResponse = await fetch(`${API_BASE_URL}/api/account/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const loginData = await loginResponse.json();

        if (loginData.message === 'Login successful') {
            const profileResponse = await fetch(`${API_BASE_URL}/api/account/${email}`, {
                headers: { 'Authorization': `Bearer ${loginData.token}` }
            });
            const user = await profileResponse.json();

            populateUI(user);
            fetchNotifications(email);
            fetchLocations(email);
            fetchBookings(email, 'past');
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
        const response = await fetch(`${API_BASE_URL}/api/account`, {
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

// -------- Location Section -------
async function fetchLocations(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/location/${email}`);
        const locations = await response.json();

        document.getElementById('locations-grid').innerHTML = '';

        locations.forEach(location => {
            const card = buildLocationCard(location);
            document.getElementById('locations-grid').appendChild(card);
            attachLocationEvents(card);
        });

        const locationSize = locations.length;
        document.getElementById('spots-stat-value').textContent = locationSize;
    }
    catch (err) {
        console.error('Error fetching notifications:', err);
    }
}

async function addLocation() {
    const locationName = document.getElementById('new-loc-name').value.trim();
    const houseNum = document.getElementById('new-loc-house-num').value.trim();
    const street = document.getElementById('new-loc-street').value.trim();
    const city = document.getElementById('new-loc-city').value.trim();
    const country = document.getElementById('new-loc-country').value.trim();
    const email = document.getElementById('new-loc-email').value;

    try {
        const response = await fetch(`${API_BASE_URL}/api/location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ locationName, houseNum, street, city, country, email })
        });
        const data = await response.json();

        if (!response.ok) {
            alert('Failed to save location. Please try again.');
            return;
        }

        await fetchLocations(email);

        //Reset form and clear errors
        ['new-loc-name', 'new-loc-house-num', 'new-loc-street', 'new-loc-city', 'new-loc-country'].forEach(id => {
            document.getElementById(id).value = '';
            document.getElementById(id).style.borderColor = '';
        });

        ['new-loc-name-err', 'new-loc-house-num-err', 'new-loc-street-err', 'new-loc-city-err', 'new-loc-country-err'].forEach(id => {
            document.getElementById(id).style.display = 'none';
        });

    } catch (err) {
        console.error('Error adding location:', err);
        alert('An error occurred while saving the location.');
    }
}

async function editLocation(locationId, locationName, houseNum, street, city, country, email) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/location/${locationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ locationName, houseNum, street, city, country, email })
        });
        if (!response.ok) {
            alert('Failed to update location. Please try again.');
        }
    } catch (err) {
        console.error('Error editing location:', err);
        alert('An error occurred while updating the location.');
    }
}

async function deleteLocation(locationId, email) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/location/${locationId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        if (!response.ok) {
            alert('Failed to delete location. Please try again.');
        }
    } catch (err) {
        console.error('Error deleting location:', err);
        alert('An error occurred while deleting the location.');
    }
}

async function fetchWeatherDetails(city) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/location/weather/${city}`);
        if (!response.ok) {
            throw new Error('Weather statistics unreachable');
        }
        return await response.json();
    } catch (err) {
        console.error('Error fetching weather mapping data:', err);
        return null;
    }
}

function buildLocationCard(location) {
    const card = document.createElement('div');
    card.className = 'location-card';

    // Store everything needed by attachLocationEvents as data attributes
    card.dataset.locationId = location.id || location.locationId || '';
    card.dataset.name = location.locationName || '';
    card.dataset.house = location.houseNum || '';
    card.dataset.street = location.street || '';
    card.dataset.city = location.city || '';
    card.dataset.country = location.country || '';

    card.innerHTML = `
        <div class="location-name">${location.locationName || ''}</div>
        <div class="location-address">${location.houseNum}, ${location.street}</div>
        <div class="location-country">${location.city}, ${location.country}</div>
        <div class="location-actions" style="gap: 0.35rem;">
            <button class="button is-outline-gold is-small btn-weather-loc">
                <span class="icon"><i class="fas fa-cloud-sun"></i></span>
                <span>Weather</span>
            </button>
            <button class="button is-outline-gold is-small btn-edit-loc">
                <span class="icon"><i class="fas fa-pen"></i></span>
                <span>Edit</span>
            </button>
            <button class="button is-ghost-danger is-small btn-delete-loc" >
                <span class="icon"><i class="fas fa-trash"></i></span>
                <span>Delete</span>
            </button>
        </div>
    `;
    return card;
}
//onclick="deleteLocation('${location.id || location.locationId}')"

// -------- Notification Section -------
async function fetchNotifications(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/notification/${email}`);
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
    const date = new Date(timeInSeconds * 1000);
    const timeString = date.toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
    return timeString;
}

// -------- Booking Section -------
async function fetchBookings(email, status = 'past') {
    try {
        const response = await fetch(`${API_BASE_URL}/api/booking/getAllBookings/${email}/${status}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch bookings: ${response.statusText}`);
        }

        const bookings = await response.json();
        const tbody = document.querySelector('.rx-card table tbody');

        if (!tbody) return;

        //Clearing all existing rows
        tbody.innerHTML = '';

        if (bookings.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--muted); padding: 1.5rem;">
                        No ${status} bookings found.
                    </td>
                </tr>`;
            return;
        }

        // Loop through collections and build table rows dynamically
        bookings.forEach(booking => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid rgba(255,255,255,.04)';

            // Format Timestamp safely (handles seconds integers or raw date strings)
            let formattedDate = booking.date || '—';
            if (booking.createdAt && booking.createdAt._seconds) {
                formattedDate = converttoTimeString(booking.createdAt._seconds);
            }

            // Capitalize status for clean UI pill presentation
            const capStatus = status.charAt(0).toUpperCase() + status.slice(1);
            const statusColor = status === 'upcoming' ? 'var(--gold)' : 'var(--success)';

            row.innerHTML = `
                <td style="border:none; padding:.7rem .75rem; font-family:monospace; font-size:.82rem; color:var(--gold)">
                    #${booking.id || booking.bookingId || 'N/A'}
                </td>
                <td style="border:none; padding:.7rem .75rem; color:var(--muted); font-size:.85rem">
                    ${formattedDate}
                </td>
                <td style="border:none; padding:.7rem .75rem; font-size:.85rem">
                    ${booking.startLocation || '—'} → ${booking.endLocation || '—'}
                </td>
                <td style="border:none; padding:.7rem .75rem">
                    <span class="tag-gold">${booking.cabType || booking.cab || 'Economic'}</span>
                </td>
                <td style="border:none; padding:.7rem .75rem; font-weight:600">
                    €${parseFloat(booking.amount || booking.totalPrice || 0).toFixed(2)}
                </td>
                <td style="border:none; padding:.7rem .75rem">
                    <span style="color:${statusColor}; font-size:.8rem">
                        <i class="fas fa-circle" style="font-size:.5rem; vertical-align:middle; margin-right: 0.25rem;"></i>
                        ${capStatus}
                    </span>
                </td>
            `;
            tbody.appendChild(row);
        });

        const ridesStat = document.getElementById('rides-stat-value');
        if (ridesStat) {
            ridesStat.textContent = bookings.length;
        }

    } catch (err) {
        console.error('Error fetching bookings:', err);
        const tbody = document.querySelector('.rx-card table tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--danger); padding: 1.5rem;">
                        <i class="fas fa-exclamation-triangle"></i> No bookings available.
                    </td>
                </tr>`;
        }
    }
} 

async function createBooking() {
    try{
        const email = document.getElementById('f-email').value.trim();
        const startLocation = document.getElementById('f-start').value.trim();
        const endLocation = document.getElementById('f-end').value.trim();
        const date = document.getElementById('f-date').value;
        const time = document.getElementById('f-time').value;
        const noOfPassengers = document.getElementById('f-passengers').value;
        const activeCabElement = document.querySelector('.cab-option.is-selected');
    const cabType = activeCabElement ? activeCabElement.dataset.cab : 'Economic';

        const response = await fetch(`${API_BASE_URL}/api/booking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, startLocation, endLocation, date, time, noOfPassengers, cabType })
        });
        const result = await response.json();
        console.log('Booking created:', result);
        return result.booking.bookingId;
    }
    catch(err){
        console.error('Error creating booking:', err);
    }
}

// ------- Price Breakdown Section -------
async function calculatePrice(bookingId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/payment/calculateprice/${bookingId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch price breakdown: ${response.statusText}`);
        }
        const priceBreakdown = await response.json();
        console.log('Price Breakdown:', priceBreakdown);
        return priceBreakdown.breakdown;
    } catch (err) {
        console.error('Error fetching price breakdown:', err);
        alert('An error occurred while fetching the price breakdown. Please try again later.');
    }
}