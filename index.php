<?php

/*
Plugin Name: ondemand - for woocommerce
Plugin URI: https://mon-siteweb.com/
Description: Ceci est mon premier plugin
Author: Clower Web Conception - Maxime G. Martin
Version: 1.0
Author URI: https://clower.fr/
*/

require_once plugin_dir_path(__FILE__) . 'includes/od_functions.php';
require_once plugin_dir_path(__FILE__) . 'includes/od_woocommerce_single_product_meta_data.php';
include_once plugin_dir_path(__FILE__) . 'includes/model/create_od_db.php';
register_activation_hook(__FILE__, 'od_install');

function init_on_demand()
{
    if (storefront_is_woocommerce_activated()) {
        wp_enqueue_style('on_demand_front_style', plugin_dir_url(__FILE__) . 'front/public/build/bundle.css');
        echo '<div id="on-demand"></div>';
        wp_enqueue_script('on_demand_front', plugin_dir_url(__FILE__) . 'front/public/build/bundle.js');
    }
}
