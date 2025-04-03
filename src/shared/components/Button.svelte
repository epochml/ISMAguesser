<script>
    let props = $props();
</script>
<style>
    button {
        padding: 16px;
        font-size: 20px;
        font-weight: 800;
        border-width: 1px;
        border-style: solid;
        border-radius: 8px;
        transition: 100ms;
        position: relative;
        cursor: pointer;
        background: var(--foreground2);
        border-color: var(--foreground2);
        color: var(--background1);
    }

    button:hover {
        background: transparent;
        color: var(--foreground2);
    }
</style>
<div>
    <button style={props.style} onclick={props.action}>{props.text}</button>
</div>