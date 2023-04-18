<?php
$path = $_SERVER['DOCUMENT_ROOT'];
require_once $path . '/wp-config.php';

function setDefaultData() {
    global $wpdb;

    $table_name = $wpdb->prefix . 'on_demand';

    $wpdb->insert(
        $table_name,
        array(
            'forfree' => '0',
            'email' => 'entrez.votre@mail.ici',
            'phone' => '0212233445',
            'messagedelay' => 'Tapez le message que vos client verrons ici sans caracteres speciaux',
        )
    );
}