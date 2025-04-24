<svelte:options runes={true} />
<script>
    import { onMount } from "svelte";
    import Button from "../../shared/components/Button.svelte";

    let SERVER_HOST = "";
    let leaderboards = $state([]);

    let outerWidth = $state(0);
    let innerWidth = $state(0);
    let outerHeight = $state(0);
    let innerHeight = $state(0);

    onMount(async () => {
        SERVER_HOST = await (await fetch("/server_host")).text();

        leaderboards = await (await fetch(`${SERVER_HOST}/api/leaderboard`, {
            headers: {
                "ngrok-skip-browser-warning": 1
            }
        })).json();
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
        border-bottom: 1px var(--background3) solid;
    }

    .leaderboard > .leaderboard_item > div {
        display: inline-block;
        position: relative;
        margin-right: 64px;
        width: 100px;
    }

    @media only screen and (max-width: 768px) {
        .content {
            width: 100%;
            height: fit-content;
            margin: 0px;
            flex-direction: column;
            padding: 32px 0px 128px 0px;
        }

        
        .leaderboard > .leaderboard_item > div {
            margin-right: 64px;
            width: 100px;
        }

        .leaderboard > .leaderboard_item > div:first-child {
            margin-right: 0px;
            width: 60px;
        }

        .leaderboard > .leaderboard_item > div:last-child {
            margin-right: 0px;
            width: 60px;
        }
    }
</style>
<svelte:window bind:innerWidth bind:outerWidth bind:innerHeight bind:outerHeight />
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
    {#if innerWidth <= 768}
        <Button text="Return" action={() => {location.href = "/"}} style="display: flex; justify-content: center;" />
    {/if}
</div>