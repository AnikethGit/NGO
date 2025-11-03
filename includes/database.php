<?php
/**
 * PRODUCTION Database Class - Sai Seva Foundation
 * Secure PDO wrapper with connection pooling and error handling
 * 
 * @version 2.0.0
 * @author Sai Seva Foundation Development Team
 */

class Database {
    private static $instance = null;
    private $connection;
    private $config;
    private $transactionCount = 0;
    
    private function __construct() {
        $this->config = [
            'host' => $_ENV['DB_HOST'] ?? 'localhost',
            'port' => $_ENV['DB_PORT'] ?? '3306',
            'database' => $_ENV['DB_DATABASE'] ?? 'sai_seva_foundation',
            'username' => $_ENV['DB_USERNAME'] ?? 'root',
            'password' => $_ENV['DB_PASSWORD'] ?? '',
            'charset' => $_ENV['DB_CHARSET'] ?? 'utf8mb4',
            'options' => [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_PERSISTENT => true,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
                PDO::ATTR_TIMEOUT => 30
            ]
        ];
        
        $this->connect();
    }
    
    /**
     * Get singleton instance
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        
        return self::$instance;
    }
    
    /**
     * Establish database connection
     */
    private function connect() {
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            $this->config['host'],
            $this->config['port'],
            $this->config['database'],
            $this->config['charset']
        );
        
        try {
            $this->connection = new PDO(
                $dsn,
                $this->config['username'],
                $this->config['password'],
                $this->config['options']
            );
            
            // Set SQL mode for strict data integrity
            $this->connection->exec("SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO'");
            
        } catch (PDOException $e) {
            error_log('Database connection failed: ' . $e->getMessage());
            throw new Exception('Database connection failed');
        }
    }
    
    /**
     * Execute a query with parameters
     */
    public function execute($query, $params = []) {
        try {
            $stmt = $this->connection->prepare($query);
            $stmt->execute($params);
            return $stmt;
            
        } catch (PDOException $e) {
            error_log("Database query failed: {$e->getMessage()} | Query: {$query}");
            throw new DatabaseException('Database operation failed', 0, $e);
        }
    }
    
    /**
     * Fetch single row
     */
    public function fetchOne($query, $params = []) {
        $stmt = $this->execute($query, $params);
        return $stmt->fetch();
    }
    
    /**
     * Fetch all rows
     */
    public function fetchAll($query, $params = []) {
        $stmt = $this->execute($query, $params);
        return $stmt->fetchAll();
    }
    
    /**
     * Insert record and return ID
     */
    public function insert($table, $data) {
        $columns = array_keys($data);
        $placeholders = array_map(function($col) { return ":$col"; }, $columns);
        
        $query = sprintf(
            'INSERT INTO %s (%s) VALUES (%s)',
            $this->escapeIdentifier($table),
            implode(', ', array_map([$this, 'escapeIdentifier'], $columns)),
            implode(', ', $placeholders)
        );
        
        $params = [];
        foreach ($data as $key => $value) {
            $params[":$key"] = $value;
        }
        
        $this->execute($query, $params);
        return $this->connection->lastInsertId();
    }
    
    /**
     * Update records
     */
    public function update($table, $data, $where, $whereParams = []) {
        $setParts = [];
        $params = [];
        
        foreach ($data as $key => $value) {
            $setParts[] = $this->escapeIdentifier($key) . " = :set_$key";
            $params[":set_$key"] = $value;
        }
        
        // Add where parameters
        if (is_array($whereParams)) {
            $whereParamIndex = 0;
            foreach ($whereParams as $param) {
                $params[":where_param_$whereParamIndex"] = $param;
                $whereParamIndex++;
            }
            
            // Replace ? placeholders with named parameters
            $where = preg_replace_callback('/\?/', function($matches) use (&$whereParamIndex) {
                static $index = 0;
                return ":where_param_" . ($index++);
            }, $where);
        }
        
        $query = sprintf(
            'UPDATE %s SET %s WHERE %s',
            $this->escapeIdentifier($table),
            implode(', ', $setParts),
            $where
        );
        
        $stmt = $this->execute($query, $params);
        return $stmt->rowCount();
    }
    
    /**
     * Delete records
     */
    public function delete($table, $where, $whereParams = []) {
        $params = [];
        
        if (is_array($whereParams)) {
            $whereParamIndex = 0;
            foreach ($whereParams as $param) {
                $params[":where_param_$whereParamIndex"] = $param;
                $whereParamIndex++;
            }
            
            // Replace ? placeholders with named parameters
            $where = preg_replace_callback('/\?/', function($matches) use (&$whereParamIndex) {
                static $index = 0;
                return ":where_param_" . ($index++);
            }, $where);
        }
        
        $query = sprintf(
            'DELETE FROM %s WHERE %s',
            $this->escapeIdentifier($table),
            $where
        );
        
        $stmt = $this->execute($query, $params);
        return $stmt->rowCount();
    }
    
    /**
     * Paginate query results
     */
    public function paginate($query, $params = [], $page = 1, $limit = 20) {
        $page = max(1, (int) $page);
        $limit = max(1, min(100, (int) $limit)); // Max 100 records per page
        $offset = ($page - 1) * $limit;
        
        // Get total count
        $countQuery = "SELECT COUNT(*) as total FROM ($query) as count_query";
        $total = $this->fetchOne($countQuery, $params)['total'];
        
        // Get paginated data
        $paginatedQuery = "$query LIMIT $limit OFFSET $offset";
        $data = $this->fetchAll($paginatedQuery, $params);
        
        return [
            'data' => $data,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total' => (int) $total,
                'total_pages' => (int) ceil($total / $limit),
                'has_next' => $page < ceil($total / $limit),
                'has_prev' => $page > 1
            ]
        ];
    }
    
    /**
     * Start database transaction
     */
    public function beginTransaction() {
        if ($this->transactionCount === 0) {
            $this->connection->beginTransaction();
        }
        $this->transactionCount++;
        
        return $this;
    }
    
    /**
     * Commit transaction
     */
    public function commit() {
        if ($this->transactionCount === 1) {
            $this->connection->commit();
        }
        $this->transactionCount = max(0, $this->transactionCount - 1);
        
        return $this;
    }
    
    /**
     * Rollback transaction
     */
    public function rollback() {
        if ($this->transactionCount >= 1) {
            $this->connection->rollback();
        }
        $this->transactionCount = 0;
        
        return $this;
    }
    
    /**
     * Execute multiple queries in transaction
     */
    public function transaction(callable $callback) {
        $this->beginTransaction();
        
        try {
            $result = $callback($this);
            $this->commit();
            return $result;
            
        } catch (Exception $e) {
            $this->rollback();
            throw $e;
        }
    }
    
    /**
     * Backup database
     */
    public function createBackup() {
        $backupDir = '../backups';
        if (!is_dir($backupDir)) {
            mkdir($backupDir, 0755, true);
        }
        
        $timestamp = date('Y-m-d_H-i-s');
        $filename = "backup_{$this->config['database']}_{$timestamp}.sql";
        $filepath = "$backupDir/$filename";
        
        $command = sprintf(
            'mysqldump --host=%s --port=%s --user=%s --password=%s --single-transaction --routines --triggers %s > %s',
            $this->config['host'],
            $this->config['port'],
            $this->config['username'],
            $this->config['password'],
            $this->config['database'],
            $filepath
        );
        
        exec($command, $output, $returnCode);
        
        if ($returnCode !== 0) {
            throw new Exception('Database backup failed');
        }
        
        return $filepath;
    }
    
    /**
     * Restore database from backup
     */
    public function restoreBackup($backupFile) {
        if (!file_exists($backupFile)) {
            throw new Exception('Backup file not found');
        }
        
        $command = sprintf(
            'mysql --host=%s --port=%s --user=%s --password=%s %s < %s',
            $this->config['host'],
            $this->config['port'],
            $this->config['username'],
            $this->config['password'],
            $this->config['database'],
            $backupFile
        );
        
        exec($command, $output, $returnCode);
        
        if ($returnCode !== 0) {
            throw new Exception('Database restore failed');
        }
        
        return true;
    }
    
    /**
     * Get database statistics
     */
    public function getStats() {
        $stats = [];
        
        // Get table information
        $tables = $this->fetchAll("SHOW TABLE STATUS");
        $stats['tables'] = [];
        $totalSize = 0;
        
        foreach ($tables as $table) {
            $size = $table['Data_length'] + $table['Index_length'];
            $stats['tables'][$table['Name']] = [
                'rows' => $table['Rows'],
                'size' => $size,
                'size_formatted' => $this->formatBytes($size)
            ];
            $totalSize += $size;
        }
        
        $stats['total_size'] = $totalSize;
        $stats['total_size_formatted'] = $this->formatBytes($totalSize);
        
        // Get connection information
        $stats['connection'] = [
            'host' => $this->config['host'],
            'database' => $this->config['database'],
            'charset' => $this->config['charset']
        ];
        
        return $stats;
    }
    
    /**
     * Check database health
     */
    public function healthCheck() {
        try {
            // Test connection
            $result = $this->fetchOne("SELECT 1 as test");
            
            if ($result['test'] !== 1) {
                throw new Exception('Health check query failed');
            }
            
            // Check if essential tables exist
            $requiredTables = ['users', 'donations', 'contacts', 'events', 'volunteers'];
            $existingTables = array_column(
                $this->fetchAll("SHOW TABLES"),
                "Tables_in_{$this->config['database']}"
            );
            
            $missingTables = array_diff($requiredTables, $existingTables);
            
            return [
                'status' => 'healthy',
                'connection' => true,
                'missing_tables' => $missingTables,
                'timestamp' => date('Y-m-d H:i:s')
            ];
            
        } catch (Exception $e) {
            return [
                'status' => 'unhealthy',
                'connection' => false,
                'error' => $e->getMessage(),
                'timestamp' => date('Y-m-d H:i:s')
            ];
        }
    }
    
    /**
     * Escape database identifier (table/column names)
     */
    private function escapeIdentifier($identifier) {
        return '`' . str_replace('`', '``', $identifier) . '`';
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
     * Get last query execution time
     */
    public function getLastQueryTime() {
        return $this->connection->query("SELECT NOW() as current_time")->fetchColumn();
    }
    
    /**
     * Prevent cloning
     */
    private function __clone() {}
    
    /**
     * Prevent unserialization
     */
    public function __wakeup() {
        throw new Exception("Cannot unserialize singleton");
    }
    
    /**
     * Close connection on destruction
     */
    public function __destruct() {
        $this->connection = null;
    }
}

/**
 * Custom Database Exception
 */
class DatabaseException extends Exception {
    public function __construct($message = "", $code = 0, Throwable $previous = null) {
        parent::__construct($message, $code, $previous);
        
        // Log the database error
        error_log("Database Exception: {$message} | Code: {$code}");
    }
}

?>