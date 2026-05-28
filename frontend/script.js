async function authenticateUser() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('http://localhost:3000/api/account/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.message === 'Login successful') {
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
        
