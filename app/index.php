<?php

/**
 * Приложение за изпращане на имейли от заявки за кредит (ПБ Лични Финанси).
 * Посреща POST с jet_id и връща JSON (за дебъг и последващо изпращане на мейл).
 * CORS: разрешава заявки от магазина (fetch от storefront).
 */

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

// Четене на тялото веднъж – нужен е jet_id за rate limit в security
$jetId = null;
$contentType = $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
$handler = fopen('php://input', 'r');
$rawInput = $handler !== false ? stream_get_contents($handler) : '';
if ($handler !== false) {
    fclose($handler);
}
$rawInput = ($rawInput !== false) ? $rawInput : '';

if ($rawInput !== '' && (strpos($contentType, 'application/json') !== false || strpos(trim($rawInput), '{') === 0)) {
    $data = json_decode($rawInput, true);
    if (is_array($data) && isset($data['jet_id'])) {
        $jetId = trim((string) $data['jet_id']);
    }
}
if ($jetId === null && isset($_POST['jet_id'])) {
    $jetId = trim((string) $_POST['jet_id']);
}
if ($jetId === null && $rawInput !== '') {
    parse_str($rawInput, $parsed);
    if (isset($parsed['jet_id'])) {
        $jetId = trim((string) $parsed['jet_id']);
    }
}

require_once __DIR__ . '/security.php';
perform_security_checks($jetId);

$response = [
    'ok' => true,
    'jet_id' => $jetId,
];

echo json_encode($response, JSON_UNESCAPED_UNICODE);
