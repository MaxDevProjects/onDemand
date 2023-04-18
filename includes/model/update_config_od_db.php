<?php
$path = $_SERVER['DOCUMENT_ROOT'];
require_once $path . '/wp-config.php';
function updateConfig() {
    global $wpdb;

    $table_name = $wpdb->prefix . 'on_demand';

    $wpdb->update(
        $table_name,
        array(
            'forfree' => $_GET['free'],
            'email' => $_GET['mail'],
            'phone' => $_GET['phone'],
            'messagedelay' => $_GET['delay'],
        ),
        array('id' => 1)
    );
}

updateConfig();