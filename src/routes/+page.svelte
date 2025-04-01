<svelte:options runes={true} />
<script>
    import Button from "../shared/components/Button.svelte";
    import { onMount } from "svelte";

    let SERVER_HOST = "";
    let stats = $state({});

    onMount(async () => {
        SERVER_HOST = await (await fetch("/server_host")).text();
        stats = await (await fetch(`${SERVER_HOST}/api/statistics`)).json();
    });
</script>
<style>
    .fullsize_content {
        position: fixed;
        display: flex;
        justify-content: space-evenly;
        flex-direction: column;
        padding: 0px;
        width: 100%;
    }

    h1, h2, h3 {
        text-align: center;
    }

    h1 {
        font-size: 64px;
        color: white;
    }

    .flex_container {
        display: flex;
        justify-content: space-evenly;
        align-items: center;
        gap: 16px;
    }

    .intro {
        flex-direction: column;
        height: 100vh;
        background-image: url("/images/DSC00593.webp");
        background-position: center;
        background-size: cover;
    }

    .stats {
        position: fixed;
        bottom: 0px;
        padding: 16px;
        color: white;
        align-items: baseline;
        flex-direction: column;
        gap: 0px;
    }

    @media only screen and (max-width: 768px) {
        h1 {
            font-size: 48px;
        }

        .buttons {
            flex-direction: column;
            z-index: 1;
        }

        .stats {
            font-size: 12px;
            padding: 8px;
        }
    }
</style>
<div class="fullsize_content">
    <div class="intro flex_container">
        <h1>Welcome to ISMAguesser!</h1>
        <div class="buttons flex_container">
            <Button text="Play" action={() => {location.href = "/select"}} style="backdrop-filter: blur(10px);" />
            <Button text="Weekly Challenge" action={() => {location.href = "/select?mode=weekly"}} style="backdrop-filter: blur(10px);" />
            <Button text="Top Scores" action={() => {location.href = "/leaderboard"}} style="backdrop-filter: blur(10px);" />
        </div>
    </div>
    <div class="stats flex_container">
        <div>Number of images: {stats.images}</div>
        <div>Matches played this week: {stats.weekly_matches}</div>
        <div>Total matches played: {stats.total_matches}</div>
    </div>
</div>