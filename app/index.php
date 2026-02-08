<?php

/**
 * Приложение за изпращане на имейли от заявки за кредит (ПБ Лични Финанси).
 * Посреща POST с jet_id и връща JSON (за дебъг и последващо изпращане на мейл).
 * CORS: разрешава заявки от магазина (fetch от storefront).
 */

// Debug режим (PB_DEBUG) – при true при 403 причината се връща в JSON тялото; задай false за production
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
        'jet_id' => null,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Четене на тялото веднъж – нужни са jet_id и задължителни полета за security
$jetId = null;
$shopDomain = null;
$shopPermanentDomain = null;
$productId = null;
$contentType = $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
$handler = fopen('php://input', 'r');
$rawInput = $handler !== false ? stream_get_contents($handler) : '';
if ($handler !== false) {
    fclose($handler);
}
$rawInput = ($rawInput !== false) ? $rawInput : '';

if ($rawInput !== '' && (strpos($contentType, 'application/json') !== false || strpos(trim($rawInput), '{') === 0)) {
    $data = json_decode($rawInput, true);
    if (is_array($data)) {
        $jetId = isset($data['jet_id']) ? trim((string) $data['jet_id']) : null;
        $shopDomain = isset($data['shop_domain']) ? trim((string) $data['shop_domain']) : null;
        $shopPermanentDomain = isset($data['shop_permanent_domain']) ? trim((string) $data['shop_permanent_domain']) : null;
        $productId = isset($data['product_id']) ? trim((string) $data['product_id']) : null;
    }
}
if ($jetId === null && isset($_POST['jet_id'])) {
    $jetId = trim((string) $_POST['jet_id']);
}
if ($shopDomain === null && isset($_POST['shop_domain'])) {
    $shopDomain = trim((string) $_POST['shop_domain']);
}
if ($shopPermanentDomain === null && isset($_POST['shop_permanent_domain'])) {
    $shopPermanentDomain = trim((string) $_POST['shop_permanent_domain']);
}
if ($productId === null && isset($_POST['product_id'])) {
    $productId = trim((string) $_POST['product_id']);
}
if ($jetId === null && $rawInput !== '') {
    parse_str($rawInput, $parsed);
    if (isset($parsed['jet_id'])) {
        $jetId = trim((string) $parsed['jet_id']);
    }
    if ($shopDomain === null && isset($parsed['shop_domain'])) {
        $shopDomain = trim((string) $parsed['shop_domain']);
    }
    if ($shopPermanentDomain === null && isset($parsed['shop_permanent_domain'])) {
        $shopPermanentDomain = trim((string) $parsed['shop_permanent_domain']);
    }
    if ($productId === null && isset($parsed['product_id'])) {
        $productId = trim((string) $parsed['product_id']);
    }
}

require_once __DIR__ . '/security.php';
perform_security_checks($jetId, $shopDomain, $shopPermanentDomain, $productId);

$response = [
    'ok' => true,
    'jet_id' => $jetId,
    'shop_domain' => $shopDomain,
    'shop_permanent_domain' => $shopPermanentDomain,
    'product_id' => $productId,
];
if (PB_DEBUG) {
    $response['debug'] = [
        'jet_id' => $jetId,
        'shop_domain' => $shopDomain,
        'shop_permanent_domain' => $shopPermanentDomain,
        'product_id' => $productId,
    ];
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
