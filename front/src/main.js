import App from './App.svelte';

const app = new App({
	target: document.getElementById('on-demand'),
	props: {
		name: 'world'
	}
});

export default app;