<?php

/*
 * default position of on demand list widget
 */
add_action( 'wp_body_open', 'init_on_demand', 61 );

/*
 * Add my new menu to the Admin Control Panel
 */
add_action( 'admin_menu', 'od_Add_Admin_Link' );
// Add a new top level menu link to the ACP
function od_Add_Admin_Link()
{
    add_menu_page(
        'on Demand - for woocommerce', // Title of the page
        'on Demand - for woocommerce', // Text to show on the menu link
        'manage_options', // Capability requirement to see the link
        'ondemand/includes/od_config_page.php' // The 'slug' - file to display when clicking the link
    );
}
