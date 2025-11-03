<?php
/**
 * PRODUCTION Logger Class - Sai Seva Foundation
 * Comprehensive logging system with levels, rotation, and security
 * 
 * @version 2.0.0
 * @author Sai Seva Foundation Development Team
 */

class Logger {
    const DEBUG = 100;
    const INFO = 200;
    const NOTICE = 250;
    const WARNING = 300;
    const ERROR = 400;
    const CRITICAL = 500;
    const ALERT = 550;
    const EMERGENCY = 600;
    
    private $name;
    private $logPath;
    private $minLevel;
    private $maxFileSize;
    private $maxFiles;
    
    public function __construct($name = 'app', $minLevel = self::INFO) {
        $this->name = $name;
        $this->minLevel = $minLevel;
        $this->logPath = '../logs';
        $this->maxFileSize = 10 * 1024 * 1024; // 10MB
        $this->maxFiles = 10; // Keep 10 rotated files
        
        $this->ensureLogDirectory();
    }
    
    /**
     * Log debug message
     */
    public function debug($message, array $context = []) {
        $this->log(self::DEBUG, $message, $context);
    }
    
    /**
     * Log info message
     */
    public function info($message, array $context = []) {
        $this->log(self::INFO, $message, $context);
    }
    
    /**
     * Log notice message
     */
    public function notice($message, array $context = []) {
        $this->log(self::NOTICE, $message, $context);
    }
    
    /**
     * Log warning message
     */
    public function warning($message, array $context = []) {
        $this->log(self::WARNING, $message, $context);
    }
    
    /**
     * Log error message
     */
    public function error($message, array $context = []) {
        $this->log(self::ERROR, $message, $context);
    }
    
    /**
     * Log critical message
     */
    public function critical($message, array $context = []) {
        $this->log(self::CRITICAL, $message, $context);
    }
    
    /**
     * Log alert message
     */
    public function alert($message, array $context = []) {
        $this->log(self::ALERT, $message, $context);
    }
    
    /**
     * Log emergency message
     */
    public function emergency($message, array $context = []) {
        $this->log(self::EMERGENCY, $message, $context);
    }
    
    /**
     * Main logging method
     */
    public function log($level, $message, array $context = []) {
        if ($level < $this->minLevel) {
            return;
        }
        
        $levelName = $this->getLevelName($level);
        $timestamp = date('Y-m-d H:i:s');
        $logFile = $this->getLogFile();
        
        // Prepare context data
        $contextData = $this->prepareContext($context);
        
        // Format log entry
        $logEntry = $this->formatLogEntry($timestamp, $levelName, $message, $contextData);
        
        // Write to file
        $this->writeLogEntry($logFile, $logEntry);
        
        // Handle critical errors
        if ($level >= self::CRITICAL) {
            $this->handleCriticalError($message, $contextData);
        }
        
        // Rotate logs if needed
        $this->rotateLogsIfNeeded($logFile);
    }
    
    /**
     * Get log level name
     */
    private function getLevelName($level) {
        $levels = [
            self::DEBUG => 'DEBUG',
            self::INFO => 'INFO',
            self::NOTICE => 'NOTICE',
            self::WARNING => 'WARNING',
            self::ERROR => 'ERROR',
            self::CRITICAL => 'CRITICAL',
            self::ALERT => 'ALERT',
            self::EMERGENCY => 'EMERGENCY'
        ];
        
        return $levels[$level] ?? 'UNKNOWN';
    }
    
    /**
     * Get log file path
     */
    private function getLogFile() {
        $date = date('Y-m-d');
        return "{$this->logPath}/{$this->name}-{$date}.log";
    }
    
    /**
     * Prepare context data for logging
     */
    private function prepareContext(array $context) {
        // Add request context
        $requestContext = [
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
            'uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
        ];
        
        // Add user context if available
        if (isset($_SESSION['user_id'])) {
            $requestContext['user_id'] = $_SESSION['user_id'];
            $requestContext['user_email'] = $_SESSION['user_email'] ?? '';
        }
        
        // Add memory usage
        $requestContext['memory_usage'] = memory_get_usage(true);
        $requestContext['peak_memory'] = memory_get_peak_usage(true);
        
        return array_merge($context, $requestContext);
    }
    
    /**
     * Format log entry
     */
    private function formatLogEntry($timestamp, $level, $message, array $context) {
        $entry = [
            'timestamp' => $timestamp,
            'level' => $level,
            'channel' => $this->name,
            'message' => $message
        ];
        
        if (!empty($context)) {
            $entry['context'] = $context;
        }
        
        // Add extra fields
        $entry['extra'] = [
            'process_id' => getmypid(),
            'request_id' => $this->getRequestId()
        ];
        
        return json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
    }
    
    /**
     * Write log entry to file
     */
    private function writeLogEntry($logFile, $logEntry) {
        if (file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX) === false) {
            // Fallback to error_log if file write fails
            error_log("Failed to write to log file: {$logFile}");
            error_log($logEntry);
        }
    }
    
    /**
     * Handle critical errors
     */
    private function handleCriticalError($message, array $context) {
        // Send alert email for critical errors
        try {
            $this->sendCriticalErrorAlert($message, $context);
        } catch (Exception $e) {
            error_log("Failed to send critical error alert: " . $e->getMessage());
        }
        
        // Create incident file
        $this->createIncidentFile($message, $context);
    }
    
    /**
     * Send critical error alert
     */
    private function sendCriticalErrorAlert($message, array $context) {
        $adminEmail = $_ENV['ADMIN_EMAIL'] ?? 'admin@sadgurubharadwaja.org';
        $subject = 'CRITICAL ERROR - Sai Seva Foundation Website';
        
        $body = "A critical error has occurred on the Sai Seva Foundation website:\n\n";
        $body .= "Message: {$message}\n\n";
        $body .= "Context:\n" . print_r($context, true) . "\n\n";
        $body .= "Timestamp: " . date('Y-m-d H:i:s') . "\n";
        $body .= "Server: " . ($_SERVER['SERVER_NAME'] ?? 'unknown') . "\n";
        
        $headers = [
            'From: alerts@sadgurubharadwaja.org',
            'Reply-To: noreply@sadgurubharadwaja.org',
            'X-Priority: 1',
            'X-MSMail-Priority: High',
            'Content-Type: text/plain; charset=UTF-8'
        ];
        
        mail($adminEmail, $subject, $body, implode("\r\n", $headers));
    }
    
    /**
     * Create incident file for critical errors
     */
    private function createIncidentFile($message, array $context) {
        $incidentDir = $this->logPath . '/incidents';
        if (!is_dir($incidentDir)) {
            mkdir($incidentDir, 0755, true);
        }
        
        $incidentId = uniqid('incident_');
        $incidentFile = "{$incidentDir}/{$incidentId}.json";
        
        $incident = [
            'id' => $incidentId,
            'timestamp' => date('Y-m-d H:i:s'),
            'message' => $message,
            'context' => $context,
            'status' => 'open',
            'severity' => 'critical'
        ];
        
        file_put_contents($incidentFile, json_encode($incident, JSON_PRETTY_PRINT));
    }
    
    /**
     * Rotate logs if they exceed size limit
     */
    private function rotateLogsIfNeeded($logFile) {
        if (!file_exists($logFile) || filesize($logFile) < $this->maxFileSize) {
            return;
        }
        
        // Rotate existing files
        for ($i = $this->maxFiles - 1; $i > 0; $i--) {
            $oldFile = $logFile . '.' . $i;
            $newFile = $logFile . '.' . ($i + 1);
            
            if (file_exists($oldFile)) {
                rename($oldFile, $newFile);
            }
        }
        
        // Move current log to .1
        rename($logFile, $logFile . '.1');
        
        // Clean up old rotated files
        $oldFile = $logFile . '.' . ($this->maxFiles + 1);
        if (file_exists($oldFile)) {
            unlink($oldFile);
        }
    }
    
    /**
     * Get or generate request ID
     */
    private function getRequestId() {
        static $requestId = null;
        
        if ($requestId === null) {
            $requestId = uniqid('req_');
        }
        
        return $requestId;
    }
    
    /**
     * Ensure log directory exists
     */
    private function ensureLogDirectory() {
        if (!is_dir($this->logPath)) {
            mkdir($this->logPath, 0755, true);
        }
        
        // Create .htaccess to protect log files
        $htaccessFile = $this->logPath . '/.htaccess';
        if (!file_exists($htaccessFile)) {
            $htaccessContent = "Order deny,allow\nDeny from all\n";
            file_put_contents($htaccessFile, $htaccessContent);
        }
    }
    
    /**
     * Get log files
     */
    public function getLogFiles() {
        $files = [];
        $pattern = "{$this->logPath}/{$this->name}-*.log*";
        
        foreach (glob($pattern) as $file) {
            $files[] = [
                'name' => basename($file),
                'path' => $file,
                'size' => filesize($file),
                'modified' => filemtime($file)
            ];
        }
        
        // Sort by modification time (newest first)
        usort($files, function($a, $b) {
            return $b['modified'] - $a['modified'];
        });
        
        return $files;
    }
    
    /**
     * Get log entries from file
     */
    public function getLogEntries($logFile = null, $limit = 100) {
        $logFile = $logFile ?? $this->getLogFile();
        
        if (!file_exists($logFile)) {
            return [];
        }
        
        $lines = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $entries = [];
        
        // Get last N lines
        $lines = array_slice($lines, -$limit);
        
        foreach ($lines as $line) {
            $entry = json_decode($line, true);
            if ($entry) {
                $entries[] = $entry;
            }
        }
        
        return array_reverse($entries); // Newest first
    }
    
    /**
     * Search logs
     */
    public function searchLogs($query, $level = null, $startDate = null, $endDate = null) {
        $results = [];
        $logFiles = $this->getLogFiles();
        
        foreach ($logFiles as $logFileInfo) {
            $entries = $this->getLogEntries($logFileInfo['path']);
            
            foreach ($entries as $entry) {
                // Check date range
                if ($startDate && $entry['timestamp'] < $startDate) continue;
                if ($endDate && $entry['timestamp'] > $endDate) continue;
                
                // Check level
                if ($level && $entry['level'] !== $level) continue;
                
                // Check query in message or context
                $searchText = $entry['message'] . ' ' . json_encode($entry['context'] ?? []);
                if (stripos($searchText, $query) !== false) {
                    $results[] = $entry;
                }
            }
        }
        
        return $results;
    }
    
    /**
     * Get log statistics
     */
    public function getStats($days = 7) {
        $stats = [
            'total_entries' => 0,
            'by_level' => [],
            'by_date' => [],
            'top_errors' => [],
            'file_sizes' => []
        ];
        
        $logFiles = $this->getLogFiles();
        $cutoffDate = date('Y-m-d H:i:s', strtotime("-{$days} days"));
        
        foreach ($logFiles as $logFileInfo) {
            $stats['file_sizes'][] = [
                'name' => $logFileInfo['name'],
                'size' => $logFileInfo['size'],
                'size_formatted' => $this->formatBytes($logFileInfo['size'])
            ];
            
            $entries = $this->getLogEntries($logFileInfo['path']);
            
            foreach ($entries as $entry) {
                if ($entry['timestamp'] < $cutoffDate) continue;
                
                $stats['total_entries']++;
                
                // Count by level
                $level = $entry['level'];
                $stats['by_level'][$level] = ($stats['by_level'][$level] ?? 0) + 1;
                
                // Count by date
                $date = substr($entry['timestamp'], 0, 10);
                $stats['by_date'][$date] = ($stats['by_date'][$date] ?? 0) + 1;
                
                // Collect errors
                if (in_array($level, ['ERROR', 'CRITICAL', 'ALERT', 'EMERGENCY'])) {
                    $message = $entry['message'];
                    $stats['top_errors'][$message] = ($stats['top_errors'][$message] ?? 0) + 1;
                }
            }
        }
        
        // Sort top errors by frequency
        arsort($stats['top_errors']);
        $stats['top_errors'] = array_slice($stats['top_errors'], 0, 10, true);
        
        return $stats;
    }
    
    /**
     * Format bytes to human readable
     */
    private function formatBytes($size, $precision = 2) {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        for ($i = 0; $size > 1024 && $i < count($units) - 1; $i++) {
            $size /= 1024;
        }
        
        return round($size, $precision) . ' ' . $units[$i];
    }
    
    /**
     * Clean old logs
     */
    public function cleanOldLogs($days = 30) {
        $cutoffTime = time() - ($days * 24 * 60 * 60);
        $pattern = "{$this->logPath}/{$this->name}-*.log*";
        $deletedFiles = [];
        
        foreach (glob($pattern) as $file) {
            if (filemtime($file) < $cutoffTime) {
                if (unlink($file)) {
                    $deletedFiles[] = basename($file);
                }
            }
        }
        
        return $deletedFiles;
    }
}

?>