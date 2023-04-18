<?php
//require_once('model/manage_free_products.php');
function content_admin() {
    echo '<div class="wrap">';
    echo '<h1>On demand - for woocommerce</h1>';
    echo '<div id="on-demand-admin"></div>';
}
function init_on_demand_admin_page()
{
    if (storefront_is_woocommerce_activated()) {
        wp_enqueue_style('on_demand_back_style', plugin_dir_url(__DIR__) . 'back/public/build/bundle.css');
        wp_enqueue_script('on_demand_back', plugin_dir_url(__DIR__) . 'back/public/build/bundle.js', [], 1.0, true);
    }
}


content_admin();
init_on_demand_admin_page();


