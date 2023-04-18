<script>
	import axios from "axios";
	import {onMount} from "svelte";
	import Notification from "./components/Notification.svelte";
	import PopUp from "./components/PopUp.svelte";
	import Tabs from "./components/Tabs.svelte";
	import Loader from "./components/Loader.svelte";
	import {isLoadedList} from "./store";

	let od_is_checkedFree;
	let od_mail;
	let od_phone;
	let od_delay;
	let isValideForm;
	let backend_odforfree_enabled;
	let currentTab;
	// List of tab items with labels and values.
	let tabItems = [
		{ label: "Configuration", value: 1 },
		{ label: "Tableau de bord", value: 2 },
	];
	let sumOfProductsIntoWoo = 0;
	let currentpage = 0;
	let lookingForFreeProductsPage = 1;
	let lastResult = [];
	let page = 1;
	let totalOfOnDemandProcucts = 0;

	$: productsList =  [];
	$: productsListInDashboard =  [];
	$: productsListInDashboardCount = 0;
	$: isValidMail = true;
	$: isValidPhone = true;
	$: isValidMessage = true;
	$: tableHTML = "";
	$: sendingCounterList = [];
	$: sendingList = false;

	export let openPopUp = false;
	export let popUpMessage = "";
	export let cancelButtonText = "";
	$: confirmButtonText = "";
	$: loaderText = "";
	$: { reMountThis() }
	function reMountThis () {
		openPopUp = false;
	}

	let initForm = async () => {
		od_is_checkedFree = await data.forfree === '1';
		backend_odforfree_enabled = await data.forfree === '1';
		od_mail = await data.email;
		od_phone = await data.phone;
		od_delay = await data.messagedelay;
	}

	let updateConfig = () => {
		if (checkValidateForm()) {
			const updateConfigOd = new URL('/wp-content/plugins/ondemand/includes/model/update_config_od_db.php', import.meta.url).pathname
			axios.put(updateConfigOd , null,
					{
						params:
								{
									free: od_is_checkedFree === true ? '1' : '0',
									mail: od_mail,
									phone: od_phone,
									delay: od_delay,
								}
					}
			)
					.then(res => {
						return JSON.parse(res.config.data);
					})
					.catch(error => {
						console.log(error)
					})
			isValideForm = true;
		} else {
			isValideForm = false;
		}
	}
	let data;
	let getDataFromOdDb = async () => {
		const getDataOd = new URL('../../../includes/model/get_data_od_db.php', import.meta.url).pathname
		const dataUrl =  await axios.get(getDataOd);
		data = await dataUrl.data[0];
	}

	let validMail = () => {
		return od_mail.match(/^[a-zA-Z0-9.! #$%&'*+/=? ^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/);
	}
	let validPhone = () => {
		return od_phone.match(/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/);
	}
	let validMessage = () => {
		return od_delay.match(/^[A-Za-z0-9 -]*$/);
	}

	let checkValidateForm = () => {
		isValidMail = validMail();
		isValidPhone = validPhone();
		isValidMessage = validMessage();
		return validMail() && validPhone() && validMessage();
	}

	let getCountProductsIntoWoo = () => {
		const getWpCountProducts = new URL('/wp-content/plugins/ondemand/includes/model/get_wp_count_products.php', import.meta.url).pathname
		axios.get(getWpCountProducts)
				.then(res => {
					sumOfProductsIntoWoo = parseInt(res.data);
				})
	}

	let updateProductsPostMetaFromId = async () => {
		openPopUp = !openPopUp;
		popUpMessage = sumOfProductsIntoWoo;
		let updateListTemp = [];
		let lastResultOfRequest = [];
		let statusCode = 0
		if (Array.isArray(lastResultOfRequest)) {
			do {
				const manageFreeProducts = new URL('../../../includes/model/manage_free_products.php', import.meta.url).pathname
				axios.get(manageFreeProducts , {
					params: {
						'page': lookingForFreeProductsPage
					}
				})
						.then(res => {
							lastResultOfRequest = res.data;
							if (Array.isArray(lastResultOfRequest) && lastResultOfRequest.length > 0) {
								updateListTemp.push(lastResultOfRequest);
								productsList = updateListTemp.flat();
								loaderText = "recherche en cours ...";
								lookingForFreeProductsPage++;
							}
							if (Array.isArray(productsList)) {
								// ouverture de la pop up avec pour message le nombre de produit
								popUpMessage = `Vous êtes sur le point de passer en "à la demande" <strong>${productsList.length}</strong> produits de votre boutique`;
								cancelButtonText = "Annuler";
								confirmButtonText = "";
							}
						})
				await sleep(10000)
			} while ((Array.isArray(lastResultOfRequest) && lastResultOfRequest.length > 0) && productsList.length > 0)
			if (!((Array.isArray(lastResultOfRequest) && lastResultOfRequest.length > 0) && productsList.length > 0)) {
				loaderText = "La liste des produits est chargée"
				confirmButtonText = "Confirmer";
				isLoadedList.update(v => v = true);
			}
			if (productsList.length === 0) {
				popUpMessage = "Tout est à jour"
				cancelButtonText = "Fermer";
				confirmButtonText = "";
				loaderText = "";
			}
		}
	}

	const sleep = (milliseconds) => {
		return new Promise(resolve => setTimeout(resolve, milliseconds))
	}

	let getAllProductsOnDemand = async () => {
		let tempList = [];
		do {
			const getAllOdProducts = new URL('../../../includes/model/get_all_od_products.php', import.meta.url).pathname
			axios.get(getAllOdProducts , {
				params: {
					'page': page
				}
			})
			.then((res) => {
				lastResult = res.data
				tempList.push(lastResult)
				productsListInDashboard = tempList.filter(e=>e.length);
				page++;
			})
			await sleep(10000)
		} while (lastResult.length > 0)
		reconstructArray(tempList, productsListInDashboard, 25)
	}

	let reconstructArray = async (tempArray, definitiveArray, length) => {
		let newArray = [];
		for (let i = 0; i < tempArray.length; i++) {
			for (let j = 0; j < tempArray[i].length; j++) {
				newArray.push(tempArray[i][j])
				productsListInDashboardCount = newArray.length;
			}
		}
		definitiveArray = [];
		while (newArray.length > 0) {
			return definitiveArray.push(newArray.splice(0, length))
		}
		productsListInDashboard = definitiveArray;
	}

	let promiseProductList = getAllProductsOnDemand();

	let sendData = async () => {
		for (let i = 0; i < productsList.length; i++) {
			await postMetaData(productsList[i].id)
			await sleep(500)
		}
	}

	let postMetaData = async (id) => {
		const updatePostMetaForFreeProduct = new URL('../../../includes/model/update_post_meta_for_free_product.php', import.meta.url).pathname
		axios.put(updatePostMetaForFreeProduct, null,{
			params: {
				id: id,
				value: "yes"
			}
		})
		.then(res => {
			sendingCounterList.push(res.data);
			sendingList = sendingCounterList.length !== productsList.length;
			popUpMessage = sendingList ? "updating list" : "list has updated";
			if (sendingList) {
				popUpMessage = `Mise à jour produit ${sendingCounterList.length} / ${productsList.length}`
				confirmButtonText = ""
				cancelButtonText = ""
			} else {
				popUpMessage = "list has sent"
				cancelButtonText = "Fermer";
				confirmButtonText = "";
			}
		})
	}

	// log element for post in mail
	let HTMLTable = () => {
		tableHTML = JSON.stringify(productsList)
	}

	onMount(async () => {
		await getDataFromOdDb();
		await initForm();
		await getCountProductsIntoWoo();
	})

</script>

<Tabs bind:activeTabValue={currentTab} items="{tabItems}"/>
{#if 1 === currentTab}
<section id="config">
	<PopUp 	close="{!openPopUp}"
		   	message="{popUpMessage}"
		   	cancelButton="{cancelButtonText}"
		   	confirmButton="{confirmButtonText}"
		   	action="{reMountThis}"
		  	loadingText="{loaderText}"
		   	confirmAction="{updateProductsPostMetaFromId, sendData}">
		<div class="overflow-scroll">
			<!--use inline style for sending in mail-->
			{#if (Array.isArray(productsList))}
			<table id="premium-list" style="font-family: arial, sans-serif; border-collapse: collapse; width: 100%;"
				   cellspacing="0" cellpadding="0" border="0">
				<tr style="border: 1px solid #dddddd; text-align: left;padding: 8px;">
					<th style="border: 1px solid #dddddd; text-align: left;padding: 8px;" font-weight="bold">ID</th>
					<th style="border: 1px solid #dddddd; text-align: left;padding: 8px;" font-weight="bold">Sku</th>
					<th style="border: 1px solid #dddddd; text-align: left;padding: 8px;" font-weight="bold">Name</th>
					<th style="border: 1px solid #dddddd; text-align: left;padding: 8px;" font-weight="bold"></th>
				</tr>
				{#each productsList as product}
				<tr style="border: 1px solid #dddddd; text-align: left;padding: 8px;">
					<td style="border: 1px solid #dddddd; text-align: left;padding: 8px;">{product.id}</td>
					<td style="border: 1px solid #dddddd; text-align: left;padding: 8px;">{product.sku}</td>
					<td style="border: 1px solid #dddddd; text-align: left;padding: 8px;">{product.name}</td>
					<td style="border: 1px solid #dddddd; text-align: left;padding: 8px;">{product.price}</td>
					<td style="border: 1px solid #dddddd; text-align: left;padding: 8px;"><a href="{product.url}" target="_blank">Voir le produit</a></td>
				</tr>
					{/each}
			</table>
			{/if}
		</div>
	</PopUp>
	{#if isValideForm}
		<Notification :isOk="{isValideForm}"/>
	{/if}
	<form>
		<div class="form">
			<div>
				<h3>products set</h3>
				<hr>
			</div>
			<div>
				<input type="checkbox" name="free" id="free" bind:checked={od_is_checkedFree}>
				<label for="free">Enable for all products initialized to 0.00 or no price! </label>
			</div>
			{#if (backend_odforfree_enabled)}
			<div>
				<button type="button" on:click={updateProductsPostMetaFromId}>mettre à jour</button>
			</div>
			{/if}
		</div>
		<div class="form">
			<div>
				<h3>send to</h3>
				<hr>
			</div>
			<div class="flex">
				<label for="mail">email</label>
				<input type="email" name="mail" id="mail" bind:value={od_mail}>
				{#if !isValidMail}
					<small style="color:#993300;">mail must contain "@" and "." something like that (com .fr .be etc)...</small>
					{:else}
					<!--NOTHING-->
				{/if}
			</div>
			<div class="flex">
				<label for="phone">phone</label>
				<input type="tel" name="phone" id="phone" bind:value={od_phone}>
				{#if !isValidPhone}
					<small style="color:#993300;">Phone number must be like that +33612131415 / 06121311415</small>
				{:else}
					<!--NOTHING-->
				{/if}
			</div>
			<div class="flex">
				<label for="delay">message delay response</label>
				<textarea name="delay" id="delay" cols="50" rows="10" bind:value={od_delay}></textarea>
				{#if !isValidMessage}
					<small style="color:#993300;">Message for your customers mustn't contain specials characters</small>
				{:else}
					<!--NOTHING-->
				{/if}
			</div>
		</div>
		<div>
			<button type="button" name="submit" id="submit" class="button button-primary" on:click={updateConfig}>Enregistrer les modifications</button>
		</div>
	</form>
</section>
{/if}

{#if 2 === currentTab}
	<div>
	<h2>Tableau de bord</h2>
	<div class="pagination">
		{#each productsListInDashboard as p, index}
			<span class="{currentpage === index ? 'current-page' : ''}"><a on:click={() => {currentpage = index}}> {index + 1}</a></span>
		{/each}
	</div>
	<table>
	{#await productsListInDashboard.length > 0}
		<p>Chargement de la liste ..."</p>
		{:then productListInDashboard}
	{#if Array.isArray(productsListInDashboard) && productsListInDashboard.length > 0}
		{#if (productsListInDashboardCount === 0)}
			...
		{:else}
			<p>Total: {productsListInDashboardCount}</p>
		{/if}
		{#each productsListInDashboard[currentpage] as productItem}
			<tr class="dashboard-product-item">
				<td>{productItem.id}</td>
				<td><img src="{productItem.image[0]}" width="100" height="100" alt=""></td>
				<td>{productItem.name}</td>
				<td>{productItem.sku}</td>
				<td><a href="{productItem.url}" target="_blank">Voir la fiche</a></td>
				<td><a href="{productItem.admin_url}" target="_blank">Editer le produit</a></td>
			</tr>
		{/each}
	{/if}
	{/await}
	</table>
	</div>
{/if}

<style>
	form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.flex{
		display: flex;
		gap: 16px;
		align-items: flex-end;
	}

	label {
		font-size: .9rem;
		width: 5%;
		text-transform: capitalize;
	}
	table {
		font-family: arial, sans-serif;
		border-collapse: collapse;
		width: 100%;
	}

	td, th {
		border: 1px solid #dddddd;
		text-align: left;
		padding: 8px;
	}

	tr:nth-child(even) {
		background-color: #dddddd;
	}
	.overflow-scroll {
		max-height: 250px;
		overflow-y: scroll;
	}
	.pagination {
		display: flex;
		gap: 16px;
		margin: 8px auto;
		width: 80%;
		flex-wrap: wrap;

	}
	.pagination > span {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		margin: auto;
		justify-content: center;
		cursor: pointer;
	}

	.pagination > span.current-page {
		border: 1px solid #5cb1f9;
		border-radius: 100%;
	}


</style>