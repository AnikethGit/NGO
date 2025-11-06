<?php
/**
 * SECURE ENVIRONMENT LOADER - Sri Dutta Sai Manga Bharadwaja Trust
 * Safe and efficient .env file parser for production use
 * 
 * @version 1.0.0
 * @author Sai Seva Foundation Development Team
 */

class SecureEnvLoader {
    private static $loaded = false;
    private static $envCache = [];
    
    /**
     * Load environment variables from .env file
     * 
     * @param string $path Path to .env file
     * @return bool Success status
     */
    public static function load($path = null) {
        if (self::$loaded) {
            return true; // Already loaded
        }
        
        // Default to project root .env file
        if ($path === null) {
            $path = dirname(__DIR__) . '/.env';
        }
        
        if (!file_exists($path) || !is_readable($path)) {
            error_log("[ENV] Warning: .env file not found or not readable at: {$path}");
            return false;
        }
        
        try {
            $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            
            foreach ($lines as $lineNumber => $line) {
                $line = trim($line);
                
                // Skip comments and empty lines
                if (empty($line) || str_starts_with($line, '#') || str_starts_with($line, '//')) {
                    continue;
                }
                
                // Parse key=value pairs
                if (!str_contains($line, '=')) {
                    continue; // Skip invalid lines
                }
                
                [$key, $value] = array_map('trim', explode('=', $line, 2));
                
                // Validate key format (only alphanumeric, underscore, hyphen)
                if (!preg_match('/^[A-Z0-9_-]+$/i', $key)) {
                    error_log("[ENV] Warning: Invalid key format on line " . ($lineNumber + 1) . ": {$key}");
                    continue;
                }
                
                // Remove surrounding quotes from value
                $value = self::parseValue($value);
                
                // Don't override server environment variables
                if (getenv($key) === false && !isset($_ENV[$key]) && !isset($_SERVER[$key])) {
                    putenv("{$key}={$value}");
                    $_ENV[$key] = $value;
                    $_SERVER[$key] = $value;
                    self::$envCache[$key] = $value;
                }
            }
            
            self::$loaded = true;
            error_log("[ENV] Successfully loaded environment variables from: {$path}");
            return true;
            
        } catch (Exception $e) {
            error_log("[ENV] Error loading .env file: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Parse and clean environment value
     * 
     * @param string $value Raw value from .env
     * @return string Parsed value
     */
    private static function parseValue($value) {
        $value = trim($value);
        
        // Remove surrounding quotes
        if ((str_starts_with($value, '"') && str_ends_with($value, '"')) ||
            (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
            $value = substr($value, 1, -1);
        }
        
        // Process escape sequences in double quotes
        $value = str_replace(['\\n', '\\r', '\\t', '\\\\'], ["\n", "\r", "\t", "\\"], $value);
        
        return $value;
    }
    
    /**
     * Get environment variable with optional default
     * 
     * @param string $key Variable name
     * @param mixed $default Default value if not found
     * @return mixed Environment value or default
     */
    public static function get($key, $default = null) {
        // Check in order: server env, putenv, cached, default
        $value = $_SERVER[$key] ?? $_ENV[$key] ?? getenv($key) ?? self::$envCache[$key] ?? null;
        
        if ($value !== null) {
            return self::castValue($value);
        }
        
        return $default;
    }
    
    /**
     * Cast string values to appropriate types
     * 
     * @param string $value String value to cast
     * @return mixed Casted value
     */
    private static function castValue($value) {
        if (!is_string($value)) {
            return $value;
        }
        
        $lower = strtolower($value);
        
        // Boolean casting
        if (in_array($lower, ['true', '1', 'yes', 'on'])) {
            return true;
        }
        
        if (in_array($lower, ['false', '0', 'no', 'off', ''])) {
            return false;
        }
        
        // Numeric casting
        if (is_numeric($value)) {
            return str_contains($value, '.') ? (float)$value : (int)$value;
        }
        
        // Null casting
        if ($lower === 'null') {
            return null;
        }
        
        return $value;
    }
    
    /**
     * Check if environment variable exists
     * 
     * @param string $key Variable name
     * @return bool
     */
    public static function has($key) {
        return self::get($key) !== null;
    }
    
    /**
     * Get all loaded environment variables
     * 
     * @return array
     */
    public static function all() {
        return array_merge(self::$envCache, $_ENV);
    }
    
    /**
     * Get database configuration array
     * 
     * @return array Database configuration
     */
    public static function getDatabaseConfig() {
        return [
            'host' => self::get('DB_HOST', 'localhost'),
            'port' => self::get('DB_PORT', 3306),
            'name' => self::get('DB_NAME'),
            'user' => self::get('DB_USER'),
            'pass' => self::get('DB_PASS'),
            'charset' => self::get('DB_CHARSET', 'utf8mb4'),
            'collation' => self::get('DB_COLLATION', 'utf8mb4_unicode_ci')
        ];
    }
    
    /**
     * Validate required environment variables
     * 
     * @param array $required List of required keys
     * @throws Exception If required variables are missing
     */
    public static function requireKeys(array $required) {
        $missing = [];
        
        foreach ($required as $key) {
            if (!self::has($key) || empty(self::get($key))) {
                $missing[] = $key;
            }
        }
        
        if (!empty($missing)) {
            throw new Exception('Missing required environment variables: ' . implode(', ', $missing));
        }
    }
    
    /**
     * Get app configuration
     * 
     * @return array App configuration
     */
    public static function getAppConfig() {
        return [
            'name' => self::get('APP_NAME', 'Sai Seva Foundation'),
            'env' => self::get('APP_ENV', 'production'),
            'debug' => self::get('APP_DEBUG', false),
            'key' => self::get('APP_KEY'),
            'url' => self::get('BASE_URL', 'https://sadgurubharadwaja.org')
        ];
    }
    
    /**
     * Get security configuration
     * 
     * @return array Security configuration
     */
    public static function getSecurityConfig() {
        return [
            'session_lifetime' => self::get('SESSION_LIFETIME', 7200),
            'session_cookie_name' => self::get('SESSION_COOKIE_NAME', 'SSF_SESSION'),
            'session_cookie_httponly' => self::get('SESSION_COOKIE_HTTPONLY', true),
            'session_cookie_secure' => self::get('SESSION_COOKIE_SECURE', true),
            'session_cookie_samesite' => self::get('SESSION_COOKIE_SAMESITE', 'Strict'),
            'csrf_token_lifetime' => self::get('CSRF_TOKEN_LIFETIME', 3600),
            'rate_limit_enabled' => self::get('RATE_LIMIT_ENABLED', true),
            'rate_limit_requests' => self::get('RATE_LIMIT_REQUESTS', 60),
            'login_rate_limit' => self::get('LOGIN_RATE_LIMIT', 5)
        ];
    }
}

// Convenience function for global access
if (!function_exists('env')) {
    /**
     * Get environment variable
     * 
     * @param string $key Variable name
     * @param mixed $default Default value
     * @return mixed
     */
    function env($key, $default = null) {
        return SecureEnvLoader::get($key, $default);
    }
}

// Auto-load environment on include
SecureEnvLoader::load();

// Log successful initialization
if (SecureEnvLoader::get('APP_DEBUG', false)) {
    error_log('[ENV] Environment loader initialized successfully');
}