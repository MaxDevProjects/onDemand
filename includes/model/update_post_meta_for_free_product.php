<?php
$path = $_SERVER['DOCUMENT_ROOT'];
require_once $path . '/wp-config.php';
function updateProductById() {
    update_post_meta( $_GET['id'], 'on_demand', $_GET['value'] );
}
updateProductById();
