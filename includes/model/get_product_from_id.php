<?php

$path = $_SERVER['DOCUMENT_ROOT'];
require_once $path . '/wp-config.php';
global $wpdb;

$product = wc_get_product($_GET["id"]);

$image_id  = $product->get_image_id();
$image_url = wp_get_attachment_image_url( $image_id, 'full' );
$result = array(
    id => $product->get_id(),
    name => $product->get_name(),
    sku=> $product->get_sku(),
    image => $image_url,
    url => $product->get_permalink()
);
echo json_encode($result);
