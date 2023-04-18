<?php
$path = $_SERVER['DOCUMENT_ROOT'];
require_once $path . '/wp-config.php';

$list_of_free = array();
$products = wc_get_products( array( 'status' => 'publish', 'page' => $_GET['page'], 'limit' => 500, 'price' => " ", 'meta_key' => 'on_demand', 'meta_compare' => "NOT EXISTS", 'meta_value' => '' ) );
foreach ( $products as $product ){
    array_push($list_of_free, array('id' => $product->get_id(), 'name' => $product->get_name(), 'sku' => $product->get_sku(), 'price' => $product->get_price() , 'url' => $product->get_permalink() ));
}
echo json_encode($list_of_free);