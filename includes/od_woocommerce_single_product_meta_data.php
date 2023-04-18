<?php

/*************************************************************************************************
 * On enregistre les valeurs de on_demande pour le produit courant
 *************************************************************************************************/
function msk_save_on_demand_product_fields($post_id) {
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
        $on_demand = isset( $_POST['on_demand'] ) ? 'yes' : 'no';
        update_post_meta( $post_id, 'on_demand', $on_demand );
}

function msk_add_on_demand_field_data() {
    echo '<div>';
    echo '<h4>Produit "à la demande"</h4>';
    // Champ de type checkbox
    woocommerce_wp_checkbox(
        array(
            'id' => 'on_demand',
            'label' => __('ce produit est "à la demande"', 'msk'),
        )
    );
    echo '</div>';
}

/**
 * Override loop template add to cart buttons to "on demand"
 */

add_filter( 'woocommerce_loop_add_to_cart_link', 'woocommerce_on_demand_product', 10, 2 );
function woocommerce_on_demand_product($html, $product ) {
    if ( get_post_meta($product->get_id(), 'on_demand', true) == "yes"  ) {
        $html = '<a data-product_id="' . $product->get_id() . '" class="button on_demand_product">' . __('Sur demande', 'on_demand') . '</a>';

    }
    return $html;
}

function od_product_priceless() {
    global $product;
    if (get_post_meta($product->get_id(), 'on_demand', true) == "yes" ) {
        return '';
    }
    else {
        return wc_price($product->get_price());
    }
}
// remove button add to pan if product is on demand
add_filter( 'woocommerce_is_purchasable', 'woocommerce_hide_add_to_cart_button', 10, 2 );
function woocommerce_hide_add_to_cart_button( $is_purchasable = true, $product ) {
    if ( get_post_meta($product->get_id(), 'on_demand', true) == "yes" ) {
        //replace by on demand button
        add_action('woocommerce_single_product_summary', 'woocommerce_show_add_to_on_demand_button', 30);
    }
    return ( get_post_meta($product->get_id(), 'on_demand', true) == "yes" ? false : $is_purchasable );
}

function woocommerce_show_add_to_on_demand_button() {
    global $product;
    echo '<a data-product_id="' . $product->get_id() . '" class="button on_demand_product">' . __('Sur demande', 'on_demand') . '</a>';
}

add_filter( 'woocommerce_get_price_html', 'od_product_priceless', 10, 2 );
add_action( 'woocommerce_process_product_meta', 'msk_save_on_demand_product_fields' );
add_action('woocommerce_product_options_general_product_data', 'msk_add_on_demand_field_data');

