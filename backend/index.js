import express from 'express';
import bodyParser from 'body-parser';
import cors from "cors";
import fs from "fs/promises";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { randomID, getEpochUTC, sanitizeNickname } from "./helper.js";
import { addWeeklyLeaderboardEntry, getStatistics, getWeeklyLeaderboardTop10 } from './db.js';
import settings from "./config/settings.js";
import standardLocations from "./config/locations/standard.js";
import timeTravelLocations from "./config/locations/time_travel.js";
import weeklyLocations from "./config/locations/weekly.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Game data
let activeGames = {
    "standard": {},
    "time_travel": {},
    "weekly": {}
};

// All locations in one variable
const locations = {
    "standard": standardLocations,
    "time_travel": timeTravelLocations,
    "weekly": weeklyLocations
};

app.get("/test", (req, res) => {
    res.send("test");
});

app.post("/api/create_match", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    const json = req.body;
    const sanitizedNickname = sanitizeNickname(json.nickname);

    if (!Object.keys(activeGames).includes(json.game_mode)) {
        res.status(400).send("");
        return;
    }

    const sessionId = randomID(16);
    const gameData = {
        "end_time": getEpochUTC() + settings[json.game_mode].time * 1000,
        "nickname": sanitizedNickname,
        "round_iterator": 0,
        "total_rounds": settings[json.game_mode].rounds,
        "history": [],
        "score": 0,
        "round_started": false
    }
    activeGames[json.game_mode][sessionId] = gameData;

    res.end(JSON.stringify({
        "game_session_id": sessionId
    }));
});

app.post("/api/match_info", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    const json = req.body;
    const sessionId = json.game_session_id;
    const gameMode = json.game_mode;

    // Authentication
    if (
        (sessionId === undefined || gameMode === undefined) ||
        !Object.keys(activeGames).includes(gameMode) || 
        activeGames[gameMode][sessionId] === undefined
    ) {
        res.status(400).send("");
        return;
    }

    res.end(JSON.stringify({
        "game_data": activeGames[gameMode][sessionId]
    }));
});

app.post("/api/start_round", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    const json = req.body;
    const sessionId = json.game_session_id;
    const gameMode = json.game_mode;

    // Authentication
    if (
        (sessionId === undefined || gameMode === undefined) ||
        !Object.keys(activeGames).includes(gameMode) || 
        activeGames[gameMode][sessionId] === undefined ||
        activeGames[gameMode][sessionId].round_iterator == activeGames[gameMode][sessionId].total_rounds
    ) {
        res.status(400).send("");
        return;
    }

    if (!activeGames[gameMode][sessionId].round_started) {
        activeGames[gameMode][sessionId].round_started = true;

        // Reset timer
        activeGames[gameMode][sessionId].end_time = getEpochUTC() + settings[json.game_mode].time * 1000;
    }
    
    res.end(JSON.stringify({
        "game_data": activeGames[gameMode][sessionId]
    }));
});

app.post("/api/round_image", (req, res) => {
    res.setHeader("Content-Type", "image/webp");
    const json = req.body;
    const sessionId = json.game_session_id;
    const gameMode = json.game_mode;

    // Authentication
    if (
        sessionId === undefined ||
        gameMode === undefined ||
        !Object.keys(activeGames).includes(gameMode) || 
        activeGames[gameMode][sessionId] === undefined ||
        activeGames[gameMode][sessionId].round_iterator == activeGames[gameMode][sessionId].total_rounds
    ) {
        res.status(400).send("");
        return;
    }

    // Image caching
    const sendFile = (filePath) => res.sendFile(filePath, {
        cacheControl: true,
        maxAge: "7 days",
        immutable: true
    });

    // Check if image was already selected
    if (activeGames[gameMode][sessionId].history.length == activeGames[gameMode][sessionId].round_iterator + 1) {
        sendFile(`${__dirname}/images/${gameMode}/${activeGames[gameMode][sessionId].history.at(-1)}`);
        return;
    }

    // Select new random image
    let imageName = "";
    let imageNameFound = false;
    const images = Object.keys(locations[gameMode]);
    while (!imageNameFound) {
        imageName = images[Math.floor(Math.random() *  images.length)];
        if (!activeGames[gameMode][sessionId].history.includes(imageName)) {
            imageNameFound = true;
            activeGames[gameMode][sessionId].history.push(imageName);
        }
    }
    sendFile(`${__dirname}/images/${gameMode}/${imageName}`);
});

// Single round submission
app.post("/api/submit_round", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    const json = req.body;
    const sessionId = json.game_session_id;
    const gameMode = json.game_mode;

    // Authentication
    if (
        sessionId === undefined ||
        gameMode === undefined ||
        !Object.keys(activeGames).includes(gameMode) || 
        activeGames[gameMode][sessionId] === undefined ||
        activeGames[gameMode][sessionId].round_iterator == activeGames[gameMode][sessionId].total_rounds
    ) {
        res.status(400).send("");
        return;
    }

    // Timeout but allow extra time for submission
    if (activeGames[gameMode][sessionId].end_time + settings.general.time_to_submit <= getEpochUTC()) {
        delete activeGames[gameMode][sessionId];
        res.status(403).send("");
        return;
    }

    // Calculating score:
    // If place is correct, `place_score` points are added
    // Except when it involves the two floors in main building, then distance score counts (but perhaps not place score)
    // Then, any distance to the correct point is added based on `distance_score`
    let score = 0;
    const imageName = activeGames[gameMode][sessionId].history.at(-1);
    const locationGuess = json.location;
    const locationAnswer = locations[gameMode][imageName].location;

    const placeScore = locationGuess.place === locationAnswer.place ? settings[gameMode].place_score : 0;
    score += placeScore;

    let distance = Math.sqrt((locationGuess.x - locationAnswer.x) * (locationGuess.x - locationAnswer.x) + (locationGuess.y - locationAnswer.y) * (locationGuess.y - locationAnswer.y));
    distance = distance < 1.0 ? 0 : distance; // Round distance if very close so player can get perfect score
    const isDistanceCounted = placeScore > 1 || (locationGuess.place === 0 && locationAnswer.place === 1) || (locationGuess.place === 1 && locationAnswer.place === 0);
    const distanceScore = isDistanceCounted ? settings[gameMode].distance_score * Math.max(0, (settings.general.max_distance - distance) / settings.general.max_distance) : 0;
    score += distanceScore;

    let yearAnswer = 0;
    let timeScore = 0;
    if (gameMode == "time_travel") {
        yearAnswer = locations[gameMode][imageName].date.year;
        timeScore = Math.max(1.0 - (Math.abs(json.year - yearAnswer) / settings.general.max_time_radius), 0) * settings.time_travel.time_score;
        score += timeScore;
    }

    score = Math.floor(score);

    activeGames[gameMode][sessionId].score += score;
    activeGames[gameMode][sessionId].round_iterator++;
    activeGames[gameMode][sessionId].round_started = false;

    // Sending back round info
    res.end(JSON.stringify({
        "round_score": score,
        "answer_location": locationAnswer,
        "answer_place": "main",
        "answer_year": yearAnswer,
        "game_data": activeGames[gameMode][sessionId]
    }));
});

// Final, total score submission
app.post("/api/submit_match", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    const json = req.body;
    const sessionId = json.game_session_id;
    const gameMode = json.game_mode;

    // Authentication
    if (
        sessionId === undefined ||
        gameMode === undefined ||
        !Object.keys(activeGames).includes(gameMode) || 
        activeGames[gameMode][sessionId] === undefined ||
        activeGames[gameMode][sessionId].round_iterator < activeGames[gameMode][sessionId].total_rounds - 1
    ) {
        res.status(400).send("");
        return;
    }

    // Adding to leaderboard
    const gameData = activeGames[gameMode][sessionId];
    addWeeklyLeaderboardEntry(gameMode, gameData.nickname, gameData.score);

    // Sending back match info
    res.end(JSON.stringify({
        "game_data": gameData
    }));

    // Remove match
    delete activeGames[gameMode][sessionId];
});

app.get("/api/leaderboard", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    let leaderboards = {};
    for (const gameMode of Object.keys(activeGames)) {
        const leaderboard = await getWeeklyLeaderboardTop10(gameMode);
        leaderboards[gameMode] = leaderboard;
    }
    res.end(JSON.stringify(leaderboards));
});

app.get("/api/statistics", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    let stats = await getStatistics();
    stats.images = 0;
    for (const gameMode of Object.keys(activeGames)) {
        let imagesDir = await fs.readdir(`${__dirname}/images/${gameMode}`);
        stats.images += imagesDir.length;
    }
    res.end(JSON.stringify(stats));
});

app.listen(port, () => {
    console.log(`Listening on port: ${port}`);
});