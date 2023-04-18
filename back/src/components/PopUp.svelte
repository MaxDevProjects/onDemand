<script>
import {__CLIENTPREMIUM} from "../constants";
import Loader from "./Loader.svelte";
import {isLoadedList} from "../store";

export let close = true;
export let message = "notification"
export let cancelButton = "Annuler";
export let confirmButton = "Confirmer";

// TODO: manage client premium later
export let clientPremium = __CLIENTPREMIUM;
export let showList = false;
// TODO::---------------------------
export let action = () => {};
export let confirmAction = () => {};
let closePopUp = () => {
    close = !close;
    isLoadedList.update(v => v = false);
}
export let loadingText = "Chargement de la liste";
</script>
{#if !close}
<div class="modal-bg">
    <div class="modal">
        <span class="close" on:click={closePopUp} on:click={action}>Fermer &#10005;</span>
            <div class="sended">
                <div class="info">
                    <p>{@html message}</p>
                    <Loader loadingText="{loadingText}"/>
                    <div class="premium-section-list">
                    <button on:click={() => {if (clientPremium) showList = !showList;}}>Voir la liste des produits</button>
                    {#if clientPremium}
                    <div class="list">
                        {#if showList}
                            <!--insert component tab-->
                        <slot></slot>
                        {/if}
                    </div>
                    {/if}
                    </div>
                </div>
            </div>
        <div class="btns">
            <button on:click={action} on:click={closePopUp} class="btn cancel">{cancelButton}</button>
            {#if confirmButton !== ""}
            <button class="btn confirm" on:click={confirmAction}>{confirmButton}</button>
            {/if}
        </div>
    </div>
</div>
{/if}

<style>
    .modal-bg {
        width: 100vw;
        height: 100vh;
        background: #0c0c0c47;
        position: fixed;
        left: 0;
        top: 0;
        z-index: 999;
    }
    .modal {
        max-width: 60%;
        min-width: 30%;
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        margin: auto;
        color: #0c0c0c;
        background: #f0f0f1;
        padding: 1rem;
    }

    .close {
        display: flex;
        justify-content: flex-end;
        cursor: pointer;
    }
    .btns {
        display: flex;
        justify-content: flex-end;
        gap: 16px;
    }
    .btn {
        padding: .7rem 1rem;
    }
    .btn.cancel {
        background: none;
        border: #7d7d7d solid 1px ;
        color: #7d7d7d;
        border-radius: 4px;
    }
    .btn.confirm {
        background: #5c83e2;
        color: #FFFFFF;
        border-radius: 4px;
    }
    .premium-section-list {
        width: 100%;
        margin: .4rem auto;
        overflow: hidden;
    }
    .premium-section-list>button {
        width: 100%;
    }

</style>