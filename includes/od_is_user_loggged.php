<?php
$path = $_SERVER['DOCUMENT_ROOT'];
require_once $path . '/wp-config.php';
$user = wp_get_current_user();
$userExist = json_encode($user->exists());
if ($userExist) {
    echo json_encode($user->user_email);
} else {
    echo $userExist;
}
