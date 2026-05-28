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
}