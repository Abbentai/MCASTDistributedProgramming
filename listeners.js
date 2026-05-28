const { db, appEmitter } = require('./server.js');

//3 minutes in milliseconds
const CAB_DELAY = 3 * 60 * 1000;

//api/booking listeners
appEmitter.on('bookingCreated', async ({ email, bookingId }) => {
    //Listener is triggered when a booking is created, updates the users current booking count, check if eligible for a discount
    //and starts a 3 minute timer to simulate the driver search process
    console.log(`[Log] Booking created: ${bookingId} for ${email}`);

    try {
        //Fetch or initialise the user's booking stats
        const statsRef = db.collection('userStats').doc(email);
        const statsDoc = await statsRef.get();

        let bookingCount = 1;
        let discountAlreadyGranted = false;

        if (statsDoc.exists) {
            const data = statsDoc.data();
            bookingCount = data.bookingCount + 1;
            discountAlreadyGranted = data.discountGranted || false;
        }

        //Persist the updated count
        await statsRef.set(
            { bookingCount, discountGranted: discountAlreadyGranted },
            { merge: true }
        );

        console.log(`${email} now has ${bookingCount} booking(s).`);

        //In the case that booking count is 3 and the discount hasn't been granted, emit the discountAvailable event
        if (bookingCount >= 3 && !discountAlreadyGranted) {
            appEmitter.emit('discountAvailable', { email });
        }

    } catch (err) {
        console.error('bookingCreated listener failed:', err.message);
    }

    setTimeout(async () => {
        try {
            const bookingDoc = await db.collection('bookings').doc(bookingId).get();

            if (!bookingDoc.exists) {
                console.warn(`Booking ${bookingId} no longer exists — skipping notification.`);
                return;
            }

            appEmitter.emit('cabReady', { email, booking: bookingDoc.data() });

        } catch (err) {
            console.error('[Error] cabReady timer callback failed:', err.message);
        }
    }, CAB_DELAY);

    console.log(`Driver search started for ${bookingId}. Notification scheduled in 3 minutes.`);

});

//Discount listener
appEmitter.on('discountAvailable', async ({ email }) => {
    //Listener is triggered when is eligible for a discount, it updates the userStats to reflect that the discount has been granted
    try {
        const statsRef = db.collection('userStats').doc(email);

        //Making it so that no duplicate discounts are granted for the user
        await statsRef.set({ discountGranted: true }, { merge: true });

        //Store the notification so the client can surface it
        await db.collection('accounts').doc(email).collection('notifications').add({
            type: 'discount',
            title: 'Discount Available!',
            message: 'Congratulations! You have earned a 10% discount on your next booking.',
            createdAt: new Date(),
            read: false,
        });

        console.log(`Discount notification created for ${email}.`);

    } catch (err) {
        console.error('discountAvailable listener failed:', err.message);
    }
});

//Cab ready listener
appEmitter.on('cabReady', async ({ email, booking }) => {
    //Listener is triggered when the cab is read, creating a notification for the user with cab and ride details
    try {
        await db.collection('accounts').doc(email).collection('notifications').add({
            email,
            type: 'cabReady',
            title: 'Your cab is ready!',
            message: `Your cab is on the way! A ${booking.cabType} cab has been assigned for your ride.`,
            rideDetails: {
                bookingId: booking.bookingId,
                startLocation: booking.startLocation,
                endLocation: booking.endLocation,
                date: booking.date,
                time: booking.time,
                noOfPassengers: booking.noOfPassengers,
                cabType: booking.cabType,
            },
            createdAt: new Date(),
        });

        console.log(`[CabReady] Notification published for ${email} — booking ${booking.bookingId}.`);

    } catch (err) {
        console.error('[Error] cabReady listener failed:', err.message);
    }
});


appEmitter.on('bookingDeleted', ({ bookingId, email }) => {
    console.log(`Booking deleted: ${bookingId} for ${email}`);
});