import dotenv from "dotenv";
import pg from "pg";
const { Client } = pg;

dotenv.config();
const client = new Client({
    user: process.env.PG_USERNAME,
    password: process.env.PG_PASSWORD,
    host: process.env.PG_HOST,
    port: Number(process.env.PG_PORT),
    database: process.env.PG_DB,
    ssl: {
        rejectUnauthorized: false
    }
});
// types.setTypeParser(1700, value => parseFloat(value));
await client.connect();

const sendQuery = (query, params) => client.query(query, params).then(
    results => results.rows
).catch(
    err => {console.log(err); return []}
);

/*

## Queries

Initiate table
```sql
CREATE TABLE WeeklyLeaderboard (
    game_mode text,
    nickname text,
    score int,
    time_stamp timestamp without time zone
);
```

*/

export const getWeeklyLeaderboardTop10 = (gameMode) => {
    return new Promise(resolve => {
        sendQuery(
            "SELECT * FROM WeeklyLeaderboard WHERE game_mode = $1 ORDER BY score DESC LIMIT 10;",
            [gameMode]
        ).then(data => {
            resolve(data);
        });
    });
}

export const addWeeklyLeaderboardEntry = (gameMode, nickname, score) => {
    sendQuery(
        `INSERT INTO WeeklyLeaderboard VALUES ($1, $2, $3, NOW()::timestamp without time zone);`,
        [gameMode, nickname, score]
    );
    sendQuery(
        `UPDATE Statistics SET total_matches = total_matches + 1;`,
        []
    );
}

export const cleanWeeklyLeaderboard = () => {
    sendQuery(
        `DROP TABLE WeeklyLeaderboard;
        CREATE TABLE WeeklyLeaderboard (
            game_mode text,
            nickname text,
            score int,
            time_stamp timestamp without time zone
        );`,
        []
    );
}

export const getStatistics  = async () => {
    return new Promise(async resolve => {
        const weeklyMatches = await sendQuery("SELECT COUNT(*) FROM WeeklyLeaderboard;");
        const totalMatches = await sendQuery("SELECT * FROM Statistics;");
        resolve({
            "weekly_matches": Number(weeklyMatches[0].count),
            "total_matches": totalMatches[0].total_matches
        });
    });
}