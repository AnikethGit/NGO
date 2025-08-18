<?php
require_once '../includes/database.php';
require_once '../includes/functions.php';

header('Content-Type: application/json');

$db = Database::getInstance();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            getProject($db, $_GET['id']);
        } else {
            getProjects($db, $_GET);
        }
        break;

    case 'POST':
        requireAuth(['admin']);
        $input = json_decode(file_get_contents('php://input'), true);
        createProject($db, $input);
        break;

    case 'PUT':
        requireAuth(['admin']);
        $input = json_decode(file_get_contents('php://input'), true);
        updateProject($db, $input);
        break;

    case 'DELETE':
        requireAuth(['admin']);
        $input = json_decode(file_get_contents('php://input'), true);
        deleteProject($db, $input['id']);
        break;

    default:
        response(['error' => 'Method not allowed'], 405);
}

function getProjects($db, $params) {
    try {
        $page = $params['page'] ?? 1;
        $limit = $params['limit'] ?? 20;
        $offset = ($page - 1) * $limit;
        
        $where = "1=1";
        $whereParams = [];
        
        if (!empty($params['status'])) {
            $where .= " AND status = ?";
            $whereParams[] = $params['status'];
        }

        $projects = $db->fetchAll(
            "SELECT p.*, u.name as manager_name FROM projects p 
             LEFT JOIN users u ON p.manager_id = u.id 
             WHERE {$where} ORDER BY p.created_at DESC LIMIT {$limit} OFFSET {$offset}",
            $whereParams
        );

        $total = $db->fetchOne("SELECT COUNT(*) as count FROM projects WHERE {$where}", $whereParams);
        
        response([
            'success' => true,
            'data' => $projects,
            'total' => $total['count'],
            'page' => $page,
            'totalPages' => ceil($total['count'] / $limit)
        ]);

    } catch (Exception $e) {
        response(['error' => 'Failed to fetch projects'], 500);
    }
}

function createProject($db, $data) {
    try {
        $required = ['name', 'description', 'budget'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                response(['error' => "Field {$field} is required"], 400);
            }
        }

        $projectData = [
            'name' => $data['name'],
            'description' => $data['description'],
            'budget' => $data['budget'],
            'start_date' => $data['start_date'] ?? null,
            'end_date' => $data['end_date'] ?? null,
            'location' => $data['location'] ?? null,
            'manager_id' => $_SESSION['user_id']
        ];

        $projectId = $db->insert('projects', $projectData);

        if ($projectId) {
            response(['success' => true, 'project_id' => $projectId]);
        } else {
            response(['error' => 'Failed to create project'], 500);
        }

    } catch (Exception $e) {
        response(['error' => 'Project creation failed'], 500);
    }
}
?>
