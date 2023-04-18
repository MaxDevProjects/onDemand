<?php

$path = $_SERVER['DOCUMENT_ROOT'];
require_once $path . '/wp-config.php';

global $wpdb;

$table_name = $wpdb->prefix . 'on_demand';

$result = $wpdb->get_results('SELECT * FROM ' . $table_name . ' ORDER BY id DESC');

echo json_encode($result);