<svelte:options runes={true} />
<script>
    import { onMount } from "svelte";

    let SERVER_HOST = "";
    let leaderboards = $state([]);

    onMount(async () => {
        SERVER_HOST = await (await fetch("/server_host")).text();

        leaderboards = await (await fetch(`${SERVER_HOST}/api/leaderboard`)).json();
        for (const leaderboardName of Object.keys(leaderboards)) {
            if (leaderboards[leaderboardName].length === 0) {
                leaderboards[leaderboardName].push({
                    "nickname": "none"
                });
            } 
        }
    });

    const modes = new Map();
    modes.set("standard", "Standard");
    modes.set("time_travel", "Time Travel");
    modes.set("weekly", "Weekly Challenge");
    const readableMode = mode => modes.get(mode);
</script>
<style>
    .content {
        padding: 0px 16px 0px 16px;
    }

    h2, h3 {
        text-align: center;
    }

    .leaderboard {
        margin: auto;
        width: fit-content;
        padding-bottom: 64px;
    }

    .leaderboard > .leaderboard_item {
        padding: 16px;
        border-bottom: 1px #c4c4c4 solid;
    }

    .leaderboard > .leaderboard_item > div {
        display: inline-block;
        position: relative;
        /* float: right; */
    margin-right: 64px;
    width: 100px;
    /* text-align: right; */
    }
</style>
<div class="content">
    <h2>Weekly Leaderboard</h2>
    {#each Object.keys(leaderboards) as leaderboardName, _}
        <h3>{readableMode(leaderboardName)}</h3>
        <div class="leaderboard">
            <div class="leaderboard_item" style="font-weight: 700;">
                <div>Place</div>
                <div>Nickname</div>
                <div>Score</div>
            </div>
            {#each leaderboards[leaderboardName] as entry, i}
                <div class="leaderboard_item">
                    <div>{i + 1}.</div>
                    <div>{entry.nickname}</div>
                    <div>{entry.score}</div>
                </div>
            {/each}
        </div>
    {/each}
</div>