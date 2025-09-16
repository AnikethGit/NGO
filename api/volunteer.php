<?php
/**
 * PRODUCTION Volunteer API - Sai Seva Foundation
 * Handles volunteer-specific functionality and data management
 * 
 * @version 1.0.0
 * @author Sai Seva Foundation Development Team
 */

// Start session if not already active
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Load environment configuration
if (file_exists('../.env')) {
    $lines = file('../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value);
        }
    }
}

// Set production headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_ENV['BASE_URL'] ?? 'https://sadgurubharadwaja.org'));
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Production error handling
ini_set('display_errors', $_ENV['DISPLAY_ERRORS'] ?? '0');
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Include required files
require_once '../includes/database.php';
require_once '../includes/functions.php';

try {
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
    // Check authentication
    if (!isAuthenticated() || getUserType() !== 'volunteer') {
        response(['error' => 'Unauthorized access'], 401);
    }
    
    // Rate limiting check
    if (!checkRateLimit($_SERVER['REMOTE_ADDR'], 'volunteer_api')) {
        response(['error' => 'Too many requests. Please try again later.'], 429);
    }
    
    // Log API access
    logEvent('INFO', "Volunteer API accessed: {$action} from IP: {$_SERVER['REMOTE_ADDR']}");
    
    switch ($action) {
        case 'stats':
            handleGetStats();
            break;
            
        case 'recent_activities':
            handleGetRecentActivities();
            break;
            
        case 'upcoming_events':
            handleGetUpcomingEvents();
            break;
            
        case 'activities':
            handleGetActivities();
            break;
            
        case 'events':
            handleGetEvents();
            break;
            
        case 'schedule':
            handleGetSchedule();
            break;
            
        case 'training':
            handleGetTraining();
            break;
            
        case 'hours':
            handleGetHours();
            break;
            
        case 'certificates':
            handleGetCertificates();
            break;
            
        case 'log_activity':
            handleLogActivity();
            break;
            
        case 'register_event':
            handleRegisterEvent();
            break;
            
        case 'update_profile':
            handleUpdateProfile();
            break;
            
        case 'update_availability':
            handleUpdateAvailability();
            break;
            
        default:
            response(['error' => 'Invalid action specified'], 400);
    }
    
} catch (Exception $e) {
    logEvent('ERROR', 'Volunteer API Error: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());
    response(['error' => 'Volunteer service temporarily unavailable'], 500);
}

/**
 * Get volunteer statistics
 */
function handleGetStats() {
    $volunteerId = getUserId();
    
    try {
        $db = Database::getInstance();
        
        // Get total hours
        $totalHours = $db->fetchOne(
            "SELECT COALESCE(SUM(hours), 0) as total FROM volunteer_activities WHERE volunteer_id = ?",
            [$volunteerId]
        )['total'];
        
        // Get events attended
        $eventsAttended = $db->fetchOne(
            "SELECT COUNT(*) as count FROM event_registrations 
             WHERE volunteer_id = ? AND status = 'attended'",
            [$volunteerId]
        )['count'];
        
        // Get people helped (estimate based on activities)
        $peopleHelped = $db->fetchOne(
            "SELECT COALESCE(SUM(people_served), 0) as total 
             FROM volunteer_activities WHERE volunteer_id = ?",
            [$volunteerId]
        )['total'];
        
        // Get achievements
        $achievements = $db->fetchOne(
            "SELECT COUNT(*) as count FROM volunteer_achievements WHERE volunteer_id = ?",
            [$volunteerId]
        )['count'];
        
        response([
            'success' => true,
            'stats' => [
                'total_hours' => $totalHours,
                'events_attended' => $eventsAttended,
                'people_helped' => $peopleHelped,
                'achievements' => $achievements
            ]
        ]);
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Error getting volunteer stats: ' . $e->getMessage());
        response(['error' => 'Failed to load statistics'], 500);
    }
}

/**
 * Get recent activities
 */
function handleGetRecentActivities() {
    $volunteerId = getUserId();
    
    try {
        $db = Database::getInstance();
        
        $activities = $db->fetchAll(
            "SELECT va.*, vt.name as activity_name 
             FROM volunteer_activities va 
             LEFT JOIN volunteer_activity_types vt ON va.activity_type = vt.code
             WHERE va.volunteer_id = ? 
             ORDER BY va.date DESC 
             LIMIT 5",
            [$volunteerId]
        );
        
        $formattedActivities = array_map(function($activity) {
            return [
                'id' => $activity['id'],
                'title' => $activity['activity_name'] ?: $activity['description'],
                'description' => $activity['description'],
                'date' => $activity['date'],
                'hours' => $activity['hours'],
                'status' => $activity['status'],
                'location' => $activity['location']
            ];
        }, $activities);
        
        response([
            'success' => true,
            'activities' => $formattedActivities
        ]);
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Error getting recent activities: ' . $e->getMessage());
        response(['error' => 'Failed to load recent activities'], 500);
    }
}

/**
 * Get upcoming events
 */
function handleGetUpcomingEvents() {
    $volunteerId = getUserId();
    
    try {
        $db = Database::getInstance();
        
        $events = $db->fetchAll(
            "SELECT e.*, 
                    CASE WHEN er.id IS NOT NULL THEN 1 ELSE 0 END as registered
             FROM events e 
             LEFT JOIN event_registrations er ON e.id = er.event_id AND er.volunteer_id = ?
             WHERE e.date >= CURDATE() AND e.status = 'active'
             ORDER BY e.date ASC 
             LIMIT 5",
            [$volunteerId]
        );
        
        response([
            'success' => true,
            'events' => $events
        ]);
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Error getting upcoming events: ' . $e->getMessage());
        response(['error' => 'Failed to load upcoming events'], 500);
    }
}

/**
 * Get all activities
 */
function handleGetActivities() {
    $volunteerId = getUserId();
    
    try {
        $db = Database::getInstance();
        
        $activities = $db->fetchAll(
            "SELECT va.*, vt.name as activity_name 
             FROM volunteer_activities va 
             LEFT JOIN volunteer_activity_types vt ON va.activity_type = vt.code
             WHERE va.volunteer_id = ? 
             ORDER BY va.date DESC",
            [$volunteerId]
        );
        
        response([
            'success' => true,
            'activities' => $activities
        ]);
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Error getting activities: ' . $e->getMessage());
        response(['error' => 'Failed to load activities'], 500);
    }
}

/**
 * Get all events
 */
function handleGetEvents() {
    $volunteerId = getUserId();
    
    try {
        $db = Database::getInstance();
        
        $events = $db->fetchAll(
            "SELECT e.*, 
                    CASE WHEN er.id IS NOT NULL THEN 1 ELSE 0 END as registered,
                    er.status as registration_status
             FROM events e 
             LEFT JOIN event_registrations er ON e.id = er.event_id AND er.volunteer_id = ?
             WHERE e.status = 'active'
             ORDER BY e.date ASC",
            [$volunteerId]
        );
        
        response([
            'success' => true,
            'events' => $events
        ]);
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Error getting events: ' . $e->getMessage());
        response(['error' => 'Failed to load events'], 500);
    }
}

/**
 * Log volunteer activity
 */
function handleLogActivity() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        response(['error' => 'Method not allowed'], 405);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input)) {
        response(['error' => 'No data received'], 400);
    }
    
    // Validate CSRF token
    if (empty($input['csrf_token']) || $input['csrf_token'] !== ($_SESSION['csrf_token'] ?? '')) {
        logEvent('WARNING', 'CSRF token validation failed for activity log from IP: ' . $_SERVER['REMOTE_ADDR']);
        response(['error' => 'Invalid security token'], 403);
    }
    
    $volunteerId = getUserId();
    
    // Validate input data
    $errors = validateActivityData($input);
    if (!empty($errors)) {
        response(['error' => implode('. ', $errors)], 400);
    }
    
    try {
        $db = Database::getInstance();
        
        $activityData = [
            'volunteer_id' => $volunteerId,
            'activity_type' => sanitizeInput($input['activity_type']),
            'description' => sanitizeInput($input['description']),
            'date' => $input['activity_date'],
            'hours' => floatval($input['hours']),
            'location' => sanitizeInput($input['location'] ?? ''),
            'status' => 'completed',
            'people_served' => calculatePeopleServed($input['activity_type'], $input['hours']),
            'created_at' => date('Y-m-d H:i:s'),
            'ip_address' => $_SERVER['REMOTE_ADDR']
        ];
        
        $activityId = $db->insert('volunteer_activities', $activityData);
        
        // Update volunteer total hours
        updateVolunteerHours($volunteerId);
        
        // Check for achievements
        checkAndAwardAchievements($volunteerId);
        
        logEvent('INFO', "Activity logged by volunteer {$volunteerId}: {$activityData['description']}");
        
        response([
            'success' => true,
            'activity_id' => $activityId,
            'message' => 'Activity logged successfully!'
        ]);
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Error logging activity: ' . $e->getMessage());
        response(['error' => 'Failed to log activity'], 500);
    }
}

/**
 * Register for event
 */
function handleRegisterEvent() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        response(['error' => 'Method not allowed'], 405);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input)) {
        response(['error' => 'No data received'], 400);
    }
    
    // Validate CSRF token
    if (empty($input['csrf_token']) || $input['csrf_token'] !== ($_SESSION['csrf_token'] ?? '')) {
        response(['error' => 'Invalid security token'], 403);
    }
    
    $volunteerId = getUserId();
    $eventId = intval($input['event_id']);
    
    if (!$eventId) {
        response(['error' => 'Invalid event ID'], 400);
    }
    
    try {
        $db = Database::getInstance();
        
        // Check if event exists and is active
        $event = $db->fetchOne(
            "SELECT * FROM events WHERE id = ? AND status = 'active' AND date >= CURDATE()",
            [$eventId]
        );
        
        if (!$event) {
            response(['error' => 'Event not found or no longer available'], 404);
        }
        
        // Check if already registered
        $existing = $db->fetchOne(
            "SELECT id FROM event_registrations WHERE event_id = ? AND volunteer_id = ?",
            [$eventId, $volunteerId]
        );
        
        if ($existing) {
            response(['error' => 'Already registered for this event'], 400);
        }
        
        // Check if event is full
        $currentRegistrations = $db->fetchOne(
            "SELECT COUNT(*) as count FROM event_registrations WHERE event_id = ? AND status != 'cancelled'",
            [$eventId]
        )['count'];
        
        if ($currentRegistrations >= $event['max_volunteers']) {
            response(['error' => 'Event is full'], 400);
        }
        
        // Register for event
        $registrationData = [
            'event_id' => $eventId,
            'volunteer_id' => $volunteerId,
            'status' => 'registered',
            'registered_at' => date('Y-m-d H:i:s'),
            'ip_address' => $_SERVER['REMOTE_ADDR']
        ];
        
        $registrationId = $db->insert('event_registrations', $registrationData);
        
        // Send confirmation email
        try {
            sendEventRegistrationEmail($volunteerId, $event);
        } catch (Exception $e) {
            logEvent('WARNING', 'Failed to send event registration email: ' . $e->getMessage());
        }
        
        logEvent('INFO', "Volunteer {$volunteerId} registered for event {$eventId}");
        
        response([
            'success' => true,
            'registration_id' => $registrationId,
            'message' => 'Successfully registered for event!'
        ]);
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Error registering for event: ' . $e->getMessage());
        response(['error' => 'Failed to register for event'], 500);
    }
}

/**
 * Update volunteer profile
 */
function handleUpdateProfile() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        response(['error' => 'Method not allowed'], 405);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input)) {
        response(['error' => 'No data received'], 400);
    }
    
    // Validate CSRF token
    if (empty($input['csrf_token']) || $input['csrf_token'] !== ($_SESSION['csrf_token'] ?? '')) {
        response(['error' => 'Invalid security token'], 403);
    }
    
    $volunteerId = getUserId();
    
    try {
        $db = Database::getInstance();
        
        // Update main user record
        $userData = [
            'name' => sanitizeInput($input['full_name']),
            'phone' => sanitizeInput($input['phone'] ?? ''),
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        $db->update('users', $userData, ['id' => $volunteerId]);
        
        // Update volunteer-specific data
        $volunteerData = [
            'address' => sanitizeInput($input['address'] ?? ''),
            'skills' => sanitizeInput($input['skills'] ?? ''),
            'availability' => sanitizeInput($input['availability'] ?? ''),
            'experience' => sanitizeInput($input['experience'] ?? ''),
            'emergency_contact' => sanitizeInput($input['emergency_contact'] ?? ''),
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        // Check if volunteer profile exists
        $existingProfile = $db->fetchOne(
            "SELECT id FROM volunteers WHERE user_id = ?",
            [$volunteerId]
        );
        
        if ($existingProfile) {
            $db->update('volunteers', $volunteerData, ['user_id' => $volunteerId]);
        } else {
            $volunteerData['user_id'] = $volunteerId;
            $volunteerData['status'] = 'active';
            $volunteerData['created_at'] = date('Y-m-d H:i:s');
            $db->insert('volunteers', $volunteerData);
        }
        
        logEvent('INFO', "Volunteer profile updated: {$volunteerId}");
        
        response([
            'success' => true,
            'message' => 'Profile updated successfully!'
        ]);
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Error updating volunteer profile: ' . $e->getMessage());
        response(['error' => 'Failed to update profile'], 500);
    }
}

/**
 * Validate activity data
 */
function validateActivityData($data) {
    $errors = [];
    
    if (empty($data['activity_date'])) {
        $errors[] = 'Activity date is required';
    } elseif (!validateDate($data['activity_date'])) {
        $errors[] = 'Invalid activity date';
    }
    
    if (empty($data['activity_type'])) {
        $errors[] = 'Activity type is required';
    }
    
    if (empty($data['description']) || strlen(trim($data['description'])) < 10) {
        $errors[] = 'Description must be at least 10 characters long';
    }
    
    if (empty($data['hours']) || floatval($data['hours']) <= 0 || floatval($data['hours']) > 24) {
        $errors[] = 'Hours must be between 0.5 and 24';
    }
    
    return $errors;
}

/**
 * Calculate estimated people served based on activity type and hours
 */
function calculatePeopleServed($activityType, $hours) {
    $multipliers = [
        'event' => 10,
        'community' => 5,
        'education' => 3,
        'healthcare' => 2,
        'administration' => 1,
        'other' => 2
    ];
    
    $multiplier = $multipliers[$activityType] ?? 2;
    return ceil($hours * $multiplier);
}

/**
 * Update volunteer total hours
 */
function updateVolunteerHours($volunteerId) {
    try {
        $db = Database::getInstance();
        
        $totalHours = $db->fetchOne(
            "SELECT COALESCE(SUM(hours), 0) as total FROM volunteer_activities WHERE volunteer_id = ?",
            [$volunteerId]
        )['total'];
        
        $db->execute(
            "UPDATE volunteers SET total_hours = ? WHERE user_id = ?",
            [$totalHours, $volunteerId]
        );
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Error updating volunteer hours: ' . $e->getMessage());
    }
}

/**
 * Check and award achievements
 */
function checkAndAwardAchievements($volunteerId) {
    try {
        $db = Database::getInstance();
        
        // Get volunteer stats
        $stats = $db->fetchOne(
            "SELECT 
                COALESCE(SUM(hours), 0) as total_hours,
                COUNT(*) as total_activities
             FROM volunteer_activities 
             WHERE volunteer_id = ?",
            [$volunteerId]
        );
        
        $achievements = [];
        
        // Hour-based achievements
        if ($stats['total_hours'] >= 10 && !hasAchievement($volunteerId, 'first_10_hours')) {
            $achievements[] = ['code' => 'first_10_hours', 'name' => 'First 10 Hours'];
        }
        
        if ($stats['total_hours'] >= 50 && !hasAchievement($volunteerId, 'dedicated_volunteer')) {
            $achievements[] = ['code' => 'dedicated_volunteer', 'name' => 'Dedicated Volunteer'];
        }
        
        if ($stats['total_hours'] >= 100 && !hasAchievement($volunteerId, 'community_hero')) {
            $achievements[] = ['code' => 'community_hero', 'name' => 'Community Hero'];
        }
        
        // Activity-based achievements
        if ($stats['total_activities'] >= 5 && !hasAchievement($volunteerId, 'active_member')) {
            $achievements[] = ['code' => 'active_member', 'name' => 'Active Member'];
        }
        
        // Award new achievements
        foreach ($achievements as $achievement) {
            $db->insert('volunteer_achievements', [
                'volunteer_id' => $volunteerId,
                'achievement_code' => $achievement['code'],
                'achievement_name' => $achievement['name'],
                'earned_at' => date('Y-m-d H:i:s')
            ]);
            
            logEvent('INFO', "Achievement awarded to volunteer {$volunteerId}: {$achievement['name']}");
        }
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Error checking achievements: ' . $e->getMessage());
    }
}

/**
 * Check if volunteer has achievement
 */
function hasAchievement($volunteerId, $achievementCode) {
    try {
        $db = Database::getInstance();
        
        $existing = $db->fetchOne(
            "SELECT id FROM volunteer_achievements WHERE volunteer_id = ? AND achievement_code = ?",
            [$volunteerId, $achievementCode]
        );
        
        return !empty($existing);
        
    } catch (Exception $e) {
        return false;
    }
}

/**
 * Send event registration confirmation email
 */
function sendEventRegistrationEmail($volunteerId, $event) {
    try {
        $db = Database::getInstance();
        
        $volunteer = $db->fetchOne(
            "SELECT name, email FROM users WHERE id = ?",
            [$volunteerId]
        );
        
        if (!$volunteer) return;
        
        $subject = "Event Registration Confirmation - {$event['title']}";
        $message = "Dear {$volunteer['name']},\n\n";
        $message .= "Thank you for registering for the event: {$event['title']}\n\n";
        $message .= "Event Details:\n";
        $message .= "Date: {$event['date']}\n";
        $message .= "Time: {$event['time']}\n";
        $message .= "Location: {$event['location']}\n\n";
        $message .= "We look forward to seeing you there!\n\n";
        $message .= "Best regards,\n";
        $message .= "Sai Seva Foundation Team";
        
        $headers = "From: " . ($_ENV['SMTP_FROM_EMAIL'] ?? 'volunteers@sadgurubharadwaja.org') . "\r\n";
        $headers .= "Reply-To: " . ($_ENV['VOLUNTEER_EMAIL'] ?? 'volunteers@sadgurubharadwaja.org') . "\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
        
        if (!mail($volunteer['email'], $subject, $message, $headers)) {
            throw new Exception('Failed to send email');
        }
        
    } catch (Exception $e) {
        logEvent('ERROR', 'Failed to send event registration email: ' . $e->getMessage());
        throw $e;
    }
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    return !empty($_SESSION['user_id']);
}

/**
 * Get current user ID
 */
function getUserId() {
    return $_SESSION['user_id'] ?? null;
}

/**
 * Get current user type
 */
function getUserType() {
    return $_SESSION['user_type'] ?? null;
}

/**
 * Validate date format
 */
function validateDate($date, $format = 'Y-m-d') {
    $d = DateTime::createFromFormat($format, $date);
    return $d && $d->format($format) === $date;
}

?>