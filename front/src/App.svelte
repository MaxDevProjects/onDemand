<script>
	import axios from "axios";
	import ProductItem from "./Components/ProductItem.svelte";
	import {onMount} from "svelte";
	import Notification from "Components/Notification.svelte";
	import { get } from 'svelte/store';
	import {sent} from "./stores";

	const imgUrl = new URL('../icons/on_demand.svg', import.meta.url).pathname
	console.log(imgUrl)
	// TODO : remove after build/bundle.js and + .icons/on_demand.svg

	let showList = false;
	export let openModal = false;
	$: products_on_demand = [];
	$: count = 0;
	$: productId = null;

	$: { reMountThis() }
	function reMountThis () {
		openModal = false;
	}
	function openNotif() {
		openModal = !openModal;
	}

	let showing = () => {
		if (products_on_demand.length > 0) {
			showList = !showList;
			reMountThis();
		}
	}


	let getOnDemandButton = () => {
		let on_demand_buttons = document.querySelectorAll('.on_demand_product');
		on_demand_buttons.forEach(btn => {
			btn.addEventListener('click', (e) => {
				const target = e.target;
			 	let on_demand_product_id = target.getAttribute('data-product_id');
				getProduct(on_demand_product_id);
				e.target.classList.add('added');
				e.target.innerText = "Ajouté";
				e.preventDefault();
			})
		})
		updateList();
	}
	const getProductFrom = new URL('../../../includes/model/get_product_from_id.php', import.meta.url).pathname
	let getProduct = (id) => {
		axios.post( getProductFrom, null, {
			params: {
				id: id
			}
		})
		.then(res => {
			if (!products_on_demand.some(e => e.id === parseInt(id))) {
				products_on_demand.push(res.data)
				updateList();
			}
		})
	}

	let initComponent = () => {
		showList = true;
		openModal = false;
	}

	let initLocalStorage = () => {
		if (localStorage.getItem('products_on_demand')) {
			products_on_demand = JSON.parse(localStorage.getItem('products_on_demand'));
		}
	}

	let updateList = () => {
		products_on_demand = products_on_demand;
		localStorage.setItem('products_on_demand', JSON.stringify(products_on_demand))
		count = products_on_demand.length;
		if (products_on_demand.length === 0) {
			showList = false;
		}
	}

	let removeProductItem = () => {
		let index = products_on_demand.findIndex(el => el.id === parseInt(productId))
		products_on_demand.filter(el => {
			if(el.id === parseInt(productId)) {
				products_on_demand.splice(index, 1)
				updateList();
			}
		})
	}

	$: $sent, sendOnDemandList();

	let sendOnDemandList = async () =>  {
		if (get(sent)) {
			setTimeout(() => {
				products_on_demand = [];
				updateList();
				showList = false;
			}, 1000)
		}
	}

	onMount(() => {
		initLocalStorage();
		getOnDemandButton();
	})

</script>

<Notification close="{!openModal}"/>
<div class="on-demande-list-block {showList ? 'show' : ''}">
	{#if showList}
		<ul class="on-demande-list">
			<div class="on-demand-before-list">
				{#each products_on_demand as product}
					<ProductItem removeItem="{that => {
			productId = that.target.parentNode.getAttribute('data_product_on_demand_id');
			removeProductItem()
				}
			}" id="{product.id}" image="{product.image}" name="{product.name}" sku="{product.sku}" category="{product.category}" url="{product.url}"/>
				{/each}
			</div>

		</ul>

	<div class="counter-section">
		<p>Total des produits: <span class="counter">{count}</span></p>
	</div>
	<button type="btn" on:click={sendOnDemandList} on:click={openNotif}>Envoyer la demande</button>
	{/if}
	<a class="btn-on-demand"  on:click={showing}>
		<span class="button-counter">{count}</span>
		{#if (window.matchMedia("(min-width: 782px)").matches)}
			Produits à la demande
		{/if}
		<img src="{imgUrl}" alt=""></a>
</div>

<style>
	:global(#on-demand) {
		display: flex;
		position: fixed;
		right: 0;
		bottom: 0;
		z-index: 9999;
	}
	.on-demand-before-list {
		overflow-y: scroll;
	}
	.on-demande-list-block {
		max-width: 250px;
		display: flex;
		flex-direction: column;
		align-items: self-end;
		align-items: center;
		padding: 0;
		gap: 16px;
		background-color: #ffffff00;
	}

	.on-demande-list-block.show {
		display: grid;
		grid-template-rows: 1fr .1fr .1fr .1fr;
		height: 100vh;
		background-color: #ffffff;
	}

	.on-demande-list {
		display: flex;
		padding: 0;
		margin: 0;
		width: 100%;
		flex-direction: column;
		height: 100%;
		overflow-y: scroll;
		padding-top: 2rem;
		background: #F5F5F5;
		justify-content: flex-end;
	}

	.counter-section {
		width: 100%;
		color: #5A5A5A;
	}

	.counter-section>p {
		margin: auto;
		text-align: center;
	}

	.counter {
		opacity: .8;
		font-size: 1rem;
		font-weight: bolder;
		color: #5AB1FA;
	}
	.btn-on-demand {
		background: #5AB1FA;
		color: #F5F5F5;
		padding: 10px 16px;
		border-radius: 16px;
		margin: 24px;
		display: flex;
		position: relative;
	}

	.button-counter {
		position: absolute;
		margin: auto;
		right: -6px;
		top: -6px;
		padding: 4px;
		line-height: 1;
		text-align: center;
		background: #5AB1FA;
		border-radius: 100%;
		width: 30px;
		height: 30px;
	}

	@media screen and (max-width: 782px) {
		:global(#on-demand) {
			bottom: 4rem;
		}
		.btn-on-demand {
			padding: 16px;
			border-radius: 50px;
			width: max-content;
		}
	}
</style>