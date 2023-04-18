<script>
import axios from "axios";
import {sent} from "../stores";
import { get } from 'svelte/store';
import Loader from "./Loader.svelte";

export let close = false;
let isLoggedUser;
let adminMessage;
let phone;
const getDataOd = new URL('../../../includes/model/get_data_od_db.php', import.meta.url).pathname
let adminMessageFromDb = async () => {
    await axios.get(getDataOd)
    .then(res => {
        adminMessage = res.data[0].messagedelay
        adminMail = res.data[0].email
        phone = res.data[0].phone
    })
}
$: productsList = [];
$: userMail = "";
$: mailAdress = "";
$: adminMail = "";

let isOpenedModal =async () => {
    await adminMessageFromDb();
    if (close === false) {
        isUserLoggedIn();
    }
}

let closeModal = () => {
    close = !close;
};

let isUserLoggedIn = () => {
    const isUserLogged = new URL('/wp-content/plugins/ondemand/includes/od_is_user_loggged.php', import.meta.url).pathname
    console.log(import.meta)
    getProductsList();
    axios.get( isUserLogged)
    .then(res => {
        isLoggedUser = res.data;
        userMail = isLoggedUser ? isLoggedUser : "";
        if (isLoggedUser) {
            sendingMail();
        }
    })
}

let getProductsList = () => {
    if (localStorage.getItem('products_on_demand')) {
        productsList = localStorage.getItem('products_on_demand');
    }
}

let sendingMail = () => {
    const sendMail = new URL('/wp-content/plugins/ondemand/includes/send_mail.php', import.meta.url).pathname
    axios.post( sendMail, null, {
        params: {
            user_email: userMail,
            products_list: productsList,
            admin_mail: adminMail,
            phone: phone
        }
    })
        .then(res => {
            adminMessage = res.status !== 200 ? "Oups! Une erreur est survenu veuillez réessayez ultérieurement ou contactez le support!" : adminMessage;
            sent.update(value => value = res.status === 200)
            console.log(res)
        })
        .catch(error => {
            console.log(error);
        })
}

let validMail = (value) => {
    return value.match(/^[a-zA-Z0-9.! #$%&'*+/=? ^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/);
}

let sendMailAtThisAdress = () => {
        userMail = mailAdress;
        isLoggedUser = true;
        sendingMail();
}
</script>

{#if !close}
<div class="modal-bg">
    <div class="modal" use:isOpenedModal>
        <span class="close" on:click={closeModal}>Fermer &#10005; </span>
        {#if isLoggedUser === false}
        <div class="not-consumer">
            <label for="mail">Vous n'êtes pas client ?</label>
            <small>Pas de panique vous pouvez nous transmettre votre adresse mail et nous traiterons votre demande</small>
            <input name="mail" id="mail" type="email" bind:value={mailAdress} placeholder="jenesuispasencoreclient@monemail.fr">
            <div class="btns">
                <button on:click={closeModal} class="btn cancel">Annuler</button>
                <button class="btn confirm" on:click={sendMailAtThisAdress} disabled="{!validMail(mailAdress)}">Confirmer</button>
            </div>
        </div>
        {:else }
        <div class="sended">
            <div class="info">
                <Loader isLoaded="{false}"/>
                <p>{adminMessage}</p>
            </div>
            <div class="btns">
                <button on:click={closeModal} class="btn cancel">Fermer</button>
            </div>
        </div>
        {/if}
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

    .not-consumer {
        display: flex;
        flex-direction: column;
    }
    .btns {
        display: flex;
        justify-content: flex-end;
        gap: 16px;
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

    @media screen and (max-width: 782px) {
        .btns {
            flex-flow: wrap-reverse;
            width: 100%;
        }
        .btns .btn{
            width: 100%;
        }
    }

</style>