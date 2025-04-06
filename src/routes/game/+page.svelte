<svelte:options runes={true} />
<script>
    import { onMount } from 'svelte';
    import Button from "../../shared/components/Button.svelte";
    import panzoom from 'panzoom';
    import { getCookie } from '../../shared/helper/CookieManager';
    
    let SERVER_HOST = "";
    const MAP_LENGTH = $state(256);
    const LOADING_IMAGE = "/icons/loading.png";

    let imageLink = $state("");
    let timeVisual = $state("00:00");

    let gameData = undefined;
    let gameMode = $state("standard");
    let round = $state(0);
    let maxRound = $state(1);
    let timeLeft = 59 * 61 // 59:59
    let score = $state(0);
    let totalScore = $state(0);
    let roundEnded = true;
    let matchEnded = false;
    let roundScoreMenu = $state(false);
    let matchScoreMenu = $state(false);

    let outerWidth = $state(0);
	let innerWidth = $state(0);
	let outerHeight = $state(0);
	let innerHeight = $state(0);

    let yearInput;
    let yearInputValue = $state(1992);
    let answerYear = 0;

    let resultMap;
    let resultMapCtx;
    let answerLocation = {x: MAP_LENGTH / 2, y: MAP_LENGTH / 2};
    let answerPlace = "main";

    let mapPanzoom;
    let mapPin;
    let pinLocation = [MAP_LENGTH / 2, MAP_LENGTH / 2];
    let zoomLevel = 1.0;

    let viewToggle = $state(false);
    let buttonText = $derived(viewToggle ? "Close map" : "Open map")
    let controlsContainerDisplay = $derived(!viewToggle && innerWidth <= 768 ? "none" : "flex");
    let imageContainerDisplay = $derived(viewToggle && innerWidth <= 768 ? "none" : "flex");

    const places = [
        {label: "Main Building - 1st floor", value: "0", image: "/images/main_f1.webp"},
        {label: "Main Building - 2nd floor", value: "1", image: "/images/main_f2.webp"},
    ];
    let selectPlaceValue = $state("0");
    let currentMapImage = $derived.by(() => {
        for (let place of places) {
            if (place.value == selectPlaceValue) {
                return place.image;
            }
        }
        return LOADING_IMAGE;
    });

    const updatePinZoom = () => {
        console.log(pinLocation)
        mapPin.style.transform = `matrix(${1.0 / zoomLevel}, 0, 0, ${1.0 / zoomLevel}, ${pinLocation[0] - 32}, ${pinLocation[1] - 32}) translate(calc(0% + 0px), calc(-50% + 0px))`;
    }

    const touchHandler = (e) => {
        if (e.target.id == "map_background") {
            // MouseEvent.layerX has been deprecated
            // pinLocation = [e.layerX, e.layerY];

            // LayerX/LayerY calculation (tested on Gecko and V8, win11)
            pinLocation = [
                (e.clientX - e.target.getBoundingClientRect().x) / zoomLevel,
                (e.clientY - e.target.getBoundingClientRect().y) / zoomLevel
            ];
            updatePinZoom();
        }
        return true;
    }

    let instance
    function initPanzoom(node) {
        instance = panzoom(node, {
            bounds: true,
            onClick: touchHandler,
            onTouch: (e) => {},
        });
    }

    onMount(async () => {
        SERVER_HOST = await (await fetch("/server_host")).text();

        gameMode = getCookie("game_mode");

        let styleObserver = new MutationObserver((mutations) => {
            zoomLevel = mapPanzoom.style.transform.substring(7).split(",")[0];
            updatePinZoom();
        });
        styleObserver.observe(mapPanzoom, { attributes : true, attributeFilter : ['style'] });

        fetch(`${SERVER_HOST}/api/match_info`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "game_session_id": getCookie("game_session_id"),
                "game_mode": gameMode
            })
        }).then(response => {
            if (response.status != 200) {
                errorHandle(response.status);
            }
            return response.json();
        }).then(json => {
            gameData = json.game_data;
            maxRound = gameData.total_rounds;
            startRound();
        });
    });

    let mapImage;
    const onCanvasLoad = () => {
        mapImage = new Image();
        mapImage.src = "/images/main_f1.webp";
        mapImage.onload = drawResultMap;
    }

    const drawResultMap = () => {
        resultMapCtx = resultMap.getContext("2d");
        resultMapCtx.drawImage(mapImage, 0, 0, mapImage.width, mapImage.height);
        resultMapCtx.lineWidth = 40;
        resultMapCtx.strokeStyle = "#ff0049";

        const answerCoords = [
            (answerLocation.x / MAP_LENGTH) * mapImage.width,
            (answerLocation.y / MAP_LENGTH) * mapImage.height
        ];
        const inputCoords = [
            (pinLocation[0] / MAP_LENGTH) * mapImage.width,
            (pinLocation[1] / MAP_LENGTH) * mapImage.height
        ];

        // Line
        resultMapCtx.beginPath();
        resultMapCtx.moveTo(...answerCoords);
        resultMapCtx.lineTo(...inputCoords);
        resultMapCtx.stroke();
        resultMapCtx.beginPath();
        resultMapCtx.arc(inputCoords[0], inputCoords[1], 1, 0, 2 * Math.PI);
        resultMapCtx.stroke();
        resultMapCtx.beginPath();
        resultMapCtx.arc(answerCoords[0], answerCoords[1], 1, 0, 2 * Math.PI);
        resultMapCtx.stroke();

        // Start/end
        resultMapCtx.beginPath();
        resultMapCtx.arc(answerCoords[0], answerCoords[1], 120, 0, 2 * Math.PI);
        resultMapCtx.stroke();
    }
    
    setInterval(() => {
        if (gameData == undefined) {
            return;
        }

        timeLeft = (gameData.end_time - new Date().getTime()) / 1000;
        if (timeLeft <= 1) {
            endRound();
        }

        if (roundEnded) {
            timeVisual = "00:00";
            return;
        }
        const leadingZero = (num) => String(num).padStart(2, '0');
        timeVisual = `${leadingZero(Math.floor(timeLeft / 60))}:${leadingZero(Math.floor(timeLeft) % 60)}`;
    }, 1000);

    const updateImage = () => {
        console.log("updating image")
        fetch(`${SERVER_HOST}/api/round_image`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "game_session_id": getCookie("game_session_id"),
                "game_mode": gameMode
            })
        }).then(response => {
            if (response.status != 200) {
                errorHandle(response.status);
            }
            return response.blob();
        }).then(data => {
            imageLink = URL.createObjectURL(data);
        });
    }

    const startRound = () => {
        roundScoreMenu = false;
        if (!roundEnded || matchEnded) {
            return;
        }
        
        if (round == maxRound) {
            fetch(`${SERVER_HOST}/api/submit_match`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "game_session_id": getCookie("game_session_id"),
                    "game_mode": gameMode
                })
            }).then(response => {
                if (response.status != 200) {
                    errorHandle(response.status);
                }
                return response.json();
            }).then(json => {
                gameData = json.game_data;
                endMatch();
            });
            return;
        }

        score = 0;
        imageLink = LOADING_IMAGE;

        fetch(`${SERVER_HOST}/api/start_round`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "game_session_id": getCookie("game_session_id"),
                "game_mode": gameMode
            })
        }).then(response => {
            if (response.status != 200) {
                errorHandle(response.status);
            }
            return response.json();
        }).then(json => {
            gameData = json.game_data;
            roundEnded = false;
            if (round < maxRound) {
                round = gameData.round_iterator + 1;
                updateImage();
            }
            // updateImage();
        });
    }

    const endRound = () => {
        if (roundEnded) {
            return;
        }

        submitRound();
    }

    const endMatch = () => {
        matchEnded = true;
        matchScoreMenu = true;
    }

    const submitRound = () => {
        if (roundEnded || matchEnded) {
            return;
        }

        roundEnded = true;

        fetch(`${SERVER_HOST}/api/submit_round`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "game_session_id": getCookie("game_session_id"),
                "game_mode": gameMode,
                "location": {
                    "place": parseInt(selectPlaceValue),
                    "x": pinLocation[0],
                    "y": pinLocation[1]
                },
                "year": yearInputValue
            })
        }).then(response => {
            if (response.status != 200) {
                errorHandle(response.status);
            }
            return response.json();
        }).then(json => {
            gameData = json.game_data;
            score = json.round_score;
            totalScore = gameData.score;
            answerLocation = json.answer_location;
            answerPlace = json.answer_place;
            answerYear = json.answer_year
            roundEnded = true;

            roundScoreMenu = true;
        });
    }

    const errorHandle = (errorStatus) => {
        alert("Oof! Error: " + errorStatus);
    }
</script>
<style>
    :global(body) {
        background-color: var(--background2);
    }
    
    .game_view {
        display: flex;
        position: fixed;
        width: 100%;
        height: 100%;
        justify-content: space-between;
    }

    .game_view > div {
        
    }

    .image_container {
        display: flex;
        flex: 1;
        justify-content: center;
        align-items: center;
        padding: 64px;
        height: calc(100% - 128px - 48px);
    }

    .image_container > div {
        width: calc(100% - 64px);
        height: calc(100% - 64px);
        padding: 16px;
        display: flex;
        background-color: var(--background2);
    }

    #image {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        left: 50%;
        transform: translateX(-50%);
        position: relative;
        pointer-events: none;
    }

    .controls_container {
        padding: 16px;
        width: 500px;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;
        gap: 64px;
        background-color: var(--background2);
        color: var(--foreground1);
    }

    .info_container {
        display: flex;
        justify-content: space-evenly;
        width: 100%;
    }

    .info_stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 8px;
    }

    .info_stat > .label {
        font-size: 16px;
        font-weight: 400;
    }

    .info_stat > .value {
        font-size: 32px;
        font-weight: 900;
    }

    .map_place_container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        width: 100%;
        font-size: 20px;
    }

    .map_container {
        width: 100%;
        height: 400px;
        background-color: var(--background3);
        overflow: hidden;
        touch-action: none;
    }

    .map_container > div {
        position: relative;
    }

    .place_container {
        display: flex;
        gap: 16px;
    }

    #place_input {
        font-size: 20px;
    }

    #map_background {
        width: 300px;
        height: 300px;
        background-size: cover;
    }

    #map_pin {
        position: absolute;
        width: 64px;
        height: 64px;
        background: url("/icons/pin.png");
        background-size: cover;
        pointer-events: none;
    }

    .year_container {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        color: var(--foreground1)
    }

    .year_container > #year_input {
        width: 90%;
        height: 16px;
        -webkit-appearance: none;
        background: var(--background3);
        outline: none;
        border-radius: 8px;
    }

    .year_container > #year_input::-moz-range-thumb, .year_container > #year_input::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 24px;
        height: 24px;
        background: var(--foreground2);
        border: none;
        cursor: pointer;
        outline: none;
        border-radius: 12px;
    }

    .year_container > div {
        font-size: 20px;
    }

    .submit_button_container {
        display: flex;
        justify-content: center;
    }

    .score_menu {

    }

    .score_menu > .score_menu_heading {
        font-size: 32px;
        font-weight: 400;
    }

    .score_menu > .score_menu_score > .score_menu_score_label {
        font-size: 32px;
        font-weight: 400;
    }

    .score_menu > .score_menu_score > .score_menu_score_value {
        font-size: 64px;
        font-weight: 900;
    }

    .score_menu > .score_menu_round_score {
        display: block;
    }

    .score_menu > .score_menu_round_score > .score_menu_score_label {
        display: inline;
        font-size: 16px;
        font-weight: 400;
    }

    .score_menu > .score_menu_round_score > .score_menu_score_value {
        display: inline;
        font-size: 16px;
        font-weight: 900;
    }


    .score_menu > div {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-evenly;
        gap: 16px;
    }

    #resultMap {
        width: 400px;
        max-height: 400px;
        /* background-image: url({LOADING_IMAGE}); */
    }

    .view_toggle_container {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 96px;
    }

    @media only screen and (max-width: 768px) {
        .game_view {
            position: relative;
            width: 100%;
            height: 100dvh;
            margin: 0px;
            flex-direction: column;
        }

        .image_container {
            padding: 8px;
            height: 50%;
        }

        .image_container > div {
            width: auto;
        }

        .info_container, .controls_container {
            width: 100%;
            padding: 16px 0px 32px 0px;
            gap: 16px;
        }

        .controls_container {
            display: none;
            padding: 0px;
            height: 100%;
        }

        .map_place_container {
            min-height: 300px;
            max-height: 500px;
            height: inherit;
        }

        .map_container {
            min-height: 300px;
            max-height: 500px;
            height: inherit;
        }

        .submit_button_container, .year_container {
            padding: 16px;
        }

        #resultMap {
            max-width: 90%;
            height: auto;
            max-height: 500px;
        }
    }
</style>
<svelte:window bind:innerWidth bind:outerWidth bind:innerHeight bind:outerHeight />
<div class="game_view">
    <div class="image_container" style="display: {imageContainerDisplay}">
        <div>
            <img id="image" src="{imageLink}" />
        </div>
    </div>
    <div class="controls_container" style="display: {controlsContainerDisplay}">
        <div class="info_container">
            <div class="info_stat">
                <div class="round label">Round</div>
                <div id="round_value" class="round value">{round}/{maxRound}</div>
            </div>
            <div class="info_stat">
                <div class="label">Time</div>
                <div id="time_value" class="value">{timeVisual}</div>
            </div>
            <div class="info_stat">
                <div class="label">Score</div>
                <div id="score_value" class="value">{totalScore}</div>
            </div>
        </div>
        <div class="map_place_container">
            <div class="map_container">
                <div id="map_panzoom" use:initPanzoom bind:this={mapPanzoom}>
                    <div id="map_pin" bind:this={mapPin}></div>
                    <div id="map_background" style="width: {MAP_LENGTH}px; height: {MAP_LENGTH}px; background-image: url({currentMapImage});" ></div>
                </div>
            </div>
            <div class="place_container">
                <!-- <div class="place_label">Select place</div> -->
                <select id="place_input" bind:value={selectPlaceValue}>
                    {#each places as place, i}
                        <option value="{place.value}">{place.label}</option>
                    {/each}
                </select>
            </div>
        </div>
        {#if gameMode == "time_travel"}
            <div class="year_container">
                <div>{yearInputValue}</div>
                <input id="year_input" type="range" bind:this={yearInput} bind:value={yearInputValue} min="1960" max="2025">
            </div>
        {/if}
        <div class="submit_button_container">
            <Button text="Submit" action={submitRound} />
        </div>
    </div>
    {#if innerWidth <= 768}
        <div class="view_toggle_container">
            <Button text={buttonText} action={() => {viewToggle = !viewToggle}} style="width: calc(100% - 16px); display: flex; justify-content: center;" />
        </div>
    {/if}
</div>
{#if roundScoreMenu}
    <div class="pop_up_bg"></div>
    <div class="pop_up score_menu">
        <div class="score_menu_round_score">
            <div class="score_menu_score_label">Round score: </div>
            <div class="score_menu_score_value">{score}</div>
        </div>
        <div>
            <canvas id="resultMap" bind:this={resultMap} use:onCanvasLoad width=4354 height=4354 style="background-image: url({LOADING_IMAGE});" />
        </div>
        {#if gameMode == "time_travel"}
            <div>
                <div>Guessed year: {yearInputValue}</div>
                <div>Actual year: {answerYear}</div>
            </div>
        {/if}
        <div>
            <Button text="Continue" action={startRound} />
        </div>
    </div>
{/if}
{#if matchScoreMenu}
    <div class="pop_up_bg"></div>
    <div class="pop_up score_menu">
        <div class="score_menu_heading">
            Game completed!
        </div>
        <div class="score_menu_score">
            <div class="score_menu_score_label">Total score:</div>
            <div class="score_menu_score_value">{totalScore}</div>
        </div>
        <div>
            <Button text="Try Again" action={() => {location.href = "/select"}} />
            <Button text="Leaderboard" action={() => {location.href = "/leaderboard"}} />
        </div>
    </div>
{/if}