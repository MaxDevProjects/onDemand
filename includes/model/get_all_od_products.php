<?php
$path = $_SERVER['DOCUMENT_ROOT'];
require_once $path . '/wp-config.php';

function get_list_of_od_products() {
    $per_page = 50;
    $list_of_od_products = array();
    $products = wc_get_products( array( 'status' => 'publish', 'posts_per_page' => $per_page,  'page' => $_GET["page"], 'meta_key' => 'on_demand', 'meta_value' => 'yes') );
    foreach ( $products as $product ){
            array_push($list_of_od_products, array('id' => $product->get_id(), 'name' => $product->get_name(), 'sku' => $product->get_sku(), 'price' => $product->get_price(),'image' => wp_get_attachment_image_src( get_post_thumbnail_id( $product->get_id() ), 'single-post-thumbnail' ),'url' => $product->get_permalink(), "admin_url" => get_admin_url() . '/post.php?post=' . $product->get_id() . '&action=edit' ));
    }

    echo json_encode($list_of_od_products);

}

get_list_of_od_products();