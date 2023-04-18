<?php

global $version_db;
$version_db = '1.0';

include_once plugin_dir_path(__FILE__) . 'includes/model/set_data_od_db.php';
/**
 * Method od_install
 *
 * @return void
 */
function od_install()
{
    global $wpdb;
    global $version_db;
    $installed_ver = get_option('version_db');
    if ($installed_ver != $version_db) {
        //create condition to manage plugin's version
        $table_name = $wpdb->prefix . 'on_demand';

        $sql = "CREATE TABLE IF NOT EXISTS $table_name (
        id MEDIUMINT(9) NOT NULL AUTO_INCREMENT,
        forfree BOOLEAN DEFAULT false,
        email VARCHAR(255) DEFAULT '',
        phone VARCHAR(255) DEFAULT '',
        messagedelay TEXT DEFAULT '',
        PRIMARY KEY (id)
    )";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        update_option('version_db', $version_db);

        setDefaultData();
    }
}

/**
 * Method odPlugin_update_db_check
 *
 * @return void
 */
function odPlugin_update_db_check()
{
    global $version_db;
    if (get_site_option('version_db') != $version_db) {
        od_install();
    }
}

add_action('plugins_loaded', 'odPlugin_update_db_check');
