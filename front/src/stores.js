import {writable} from "svelte/store";

export const sent = writable(false);

export const productsListFromCustomer = writable([]);