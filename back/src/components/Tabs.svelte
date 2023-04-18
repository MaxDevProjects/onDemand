<script>
import {onMount} from "svelte";

export let items = [];
export let activeTabValue;

onMount(() => {
    // Set default tab value
    if (Array.isArray(items) && items.length && items[0].value) {
        activeTabValue = items[0].value;
    }
});

const handleClick = tabValue => () => (activeTabValue = tabValue);
</script>


<ul class="tabs">
    {#if Array.isArray(items)}
        {#each items as item}
            <li class={activeTabValue === item.value ? 'active' : ''}>
                <span on:click={handleClick(item.value)}>{item.label}</span>
                <span class="line"></span>
            </li>
        {/each}
    {/if}
</ul>

<style>
    .tabs {
        display: flex;
        align-items: baseline;
    }

    .tabs > li.active {
        padding: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .tabs > li.active > .line {
        height: 2px;
        width: 75%;
        background: #5AB1FA;
        margin-top: 8px;
    }

</style>
