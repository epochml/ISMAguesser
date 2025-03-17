<svelte:options runes={true} />
<script>
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import Button from "../../shared/components/Button.svelte";
    import { getCookie, setCookie } from "../../shared/helper/CookieManager";
    
    let SERVER_HOST = "";

    let playedWeeklyPopUp = $state(false);

    let selectGameMode;
    let nicknameInput;

    let gameMode = "";
    let nickname = "";

    const gameModeParam = $page.url.searchParams.get("mode");

    onMount(async () => {
        SERVER_HOST = await (await fetch("/server_host")).text();

        if (gameModeParam != undefined) {
            const gameModes = ["standard", "time_travel", "weekly"];
            const index = gameModes.indexOf(gameModeParam);
            if (index != -1) {
                selectGameMode.selectedIndex = index;
            }
        }
    });

    const startGame = async () => {
        gameMode = selectGameMode.value;
        nickname = nicknameInput.value;

        if (gameMode === "weekly" && getCookie("playedWeekly") === "1") {
            playedWeeklyPopUp = true;
            return;
        }

        const response = await fetch(`${SERVER_HOST}/api/create_match`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "game_mode": gameMode,
                "nickname": nickname
            })
        });

        if (response.status != 200) {
            alert("Oof! Error: " + response.status);
        }

        const json = await response.json();
        
        setCookie("game_session_id", json.game_session_id, 1);
        setCookie("game_mode", gameMode, 1);
        setCookie("playedWeekly", "1");

        window.location.href = "/game";
    }
</script>
<style>
    .content {
        display: flex;
        justify-content: space-evenly;
        padding: 0px 16px 0px 16px;
    }

    .content > div {
        flex: 1;
        padding: 16px;
    }

    .menu_container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
    }

    #nickname_input {
        outline: none;
    }
</style>
<div class="content">
    <div>
        <h2>Game Modes</h2>
        <h3>Standard</h3>
        <p>5 rounds, 1 minute per round. Guess location of the photo.</p>
        <h3>Time Travel</h3>
        <p>5 rounds, 1 minute per round. Guess location and year the photo was taken.</p>
        <h3>Weekly Challenge</h3>
        <p>1 round, 10 minutes. New photo every week.</p>
    </div>
    <div class="menu_container">
        <h1 class="heading2">Start a round</h1>
        <div>
            <h3>Game mode: </h3>
            <select id="gamemode_input" bind:this={selectGameMode}>
                <option value="standard">Standard</option>
                <option value="time_travel">Time Travel</option>
                <option value="weekly">Weekly Challenge</option>
            </select>
        </div>
        <div>
            <h3>Nickname: </h3>
            <input id="nickname_input" type="text" minlength="3" maxlength="24" bind:this={nicknameInput} />
        </div>
        <div>
            <Button text="START" action={startGame}></Button>
        </div>
    </div>
</div>
{#if playedWeeklyPopUp}
    <div class="pop_up_bg"></div>
    <div class="pop_up played_weekly_pop_up">
        <div class="pop_up_heading">
            You already played weekly challenge this week!
        </div>
        <Button text="Close" action={() => {playedWeeklyPopUp = false}} />
    </div>
{/if}