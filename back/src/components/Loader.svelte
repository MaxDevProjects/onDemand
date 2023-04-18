<script>
    import {isLoadedList} from "../store";
    import {onMount} from "svelte";

    export let loadingText;
    $: isLoaded = false;
    onMount(() => {
        const subscribe = isLoadedList.subscribe(value => {
            isLoaded = value;
        });
    })
</script>
<div class="loader">
    <p>{loadingText}</p>
    {#if !isLoaded}
        <span></span>
    {/if}
</div>

<style>
    .loader {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .loader > span {
        border: 1px solid #5cb1f9;
        height: 24px;
        width: 24px;
    }
    .loader > p {
        text-align: center;
        font-size: 1.1rem;
        margin: 0;
    }
    .loader > span {
        animation: rotation 3s infinite ease-in-out;
    }

    @keyframes rotation {
        0% {
            transform: rotate(0deg);
        }
        50% {
            background: #5cb1f9;
            border-radius: 8px;
        }
        100% {
            transform: rotate(359deg);
        }
    }

</style>