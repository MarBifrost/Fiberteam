<?php
// 1. სესიის ჩართვა ბოტებისგან თავდასაცავად (Rate Limiting)
session_start();

// დავაწესოთ ლიმიტი წამებში (მაგალითად, 120 წამი = 2 წუთი ფორმის გაგზავნებს შორის)
define('SUBMISSION_LIMIT', 120);

header("Content-Type: application/json; charset=UTF-8");

// მივიღოთ JSON მონაცემები JavaScript-იდან
$data = json_decode(file_get_contents("php://input"), true);

if ($_SERVER["REQUEST_METHOD"] == "POST" && !empty($data)) {
    
    // 🛑 ა) სპამ-ბოტების Rate Limit შემოწმება
    if (isset($_SESSION['last_submission_time'])) {
        $time_passed = time() - $_SESSION['last_submission_time'];
        if ($time_passed < SUBMISSION_LIMIT) {
            $time_left = SUBMISSION_LIMIT - $time_passed;
            http_response_code(429); // Too Many Requests
            echo json_encode([
                "status" => "error", 
                "message" => "Too many requests. Please wait " . $time_left . " seconds before trying again."
            ]);
            exit;
        }
    }

    // 🛑 ბ) Anti-Spam Honeypot შემოწმება
    if (!empty($data["_honey"])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Spam detected."]);
        exit;
    }

    // 🛡️ გ) მონაცემების მკაცრი გაწმენდა XSS ინექციებისგან
    $name = htmlspecialchars(strip_tags(trim($data["name"] ?? "")), ENT_QUOTES, 'UTF-8');
    $email = filter_var(trim($data["email"] ?? ""), FILTER_VALIDATE_EMAIL);
    $phone = htmlspecialchars(strip_tags(trim($data["phone"] ?? "")), ENT_QUOTES, 'UTF-8');
    $company = htmlspecialchars(strip_tags(trim($data["company"] ?? "")), ENT_QUOTES, 'UTF-8');
    $service = htmlspecialchars(strip_tags(trim($data["service_type"] ?? "")), ENT_QUOTES, 'UTF-8');
    
    // შეტყობინება შეიძლება შეიცავდეს მრავალ ხაზს, ამიტომ კარგად დავაზღვიოთ
    $message = htmlspecialchars(trim($data["message"] ?? ""), ENT_QUOTES, 'UTF-8');

   //დ) სავალდებულო ველებისა და მეილის ფორმატის ვალიდაცია
    if (empty($name) || !$email || empty($service) || empty($message)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Please fill all required fields with valid data."]);
        exit;
    }

    // 📬 ე) მიმღები ელ-ფოსტა (შეცვალე შენი რეალური დომენის მეილით Hostinger-ზე)
    $to = "info@fiberteam.com"; 
    
    // წერილის სათაური
    $subject = "New Quote Request from " . $name;

    // წერილის შიგთავსი (HTML ფორმატში)
    $email_content = "
    <html>
    <head>
        <title>FiberTeam - New Quote Request</title>
    </head>
    <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f6f9; padding: 20px;'>
        <div style='max-width: 600px; margin: 0 auto; padding: 30px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);'>
            <h2 style='color: #0066ff; border-bottom: 2px solid #0066ff; padding-bottom: 12px; margin-top: 0; font-size: 20px; text-transform: uppercase;'>New Project Quote Request</h2>
            <p style='margin: 14px 0;'><strong>Full Name:</strong> {$name}</p>
            <p style='margin: 14px 0;'><strong>Email:</strong> {$email}</p>
            <p style='margin: 14px 0;'><strong>Phone:</strong> " . ($phone ? $phone : 'Not provided') . "</p>
            <p style='margin: 14px 0;'><strong>Company:</strong> " . ($company ? $company : 'Not provided') . "</p>
            <p style='margin: 14px 0;'><strong>Requested Service:</strong> <span style='color: #0066ff; font-weight: bold;'>{$service}</span></p>
            <h3 style='color: #4a5568; margin-top: 24px; font-size: 14px; text-transform: uppercase;'>Project Description & Scope:</h3>
            <p style='background: #f7fafc; padding: 15px; border-left: 4px solid #0066ff; border-radius: 4px; white-space: pre-wrap; color: #2d3748;'>{$message}</p>
        </div>
    </body>
    </html>
    ";

    // ჰედერები HTML მეილის სწორად გაგზავნისთვის
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    
    // ⚠️ მნიშვნელოვანია: From-ში უნდა ეწეროს შენივე დომენის მეილი (მაგალითად noreply@fiberteam.com)
    $headers .= "From: FiberTeam Website <noreply@fiberteam.com>" . "\r\n";
    $headers .= "Reply-To: {$email}" . "\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";

    // მეილის გაგზავნა
    if (mail($to, $subject, $email_content, $headers)) {
        
        // 📅 წარმატებული გაგზავნისას ვიმახსოვრებთ დროს სესიაში ტაიმერისთვის
        $_SESSION['last_submission_time'] = time();

        http_response_code(200);
        echo json_encode(["status" => "success", "message" => "Your request has been sent successfully!"]);
    } else {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Server error. Direct mail delivery failed."]);
    }
} else {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Access denied."]);
}