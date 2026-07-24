<?php
/* ZeroPoint contact handler — xneelo/cPanel compatible.
   Accepts JSON { name, email, message }, returns JSON { ok, error? }.
   Set $TO to the real inbox before deploy. */

header("Content-Type: application/json");

$TO      = "hello@zeropoint.africa";      // <-- confirm destination inbox
$SUBJECT = "New enquiry — zeropoint.africa";
$FROM    = "website@zeropoint.africa";     // must be a domain-hosted address on xneelo

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  http_response_code(405);
  echo json_encode(["ok" => false, "error" => "method"]);
  exit;
}

$raw  = file_get_contents("php://input");
$data = json_decode($raw, true);
if (!is_array($data)) { $data = $_POST; }

$name    = trim($data["name"]    ?? "");
$email   = trim($data["email"]   ?? "");
$message = trim($data["message"] ?? "");

if ($name === "" || $message === "" || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
  http_response_code(422);
  echo json_encode(["ok" => false, "error" => "validation"]);
  exit;
}

// strip header-injection attempts
$safeName = preg_replace('/[\r\n]+/', " ", $name);
$body =
  "New enquiry from the ZeroPoint website\n\n" .
  "Name:    {$safeName}\n" .
  "Email:   {$email}\n\n" .
  "Message:\n{$message}\n";

$headers  = "From: {$FROM}\r\n";
$headers .= "Reply-To: {$email}\r\n";
$headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

$sent = @mail($TO, $SUBJECT, $body, $headers);

if ($sent) {
  echo json_encode(["ok" => true]);
} else {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => "send"]);
}
