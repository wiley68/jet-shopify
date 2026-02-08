<?php

/**
 * Приложение за изпращане на имейли от заявки за кредит (ПБ Лични Финанси).
 * Посреща POST с jet_id, shop, items, данни от форма и връща JSON.
 * CORS: разрешава заявки от магазина (fetch от storefront).
 */

// Debug режим (PB_DEBUG) – при true при 403 причината се връща в JSON тялото. За production задай false.
define('PB_DEBUG', true);

header('Content-Type: application/json; charset=utf-8');

// CORS preflight – преди security, иначе OPTIONS ще получи 405
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 86400');
    http_response_code(204);
    exit;
}

header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'ok' => false,
        'error' => 'Method not allowed',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Четене на тялото веднъж
$contentType = $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
$handler = fopen('php://input', 'r');
$rawInput = $handler !== false ? stream_get_contents($handler) : '';
if ($handler !== false) {
    fclose($handler);
}
$rawInput = ($rawInput !== false) ? $rawInput : '';

$payload = [];
if ($rawInput !== '' && (strpos($contentType, 'application/json') !== false || strpos(trim($rawInput), '{') === 0)) {
    $decoded = json_decode($rawInput, true);
    if (is_array($decoded)) {
        $payload = $decoded;
    }
}
if ($payload === [] && $rawInput !== '') {
    parse_str($rawInput, $parsed);
    if (is_array($parsed)) {
        $payload = $parsed;
    }
}

// Нормализиране на стойности – trim за string полета
$trimStrings = function (array $data) use (&$trimStrings) {
    $out = [];
    foreach ($data as $k => $v) {
        if (is_string($v)) {
            $out[$k] = trim($v);
        } elseif (is_array($v)) {
            $out[$k] = $trimStrings($v);
        } else {
            $out[$k] = $v;
        }
    }
    return $out;
};
$payload = $trimStrings($payload);

require_once __DIR__ . '/security.php';
perform_security_checks($payload);

$response = ['ok' => true];
if (PB_DEBUG) {
    $response['debug'] = $payload;
}

require_once __DIR__ . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$body = "Данни за потребителя:\r\n";
$body .= "Собствено име: {$payload['jet-step2-firstname']};\r\n";
$body .= "Фамилия: {$payload['jet-step2-lastname']};\r\n";
$body .= "ЕГН: {$payload['jet-step2-egn']};\r\n";
$body .= "Телефон за връзка: {$payload['jet-step2-phone']};\r\n";
$body .= "Имейл адрес: {$payload['jet-step2-email']};\r\n\r\n";

if (isset($payload['items']) && is_array($payload['items']) && count($payload['items']) == 1) {
    $item = $payload['items'][0];
    $body .= "Данни за стоката:\r\n";
    $body .= "Тип стока: {$item['product_c_txt']};\r\n";
    $body .= "Марка: " . "({$item['jet_product_id']}) {$item['att_name']};\r\n";
    $body .= "Единична цена с ДДС: {$item['product_p_txt']};\r\n";
    $body .= "Брой стоки: {$item['jet_quantity']};\r\n";
    $body .= "Обща сума с ДДС: " . number_format((float) $item['product_p_txt'] * (int) $item['jet_quantity'], 2, '.', '') . ";\r\n\r\n";
}

if (isset($payload['jet_card']) && $payload['jet_card'] == true) {
    $body .= "Тип стока: Кредитна Карта;\r\n";
    $body .= "Марка: -;\r\n";
    $body .= "Единична цена с ДДС: 0.00;\r\n";
    $body .= "Брой стоки: 1;\r\n";
    $body .= "Обща сума с ДДС: 0.00;\r\n\r\n";
}

$body .= "Данни за кредита:\r\n";
$body .= "Размер на кредита: " . number_format((float) $item['product_p_txt'] - (float) $item['jet_parva'], 2, '.', '') . ";\r\n";
$body .= "Срок на изплащане в месеца: {$payload['jet_vnoski']};\r\n";
$body .= "Месечна вноска: {$payload['jet_vnoska']};\r\n";
$body .= "Първоначална вноска: " . number_format(floatval($payload['jet_parva']), 2, ".", "") . ";\r\n";

$subject = $payload['jet_id'] . ", онлайн заявка по поръчка " . 1;

$mail = new PHPMailer(true);
try {
    $mail->isSMTP();
    $mail->Host = 'mail.avalonbg.com';
    $mail->Port = 587;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->SMTPAuth = true;
    $mail->Username = 'home@avalonbg.com';
    $mail->Password = 'Z7F+?@GRNcC]';
    $mail->Subject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $mail->CharSet = 'UTF-8';
    $mail->Encoding = 'base64';
    $mail->setFrom($payload['jet_email_shop'], $payload['jet_id']);
    $mail->addAddress($payload['jet_email_pbpf']);
    $mail->addCC($payload['jet_email_shop']);
    $mail->addCC($payload['jet-step2-email']);
    $mail->Body = $body;
    $mail->isHTML(false);
    if ($mail->send()) {
        echo json_encode($response, JSON_UNESCAPED_UNICODE);
        exit;
    }
    $response['ok'] = false;
    $response['error'] = PB_DEBUG ? ('Failed to send email: ' . $mail->ErrorInfo) : 'Не можем да изпратим заявката към Банката.';
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
} catch (Exception $e) {
    $response['ok'] = false;
    $response['error'] = PB_DEBUG ? ('Failed to send email: ' . $e->getMessage()) : 'Не можем да изпратим заявката към Банката.';
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}
