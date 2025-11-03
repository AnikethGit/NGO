<?php
/**
 * PRODUCTION Database Class - Sai Seva Foundation
 * Complete MySQL database integration with connection pooling, security, and performance optimization
 * 
 * @version 1.0.0
 * @author Sai Seva Foundation Development Team
 */

class Database {
    private static $instance = null;
    private $connection;
    private $host;
    private $port;
    private $database;
    private $username;
    private $password;
    private $charset = 'utf8mb4';
    private $connectionOptions;

    /**
     * Private constructor to prevent direct instantiation
     */
    private function __construct() {
        $this->loadConfiguration();
        $this->setConnectionOptions();
        $this->connect();
    }

    /**
     * Get singleton instance of Database
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Load database configuration from environment variables
     */
    private function loadConfiguration() {
        $this->host = $_ENV['DB_HOST'] ?? 'localhost';
        $this->port = $_ENV['DB_PORT'] ?? 3306;
        $this->database = $_ENV['DB_NAME'] ?? 'u701659873_ngo_management';
        $this->username = $_ENV['DB_USER'] ?? 'u701659873_admin';
        $this->password = $_ENV['DB_PASS'] ?? '*Mb6&mtt';
    }

    /**
     * Set PDO connection options for security and performance
     */
    private function setConnectionOptions() {
        $this->connectionOptions = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_STRINGIFY_FETCHES => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$this->charset} COLLATE {$this->charset}_unicode_ci",
            PDO::ATTR_PERSISTENT => true, // Connection pooling
            PDO::ATTR_TIMEOUT => 30,
            PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,
            PDO::MYSQL_ATTR_FOUND_ROWS => true
        ];
    }

    /**
     * Establish database connection
     */
    private function connect() {
        try {
            $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->database};charset={$this->charset}";
            
            $this->connection = new PDO($dsn, $this->username, $this->password, $this->connectionOptions);
            
            // Set timezone to Indian Standard Time
            $this->connection->exec("SET time_zone = '+05:30'");
            
            // Set SQL mode for strict data validation
            $this->connection->exec("SET sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION'");
            
            // Enable query cache if available
            $this->connection->exec("SET SESSION query_cache_type = ON");
            
        } catch (PDOException $e) {
            $this->handleConnectionError($e);
        }
    }

    /**
     * Handle database connection errors
     */
    private function handleConnectionError(PDOException $e) {
        $errorMessage = "Database connection failed: " . $e->getMessage();
        
        // Log error with details
        error_log($errorMessage . " | Host: {$this->host} | Database: {$this->database}");
        
        // In production, don't expose sensitive information
        if (($_ENV['DEBUG_MODE'] ?? 'false') === 'true') {
            die($errorMessage);
        } else {
            die("Database service temporarily unavailable. Please try again later.");
        }
    }

    /**
     * Get PDO connection instance
     */
    public function getConnection() {
        return $this->connection;
    }

    /**
     * Execute SELECT query and return all results
     */
    public function fetchAll($sql, $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            $this->handleQueryError($e, $sql, $params);
            throw new Exception("Database query failed");
        }
    }

    /**
     * Execute SELECT query and return single result
     */
    public function fetchOne($sql, $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetch();
        } catch (PDOException $e) {
            $this->handleQueryError($e, $sql, $params);
            throw new Exception("Database query failed");
        }
    }

    /**
     * Execute SELECT query and return single column value
     */
    public function fetchColumn($sql, $params = [], $columnIndex = 0) {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchColumn($columnIndex);
        } catch (PDOException $e) {
            $this->handleQueryError($e, $sql, $params);
            throw new Exception("Database query failed");
        }
    }

    /**
     * Execute INSERT, UPDATE, DELETE queries
     */
    public function execute($sql, $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            $result = $stmt->execute($params);
            return $result;
        } catch (PDOException $e) {
            $this->handleQueryError($e, $sql, $params);
            throw new Exception("Database query failed");
        }
    }

    /**
     * Insert data into table and return last insert ID
     */
    public function insert($table, $data) {
        try {
            // Validate table name
            if (!$this->isValidTableName($table)) {
                throw new Exception("Invalid table name: {$table}");
            }

            $columns = implode(',', array_keys($data));
            $placeholders = ':' . implode(', :', array_keys($data));
            
            $sql = "INSERT INTO `{$table}` ({$columns}) VALUES ({$placeholders})";
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($data);
            
            return $this->connection->lastInsertId();
        } catch (PDOException $e) {
            $this->handleQueryError($e, $sql ?? '', $data);
            throw new Exception("Database insert failed");
        }
    }

    /**
     * Insert multiple rows in single query for better performance
     */
    public function insertMultiple($table, $data) {
        try {
            if (empty($data) || !is_array($data)) {
                throw new Exception("Invalid data for multiple insert");
            }

            if (!$this->isValidTableName($table)) {
                throw new Exception("Invalid table name: {$table}");
            }

            $firstRow = reset($data);
            $columns = implode(',', array_keys($firstRow));
            
            $placeholders = [];
            $values = [];
            $index = 0;
            
            foreach ($data as $row) {
                $rowPlaceholders = [];
                foreach ($row as $key => $value) {
                    $placeholder = ":{$key}_{$index}";
                    $rowPlaceholders[] = $placeholder;
                    $values[$placeholder] = $value;
                }
                $placeholders[] = '(' . implode(', ', $rowPlaceholders) . ')';
                $index++;
            }
            
            $sql = "INSERT INTO `{$table}` ({$columns}) VALUES " . implode(', ', $placeholders);
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($values);
            
            return $stmt->rowCount();
        } catch (PDOException $e) {
            $this->handleQueryError($e, $sql ?? '', $values ?? []);
            throw new Exception("Database multiple insert failed");
        }
    }

    /**
     * Update data in table
     */
    public function update($table, $data, $where, $whereParams = []) {
        try {
            if (!$this->isValidTableName($table)) {
                throw new Exception("Invalid table name: {$table}");
            }

            $setClause = [];
            foreach ($data as $column => $value) {
                if (!$this->isValidColumnName($column)) {
                    throw new Exception("Invalid column name: {$column}");
                }
                $setClause[] = "`{$column}` = :{$column}";
            }
            $setClause = implode(', ', $setClause);
            
            $sql = "UPDATE `{$table}` SET {$setClause} WHERE {$where}";
            $stmt = $this->connection->prepare($sql);
            
            $allParams = array_merge($data, $whereParams);
            $result = $stmt->execute($allParams);
            
            return $stmt->rowCount();
        } catch (PDOException $e) {
            $this->handleQueryError($e, $sql ?? '', $allParams ?? []);
            throw new Exception("Database update failed");
        }
    }

    /**
     * Delete data from table
     */
    public function delete($table, $where, $whereParams = []) {
        try {
            if (!$this->isValidTableName($table)) {
                throw new Exception("Invalid table name: {$table}");
            }

            $sql = "DELETE FROM `{$table}` WHERE {$where}";
            $stmt = $this->connection->prepare($sql);
            $result = $stmt->execute($whereParams);
            
            return $stmt->rowCount();
        } catch (PDOException $e) {
            $this->handleQueryError($e, $sql, $whereParams);
            throw new Exception("Database delete failed");
        }
    }

    /**
     * Count records in table
     */
    public function count($table, $where = '1=1', $whereParams = []) {
        try {
            if (!$this->isValidTableName($table)) {
                throw new Exception("Invalid table name: {$table}");
            }

            $sql = "SELECT COUNT(*) as count FROM `{$table}` WHERE {$where}";
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($whereParams);
            $result = $stmt->fetch();
            
            return (int) $result['count'];
        } catch (PDOException $e) {
            $this->handleQueryError($e, $sql ?? '', $whereParams);
            throw new Exception("Database count failed");
        }
    }

    /**
     * Check if record exists
     */
    public function exists($table, $where = '1=1', $whereParams = []) {
        try {
            if (!$this->isValidTableName($table)) {
                throw new Exception("Invalid table name: {$table}");
            }

            $sql = "SELECT 1 FROM `{$table}` WHERE {$where} LIMIT 1";
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($whereParams);
            
            return $stmt->fetchColumn() !== false;
        } catch (PDOException $e) {
            $this->handleQueryError($e, $sql ?? '', $whereParams);
            throw new Exception("Database exists check failed");
        }
    }

    /**
     * Execute query with pagination
     */
    public function paginate($sql, $params = [], $page = 1, $perPage = 20) {
        try {
            $offset = ($page - 1) * $perPage;
            
            // Get total count
            $countSql = "SELECT COUNT(*) as total FROM ({$sql}) as count_query";
            $totalStmt = $this->connection->prepare($countSql);
            $totalStmt->execute($params);
            $total = $totalStmt->fetchColumn();
            
            // Get paginated results
            $paginatedSql = $sql . " LIMIT {$perPage} OFFSET {$offset}";
            $stmt = $this->connection->prepare($paginatedSql);
            $stmt->execute($params);
            $data = $stmt->fetchAll();
            
            return [
                'data' => $data,
                'pagination' => [
                    'total' => (int) $total,
                    'per_page' => $perPage,
                    'current_page' => $page,
                    'last_page' => ceil($total / $perPage),
                    'from' => $offset + 1,
                    'to' => min($offset + $perPage, $total)
                ]
            ];
        } catch (PDOException $e) {
            $this->handleQueryError($e, $sql, $params);
            throw new Exception("Database pagination failed");
        }
    }

    /**
     * Begin database transaction
     */
    public function beginTransaction() {
        try {
            return $this->connection->beginTransaction();
        } catch (PDOException $e) {
            throw new Exception("Failed to begin transaction: " . $e->getMessage());
        }
    }

    /**
     * Commit transaction
     */
    public function commit() {
        try {
            return $this->connection->commit();
        } catch (PDOException $e) {
            throw new Exception("Failed to commit transaction: " . $e->getMessage());
        }
    }

    /**
     * Rollback transaction
     */
    public function rollback() {
        try {
            return $this->connection->rollback();
        } catch (PDOException $e) {
            throw new Exception("Failed to rollback transaction: " . $e->getMessage());
        }
    }

    /**
     * Get last insert ID
     */
    public function lastInsertId() {
        return $this->connection->lastInsertId();
    }

    /**
     * Test database connection
     */
    public function testConnection() {
        try {
            $stmt = $this->connection->query("SELECT 1");
            return $stmt->fetchColumn() === '1';
        } catch (PDOException $e) {
            return false;
        }
    }

    /**
     * Get database information
     */
    public function getDatabaseInfo() {
        try {
            $version = $this->connection->query("SELECT VERSION()")->fetchColumn();
            
            $tablesQuery = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
                           WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'";
            $stmt = $this->connection->prepare($tablesQuery);
            $stmt->execute([$this->database]);
            $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            $sizeQuery = "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
                         FROM INFORMATION_SCHEMA.TABLES 
                         WHERE TABLE_SCHEMA = ?";
            $sizeStmt = $this->connection->prepare($sizeQuery);
            $sizeStmt->execute([$this->database]);
            $sizeInfo = $sizeStmt->fetch();
            
            return [
                'version' => $version,
                'database' => $this->database,
                'tables' => $tables,
                'table_count' => count($tables),
                'size_mb' => $sizeInfo['size_mb'] ?? 0,
                'charset' => $this->charset,
                'connection' => 'active'
            ];
        } catch (PDOException $e) {
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Optimize database tables
     */
    public function optimizeTables() {
        try {
            $tables = $this->fetchAll("SHOW TABLES");
            $results = [];
            
            foreach ($tables as $table) {
                $tableName = array_values($table)[0];
                $result = $this->fetchOne("OPTIMIZE TABLE `{$tableName}`");
                $results[$tableName] = $result;
            }
            
            return $results;
        } catch (PDOException $e) {
            throw new Exception("Database optimization failed: " . $e->getMessage());
        }
    }

    /**
     * Create database backup (basic structure)
     */
    public function createBackup($backupPath = null) {
        try {
            if (!$backupPath) {
                $backupPath = __DIR__ . '/../logs/backup_' . date('Y-m-d_H-i-s') . '.sql';
            }
            
            $tables = $this->fetchAll("SHOW TABLES");
            $backup = "-- Database Backup Created: " . date('Y-m-d H:i:s') . "\n";
            $backup .= "-- Database: {$this->database}\n\n";
            
            foreach ($tables as $table) {
                $tableName = array_values($table)[0];
                
                // Get table structure
                $createTable = $this->fetchOne("SHOW CREATE TABLE `{$tableName}`");
                $backup .= "\n-- Table: {$tableName}\n";
                $backup .= $createTable['Create Table'] . ";\n\n";
                
                // Get table data
                $rows = $this->fetchAll("SELECT * FROM `{$tableName}`");
                if (!empty($rows)) {
                    $columns = implode('`, `', array_keys($rows[0]));
                    $backup .= "INSERT INTO `{$tableName}` (`{$columns}`) VALUES\n";
                    
                    $values = [];
                    foreach ($rows as $row) {
                        $rowValues = array_map(function($value) {
                            return $value === null ? 'NULL' : "'" . addslashes($value) . "'";
                        }, array_values($row));
                        $values[] = '(' . implode(', ', $rowValues) . ')';
                    }
                    
                    $backup .= implode(",\n", $values) . ";\n\n";
                }
            }
            
            file_put_contents($backupPath, $backup);
            return $backupPath;
            
        } catch (Exception $e) {
            throw new Exception("Backup creation failed: " . $e->getMessage());
        }
    }

    /**
     * Handle query errors
     */
    private function handleQueryError(PDOException $e, $sql, $params) {
        $errorInfo = [
            'message' => $e->getMessage(),
            'code' => $e->getCode(),
            'sql' => $sql,
            'params' => $params,
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ];
        
        error_log("Database Error: " . json_encode($errorInfo));
    }

    /**
     * Validate table name to prevent SQL injection
     */
    private function isValidTableName($tableName) {
        return preg_match('/^[a-zA-Z][a-zA-Z0-9_]*$/', $tableName);
    }

    /**
     * Validate column name to prevent SQL injection
     */
    private function isValidColumnName($columnName) {
        return preg_match('/^[a-zA-Z][a-zA-Z0-9_]*$/', $columnName);
    }

    /**
     * Prevent cloning of singleton
     */
    private function __clone() {}

    /**
     * Prevent unserialization of singleton
     */
    public function __wakeup() {
        throw new Exception("Cannot unserialize singleton");
    }

    /**
     * Close database connection on destruct
     */
    public function __destruct() {
        $this->connection = null;
    }
}

?>