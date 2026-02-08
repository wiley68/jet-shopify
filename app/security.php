<?php

/**
 * Security checks за ПБ Лични Финанси API.
 * Приема само POST с JSON от браузър (Origin/Referer), HTTPS, GeoIP (България), rate limit по IP и по jet_id.
 */

/**
 * Изпълнява всички проверки за сигурност.
 *
 * @param string|null $jetId jet_id от тялото на заявката (за rate limit по магазин)
 */
function perform_security_checks(?string $jetId = null): void
{
    // 1. Само POST (OPTIONS се обработва в index.php преди извикването тук)
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        exit;
    }

    // 2. HTTPS – блокирай незашифрован достъп
    $isHttps = false;
    if (isset($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off') {
        $isHttps = true;
    } elseif (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https') {
        $isHttps = true;
    } elseif (isset($_SERVER['SERVER_PORT']) && (int) $_SERVER['SERVER_PORT'] === 443) {
        $isHttps = true;
    }

    if (!$isHttps) {
        http_response_code(403);
        exit('HTTPS required');
    }

    // 3. Origin или Referer – заявки от браузър (CORS) ги изпращат
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    if (empty($origin) && empty($referer)) {
        http_response_code(403);
        exit('Origin or Referer required');
    }

    // 4. Блокиране на ботове/сканери по User-Agent
    if (is_bot_user_agent()) {
        http_response_code(403);
        exit('Access denied');
    }

    // 5. GeoIP – само заявки от България (Cloudflare / MaxMind / ipapi.co)
    require_once __DIR__ . '/geoip.php';
    $ip = get_client_ip();
    if (!is_ip_from_bulgaria($ip)) {
        http_response_code(403);
        exit('Access denied');
    }

    // 6. Rate limiting по IP
    if (!rl_check('ip_' . $ip, 60, 60)) { // 60 заявки/минута на IP
        http_response_code(429);
        header('Retry-After: 60');
        exit('Too many requests');
    }

    // 7. Rate limiting по jet_id (идентификатор на магазина)
    if ($jetId !== null && $jetId !== '') {
        if (!rl_check('jet_' . $jetId, 120, 60)) { // 120 заявки/минута на магазин
            http_response_code(429);
            header('Retry-After: 60');
            exit('Too many requests');
        }
    }
}

/**
 * Дали User-Agent е бот/сканер.
 */
function is_bot_user_agent(): bool
{
    $ua = strtolower($_SERVER['HTTP_USER_AGENT'] ?? '');

    if (empty($ua)) {
        return true;
    }

    $botPatterns = [
        'bot',
        'crawler',
        'spider',
        'scraper',
        'curl',
        'wget',
        'python',
        'java',
        'perl',
        'ruby',
        'go-http',
        'scrapy',
        'mechanize',
        'headless',
        'phantom',
        'selenium',
        'webdriver',
        'postman',
        'insomnia',
        'apache-httpclient',
        'okhttp',
        'libwww-perl',
        'masscan',
        'nmap',
        'nikto',
        'sqlmap',
        'dirbuster',
        'gobuster',
        'burp',
        'zap',
        'nessus',
        'openvas',
        'acunetix',
        'netsparker',
        'appscan',
        'qualys',
        'rapid7',
        'metasploit',
        'havij',
        'pangolin',
        'sqlsus',
        'sqlninja',
        'w3af',
        'skipfish',
        'wapiti',
        'arachni',
        'lynx',
        'links',
        'w3m'
    ];

    foreach ($botPatterns as $pattern) {
        if (strpos($ua, $pattern) !== false) {
            return true;
        }
    }

    $validBrowsers = ['mozilla', 'chrome', 'safari', 'edge', 'firefox', 'opera', 'msie'];
    foreach ($validBrowsers as $browser) {
        if (strpos($ua, $browser) !== false) {
            return false;
        }
    }

    return true;
}

/**
 * Rate limit по ключ – файлово съхранение.
 * @param string $key Напр. 'ip_1.2.3.4'
 * @param int $limit Макс. заявки в прозореца
 * @param int $windowSeconds Прозорец в секунди
 * @return bool true ако е под лимита
 */
function rl_check(string $key, int $limit, int $windowSeconds = 60): bool
{
    $dir = __DIR__ . '/ratelimit';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }

    $safeKey = preg_replace('/[^A-Za-z0-9_\-.]/', '_', $key);
    $file = $dir . '/rl_' . $safeKey . '.txt';
    $now = time();
    $start = $now;
    $count = 0;

    $fh = @fopen($file, 'c+');
    if ($fh === false) {
        return true;
    }

    if (flock($fh, LOCK_EX)) {
        $data = stream_get_contents($fh);
        if ($data !== false && $data !== '') {
            $parts = array_pad(explode('|', trim($data), 2), 2, 0);
            $storedStart = (int) $parts[0];
            $storedCount = (int) $parts[1];
            if ($now - $storedStart < $windowSeconds) {
                $start = $storedStart;
                $count = $storedCount;
            }
        }

        $count++;

        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, $start . '|' . $count);
        fflush($fh);
        flock($fh, LOCK_UN);
    }
    fclose($fh);

    return $count <= $limit;
}
