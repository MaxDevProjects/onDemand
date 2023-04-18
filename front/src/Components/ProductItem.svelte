<script>
    export let id="", name = "", image = "", sku = "", url = "";
    export let removeItem = () => {
    };
    const removeIcon = new URL('/wp-content/plugins/ondemand/front/public/icons/remove.svg', import.meta.url).pathname
    console.log(removeIcon)
</script>

<li class="product-item" data_product_on_demand_id="{id}">
    <span on:click={removeItem} class="remove"
    style="background: url({removeIcon}) no-repeat;
    background-position: center;"></span>
    <a class="product-item-details" href="{url}">
        <div class="row">
            <span>{name}</span>
            <p><strong>ref: {sku}</strong></p>
        </div>
        <div>
            <img src="{image}">
        </div>
    </a>
<span class="separator"></span>
</li>

<style>
    .separator {
        width: 75%;
        height: 1px;
        position: absolute;
        background: #969696;
        bottom: 0;
    }
    .remove {
        display: flex;
        flex-direction: column;
        cursor: pointer;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: auto;
    }

    li {
        background: white;
        margin: 0 auto;
        display: flex;
        padding: 1rem;
        position: relative;
    }

    .product-item-details {
        display: grid;
        grid-template-columns: 1fr 1fr;
        margin-left: 0.5rem;
    }
</style>