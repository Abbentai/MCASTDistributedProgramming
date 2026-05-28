/* ── registration validation & submit ── */
async function ValidateAndRegister() {
    let valid = true;

    const rules = [
        { id: 'reg-username', errId: 'reg-username-err', check: v => v.length > 0 },
        { id: 'reg-name', errId: 'reg-name-err', check: v => v.length > 0 },
        { id: 'reg-surname', errId: 'reg-surname-err', check: v => v.length > 0 },
        { id: 'reg-email', errId: 'reg-email-err', check: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) },
        { id: 'reg-age', errId: 'reg-age-err', check: v => parseInt(v) >= 18 && parseInt(v) <= 120 },
        { id: 'reg-password', errId: 'reg-password-err', check: v => v.length >= 8 },
    ];

    rules.forEach(r => {
        const val = $(r.id).value.trim();
        const ok = r.check(val);
        $(r.errId).style.display = ok ? 'none' : '';
        $(r.id).style.borderColor = ok ? '' : 'var(--danger)';
        if (!ok) valid = false;
    });

    // Confirm password check
    const pwMatch = $('reg-password').value === $('reg-confirm').value && $('reg-confirm').value.length > 0;
    $('reg-confirm-err').style.display = pwMatch ? 'none' : '';
    $('reg-confirm').style.borderColor = pwMatch ? '' : 'var(--danger)';
    if (!pwMatch) valid = false;

    if (!valid) return;

    await CreateAccount();
}

function validateLocation() {
    let valid = true;

    const rules = [
        { id: 'new-loc-name', errId: 'new-loc-name-err', check: v => v.length > 0 },
        { id: 'new-loc-house-num', errId: 'new-loc-house-num-err', check: v => v.length > 0 },
        { id: 'new-loc-street', errId: 'new-loc-street-err', check: v => v.length > 0 },
        { id: 'new-loc-city', errId: 'new-loc-city-err', check: v => v.length > 0 }, // <-- FIX: Added this row
        { id: 'new-loc-country', errId: 'new-loc-country-err', check: v => v.length > 0 },
    ];

    rules.forEach(r => {
        const val = document.getElementById(r.id).value.trim();
        const ok = r.check(val);
        document.getElementById(r.errId).style.display = ok ? 'none' : '';
        document.getElementById(r.id).style.borderColor = ok ? '' : 'var(--danger)';
        if (!ok) valid = false;
    });

    if (valid) {
        addLocation();
    }
}

function populateUI(user) {
    const firstName = user.name || user.username || 'User';
    const fullName = user.surname ? `${firstName} ${user.surname}` : firstName;
    const initial = firstName.charAt(0).toUpperCase();
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

    //Topbar
    document.getElementById('user-avatar-text').textContent = initial;
    document.getElementById('user-display-name').textContent = fullName;

    //Dashboard greeting
    const greetingEl = document.querySelector('#tab-dashboard .page-header h2');
    if (greetingEl) greetingEl.textContent = `Good ${greeting}, ${firstName}`;

    //Prefill email in booking form
    const bookingEmail = document.getElementById('f-email');
    if (bookingEmail) bookingEmail.value = user.email;

    //Prefill email in payment form
    const paymentEmail = document.querySelector('#tab-payment input[type="email"]');
    if (paymentEmail) paymentEmail.value = user.email;

    const locEmail = document.getElementById('new-loc-email');
    if (locEmail) locEmail.value = user.email;
}

function showDeleteModal(locationId) {
    const modal = document.getElementById('modal-delete-location');
    modal.classList.add('is-open');
}


async function attachLocationEvents(card) {
    
    card.querySelector('.btn-edit-loc').addEventListener('click', () => {
        // Populate and open ONLY the edit location modal
        document.getElementById('edit-loc-name').value = card.dataset.name || '';
        document.getElementById('edit-loc-house').value = card.dataset.house || '';
        document.getElementById('edit-loc-street').value = card.dataset.street || '';
        document.getElementById('edit-loc-city').value = card.dataset.city || '';
        document.getElementById('edit-loc-country').value = card.dataset.country || '';
        
        document.getElementById('modal-edit-location').classList.add('is-open');

        // Handle saving edited data
        document.getElementById('modal-edit-save').onclick = async () => {
            const updatedCity = document.getElementById('edit-loc-city').value;
            const updatedCountry = document.getElementById('edit-loc-country').value;

            await editLocation(
                card.dataset.locationId,
                document.getElementById('edit-loc-name').value,
                document.getElementById('edit-loc-house').value,
                document.getElementById('edit-loc-street').value,
                updatedCity,
                updatedCountry,
                document.getElementById('new-loc-email').value
            );

            // Update card elements visually
            card.querySelector('.location-address').textContent =
                `${document.getElementById('edit-loc-house').value}, ${document.getElementById('edit-loc-street').value}`;
            card.querySelector('.location-country').textContent = `${updatedCity}, ${updatedCountry}`;
            
            // Sync datasets
            card.dataset.name = document.getElementById('edit-loc-name').value;
            card.dataset.house = document.getElementById('edit-loc-house').value;
            card.dataset.street = document.getElementById('edit-loc-street').value;
            card.dataset.city = updatedCity;
            card.dataset.country = updatedCountry;

            document.getElementById('modal-edit-location').classList.remove('is-open');
            const email = document.getElementById('new-loc-email').value;
            fetchLocations(email); 
        };
    });


    card.querySelector('.btn-weather-loc').addEventListener('click', async () => {
        const city = card.dataset.city || '';
        
        // Setup titles and setup loading views for the weather modal
        document.getElementById('weather-modal-title').textContent = `Weather for ${card.dataset.name || city}`;
        document.getElementById('weather-loading').style.display = 'block';
        document.getElementById('weather-content').style.display = 'none';
        
        // Open ONLY the weather modal
        document.getElementById('modal-weather-location').classList.add('is-open');

        // Fetch API details using the extracted city
        const data = await fetchWeatherDetails(city);
        document.getElementById('weather-loading').style.display = 'none';

        if (data && data.weather) {
            const w = data.weather;
            const loc = data.location;

            document.getElementById('weather-condition').textContent = w.condition || 'Clear';
            document.getElementById('weather-temp').textContent = `${w.tempC}°C`;
            document.getElementById('weather-local-time').textContent = `Local time: ${loc.localtime || '—'}`;
            document.getElementById('weather-feels').textContent = `${w.feelsLikeC}°C`;
            document.getElementById('weather-humidity').textContent = `${w.humidity}%`;
            document.getElementById('weather-wind').textContent = `${w.windKph} km/h (${w.windDir || 'N/A'})`;
            document.getElementById('weather-uv').textContent = w.uvIndex || '—';

            document.getElementById('weather-content').style.display = 'block';
        } else {
            document.getElementById('weather-modal-title').textContent = 'Error';
            alert('Failed to accurately source dynamic atmospheric reading configurations at this timestamp.');
            document.getElementById('modal-weather-location').classList.remove('is-open');
        }
    });


    card.querySelector('.btn-delete-loc').addEventListener('click', () => {
        document.getElementById('modal-delete-location').classList.add('is-open');

        document.getElementById('modal-delete-confirm').onclick = async () => {
            const locationId = card.dataset.locationId;
            const email = document.getElementById('new-loc-email').value;

            await deleteLocation(locationId, email);
            card.remove();

            const remaining = document.querySelectorAll('#locations-grid .location-card').length;
            document.getElementById('spots-stat-value').textContent = remaining;

            document.getElementById('modal-delete-location').classList.remove('is-open');
        };
    });
}