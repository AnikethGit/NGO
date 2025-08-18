-- Create database
CREATE DATABASE IF NOT EXISTS ngo_management;
USE ngo_management;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15),
    password VARCHAR(255) NOT NULL,
    user_type ENUM('admin', 'volunteer', 'user') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    profile_image VARCHAR(255),
    address TEXT,
    pan_number VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Donations table
CREATE TABLE donations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donor_name VARCHAR(100) NOT NULL,
    donor_email VARCHAR(100) NOT NULL,
    donor_phone VARCHAR(15),
    donor_address TEXT,
    donor_pan VARCHAR(10),
    amount DECIMAL(10,2) NOT NULL,
    cause ENUM('poor-feeding', 'education', 'medical', 'disaster', 'general') NOT NULL,
    frequency ENUM('one-time', 'monthly', 'yearly') DEFAULT 'one-time',
    transaction_id VARCHAR(50),
    payment_method VARCHAR(50),
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    receipt_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    budget DECIMAL(12,2) NOT NULL,
    amount_raised DECIMAL(12,2) DEFAULT 0,
    progress INT DEFAULT 0,
    status ENUM('planning', 'active', 'completed', 'on-hold', 'cancelled') DEFAULT 'planning',
    start_date DATE,
    end_date DATE,
    location VARCHAR(200),
    manager_id INT,
    image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES users(id)
);

-- Events table
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    event_date DATETIME NOT NULL,
    location VARCHAR(200) NOT NULL,
    max_attendees INT,
    current_attendees INT DEFAULT 0,
    registration_fee DECIMAL(8,2) DEFAULT 0,
    status ENUM('upcoming', 'ongoing', 'completed', 'cancelled') DEFAULT 'upcoming',
    organizer_id INT,
    image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users(id)
);

-- Event registrations table
CREATE TABLE event_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT,
    participant_name VARCHAR(100) NOT NULL,
    participant_email VARCHAR(100) NOT NULL,
    participant_phone VARCHAR(15),
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('registered', 'attended', 'cancelled') DEFAULT 'registered',
    FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Volunteer schedules table
CREATE TABLE volunteer_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    volunteer_id INT NOT NULL,
    project_id INT,
    event_id INT,
    schedule_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    task_description TEXT,
    status ENUM('scheduled', 'confirmed', 'completed', 'cancelled') DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (volunteer_id) REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (event_id) REFERENCES events(id)
);

-- Reports table
CREATE TABLE reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    type ENUM('donation', 'project', 'volunteer', 'event', 'financial') NOT NULL,
    content TEXT,
    file_path VARCHAR(255),
    generated_by INT NOT NULL,
    date_from DATE,
    date_to DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (generated_by) REFERENCES users(id)
);

-- Insert default admin user
INSERT INTO users (name, email, password, user_type) VALUES 
('Administrator', 'admin@saisevafoundation.org', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Insert sample data
INSERT INTO projects (name, description, budget, progress, status, start_date, end_date, location) VALUES
('Poor Feeding Program - Shirdi', 'Daily meal program for underprivileged children and families', 500000.00, 75, 'active', '2025-01-01', '2025-12-31', 'Shirdi, Maharashtra'),
('Educational Support Initiative', 'Providing books, uniforms, and learning materials to students', 200000.00, 50, 'active', '2025-02-01', '2025-11-30', 'Ghanagapur'),
('Free Medical Camp Network', 'Regular health checkups and medicine distribution', 300000.00, 60, 'active', '2025-01-15', '2025-12-15', 'Multiple Locations');

INSERT INTO events (name, description, event_date, location, max_attendees) VALUES
('Free Medical Camp', 'Comprehensive health checkup and medicine distribution', '2025-08-15 09:00:00', 'Ghanagapur Community Center', 200),
('Educational Seminar', 'Values and ethics seminar for youth', '2025-08-20 14:00:00', 'Shirdi Hall', 100),
('Disaster Relief Training', 'Training volunteers for emergency response', '2025-08-25 10:00:00', 'Training Center', 50);
