import { google } from "googleapis";
import readline from "readline";
import dotenv from "dotenv";

dotenv.config();

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  "https://developers.google.com/oauthplayground" // Replace with your redirect URI if not using OAuth Playground
);

const SCOPES = ["https://www.googleapis.com/auth/gmail.modify"];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const url = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
});

console.log("Authorize this app by visiting this url:", url);
rl.question("Enter the code from that page here: ", (code) => {
  oauth2Client.getToken(code, (err, tokens) => {
    if (err) return console.error("Error retrieving access token", err);
    oauth2Client.setCredentials(tokens);
    console.log("Refresh Token:", tokens.refresh_token);
    console.log("Access Token:", tokens.access_token);
    rl.close();
  });
});
