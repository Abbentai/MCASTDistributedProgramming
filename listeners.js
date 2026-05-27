const { db, appEmitter } = require('./server.js');


//Booking listeners
appEmitter.on('bookingCreated', async ({ email, bookingId }) => {
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
});

//Discount listener
appEmitter.on('discountAvailable', async ({ email }) => {
    try {
        const statsRef = db.collection('userStats').doc(email);

        //Making it so that no duplicate discounts are granted for the user
        await statsRef.set({ discountGranted: true }, { merge: true });

        //Store the notification so the client can surface it
        await db.collection('notifications').add({
            email,
            type: 'discount',
            message: 'You have earned a 10% discount on your next booking. Congrats!',
            createdAt: new Date(),
            read: false,
        });

        console.log(`Discount notification created for ${email}.`);

    } catch (err) {
        console.error('discountAvailable listener failed:', err.message);
    }
});


appEmitter.on('bookingDeleted', ({ bookingId, email }) => {
    console.log(`Booking deleted: ${bookingId} for ${email}`);
});