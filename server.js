const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

const sendInvitation = () => {
    // Load client secrets from a local file.
    fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Google Calendar API.
        // authorize(JSON.parse(content), listEvents);
        authorize(JSON.parse(content), createEvent);

    });
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getAccessToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error retrieving access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */

function createEvent(auth) {
    const calendar = google.calendar({ version: 'v3', auth });
    var event = {
        'summary': 'Calendar Invitation',
        'location': '3rd Floor, Ackruti Softech Park, M.I.D.C, Andheri E, Mumbai, Maharashtra 400093',
        'description': 'Generates a google meet link and send it to attendes automatically',

        // 30 Minutes duration (as of now)
        'start': {
            'dateTime': new Date('Mon May 16 2022 7:30:00 GMT+0530 (India Standard Time)').toISOString(),
            'timeZone': 'Asia/Kolkata',
        },
        'end': {
            'dateTime': new Date('Mon May 16 2022 8:00:00 GMT+0530 (India Standard Time)').toISOString(),
            'timeZone': 'Asia/Kolkata',
        },
        // 'recurrence': [
        //     'RRULE:FREQ=DAILY;COUNT=2'
        // ],
        'attendees': [
            { 'email': 'porwal.1@iitj.ac.in' },
            { 'email': 'porwalarjun95@gmail.com' },
        ],
        'reminders': {
            'useDefault': false,
            'overrides': [
                { 'method': 'email', 'minutes': 24 * 60 }, // 1 day from email
                { 'method': 'popup', 'minutes': 10 },   // 10 minutes from mobile notification
            ],
        },
        conferenceData: {
            createRequest: {
                requestId: "random_request_ID",
                conferenceSolutionKey: { type: "hangoutsMeet" },
            },
        },
    };

    calendar.events.insert({
        auth: auth,
        calendarId: 'primary',
        sendUpdates: 'all',
        sendNotifications: true,
        conferenceDataVersion: 1,
        resource: event,
    }, function (err, event) {
        if (err) {
            console.log('There was an error contacting the Calendar service: ' + err);
            return;
        }
        console.log('Event created: %s', event.data.htmlLink);
    });
}

// Triggering this function will allow to send Invitation
sendInvitation()