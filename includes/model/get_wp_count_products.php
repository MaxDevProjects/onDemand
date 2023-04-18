<?php
$path = $_SERVER['DOCUMENT_ROOT'];
require_once $path . '/wp-config.php';
$count_posts = wp_count_posts( 'product' );
echo $count_posts->publish;