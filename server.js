const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require("./serviceaccount.json");
const EventEmitter = require("events");

//This file is the main file for the web app server, this links all of the microservices together and initalises firebase.

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = getFirestore("nbmcastdistributedprogramming");

class AppEmitter extends EventEmitter {}
const appEmitter = new AppEmitter();

module.exports = { db, appEmitter };