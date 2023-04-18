<?php
$path = $_SERVER['DOCUMENT_ROOT'];
require_once $path . '/wp-config.php';

//user posted variables
$email = $_GET["user_email"];
$adminMail = $_GET["admin_mail"];
$list  = $_GET["products_list"];
$parsedList = preg_replace('/\\\\/', '', $list);

$html = '<!DOCTYPE html>
<html lang="en" xmlns="http://m.w3.org/1999/xhtml" xmlns:v="unr:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="viewport" content="width=device-width" />
    <title>Document</title>
</head>
<body>
<tbody>';

// mail to listing products at 0 / only for premium (control this after licenses)
//$html .= str_replace("\\", "", $table);
$html .=
    '<table id="premium-list" style="font-family: arial, sans-serif; border-collapse: collapse; width: 100%;"
               cellspacing="0" cellpadding="0" border="0">
            <tr style="border: 1px solid #dddddd; text-align: left;padding: 8px;">
                <th style="border: 1px solid #dddddd; text-align: left;padding: 8px;" font-weight="bold">ID</th>';
    if ($parsedList) {
        $html .= '<th style="border: 1px solid #dddddd; text-align: left;padding: 8px;" font-weight="bold">Image</th>';
    }
                $html .= '<th style="border: 1px solid #dddddd; text-align: left;padding: 8px;" font-weight="bold">Sku</th>
                <th style="border: 1px solid #dddddd; text-align: left;padding: 8px;" font-weight="bold">Name</th>
                <th style="border: 1px solid #dddddd; text-align: left;padding: 8px;" font-weight="bold"></th>
            </tr>';
?>
<?php

foreach (json_decode($parsedList, true) as $item) {
    $html .=
        '<tr style="border: 1px solid #dddddd; text-align: left;padding: 8px;">
            <td style="border: 1px solid #dddddd; text-align: left;padding: 8px;">' . $item["id"] . '</td>
            <td style="border: 1px solid #dddddd; text-align: left;padding: 8px;"><img src =' . $item["image"] . ' alt=' . 'image de ' . $item["name"] . ' width="64" height="64"/></td>
            <td style="border: 1px solid #dddddd; text-align: left;padding: 8px;">' . $item["sku"] . '</td>
            <td style="border: 1px solid #dddddd; text-align: left;padding: 8px;">' . $item["name"] . '</td>
            <td style="border: 1px solid #dddddd; text-align: left;padding: 8px;"><a href=' . $item["url"] . ' target="_blank">Voir le produit</a></td>
        </tr>';
}

$html .= '</table>';

$html .= '
</tbody>
</body>
</html>'
;

//php mailer variables
$to = $adminMail;
$subject = "Liste des produits sur demande";
// To send HTML mail, the Content-type header must be set
$headers  = 'MIME-Version: 1.0' . "\r\n";
$headers .= 'Content-type: text/html; charset=iso-8859-1' . "\r\n";

// Create email headers
$headers .= 'From: '. $adminMail . "\r\n".
    'Reply-To: '. $email ."\r\n" .
    'X-Mailer: PHP/' . phpversion();

echo $html;

//Here put your Validation and send mail
$sent = wp_mail($to, $subject, $html, $headers);
if($sent) {
    echo $parsedList;
}//message sent!

echo "admin: " . $adminMail . ", user:" . $email;