const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const request = require("request");
const jwt = require("jsonwebtoken");

const app = express();
const port = 3000;

app.use(cors());

// Configuring body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var zoom_key = 'srBZmaYpR_-IrQ153krk6Q';
var zoom_sec = '1H3hC1vzEeFkOJrPsbZBikeXLxjDroGMi2eO';

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

const sendInvitation = (zoomResponse) => {
    // Load client secrets from a local file.
    fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Google Calendar API.
        // authorize(JSON.parse(content), listEvents);
        authorize(JSON.parse(content), zoomResponse, createEvent);
    });
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 * @param {Object} zoomResponse Zoom response data
 */
function authorize(credentials, zoomResponse, callback) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getAccessToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client, zoomResponse);
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

app.post('/schedule-meeting', (req, res) => {
    // Creating Zoom Link
    const config = {
        email: "porwalarjun95@gmail.com" // API_KEY and API_SECRET are of this email. 
    };

    try {
        const payload = {
            iss: zoom_key,
            exp: ((new Date()).getTime() + 5000)
        };
        const token = jwt.sign(payload, zoom_sec);

        var options = {
            method: "POST",
            uri: `https://api.zoom.us/v2/users/${config.email}/meetings`,
            body: {
                topic: "Calendar Invitation",
                type: 1,
                settings: {
                    host_video: "true",
                    participant_video: "true"
                }
            },
            auth: {
                bearer: token
            },
            headers: {
                "User-Agent": "Zoom-api-Jwt-Request",
                "content-type": "application/json"
            },
            json: true //Parse the JSON string in the response
        };

        request(options, (error, response, body) => {
            if (!error && response.statusCode === 201) {
                // Triggering this function will allow to send Invitation
                sendInvitation(response)
                res.json({ msg: 'Success', response });

            } else {
                console.log(body);
                res.send({ message: body.message });
            }
        });
    } catch (e) {
        res.status(500).send(e.toString());
    }
})


function createEvent(auth, zoomResponse) {


    // return

    const calendar = google.calendar({ version: 'v3', auth });
    var event = {
        'summary': 'Calendar Invitation',
        'location': '3rd Floor, Ackruti Softech Park, M.I.D.C, Andheri E, Mumbai, Maharashtra 400093',
        'description': `<h3>Here is the link of zoom meeting. ${zoomResponse.body.join_url}</h3>`,

        // 30 Minutes duration (as of now)
        'start': {
            'dateTime': new Date('May 17 2022 13:22:00 GMT+0530 (India Standard Time)').toISOString(),
            'timeZone': 'Asia/Kolkata',
        },
        'end': {
            'dateTime': new Date('May 17 2022 13:45:00 GMT+0530 (India Standard Time)').toISOString(),
            'timeZone': 'Asia/Kolkata',
        },
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
    };

    calendar.events.insert({
        auth: auth,
        calendarId: 'primary',
        sendUpdates: 'all',
        sendNotifications: true,
        resource: event,
    }, function (err, event) {
        if (err) {
            console.log('There was an error contacting the Calendar service: ' + err);
            return;
        }
        console.log('Event created');
    });
}

// Run Server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})

