# PHPMailer в този проект

## Инсталация

1. Увери се, че имаш [Composer](https://getcomposer.org/) (локално или на сървъра).
2. В папката `app/` изпълни:
   ```bash
   composer install
   ```
3. Ако получиш грешка за „Could not delete“ (антивирус/индексатор), затвори други програми и пусни отново `composer install`.

Ако на сървъра няма Composer, може да пуснеш `composer install` локално и да качиш цялата папка `app/` включително `vendor/` (тогава премахни `app/vendor/` от `.gitignore`, ако искаш да я комитваш).

## Използване в index.php

След като security проверките минат и имаш валиден `$payload`, зареждаш autoload и използваш PHPMailer:

```php
require_once __DIR__ . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

$mail = new PHPMailer(true);
try {
    $mail->CharSet = 'UTF-8';
    // SMTP (препоръчително) или mail()
    $mail->isSMTP();
    $mail->Host       = 'smtp.example.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = 'user@example.com';
    $mail->Password   = 'password';
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;

    $mail->setFrom($payload['jet_email_shop'] ?? 'noreply@example.com');
    $mail->addAddress($payload['jet_email_pbpf'] ?? 'pb@example.com');
    $mail->addReplyTo($payload['jet-step2-email'] ?? '');

    $mail->isHTML(true);
    $mail->Subject = 'Заявка за кредит – ' . ($payload['shop_domain'] ?? '');
    $mail->Body    = 'Име: ' . ($payload['jet-step2-firstname'] ?? '') . ' ' . ($payload['jet-step2-lastname'] ?? '') . '<br>...';

    $mail->send();
} catch (Exception $e) {
    // логване и/или връщане на грешка в JSON
}
```

Полетата за изпращане взимай от `$payload` (jet_email_pbpf, jet_email_shop, jet-step2-* и т.н.).
