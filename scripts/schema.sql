-- NID Website Database Schema
-- Run via: npm run init-db

-- Users / Login table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  batch_year VARCHAR(10) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_username (username)
);

-- Sem1 marks (can extend for more semesters later)
CREATE TABLE IF NOT EXISTS sem_marks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  marks DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_sem (user_id)
);

-- Disciplines
CREATE TABLE IF NOT EXISTS disciplines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL
);

-- Preferences with versioning (keeps old data for trend analysis)
CREATE TABLE IF NOT EXISTS preference_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  version INT NOT NULL,
  pref_1 INT NOT NULL,
  pref_2 INT NOT NULL,
  pref_3 INT NOT NULL,
  pref_4 INT NOT NULL,
  pref_5 INT NOT NULL,
  pref_6 INT NOT NULL,
  pref_7 INT NOT NULL,
  pref_8 INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_version (user_id, version)
);

-- Discipline IDs for reference:
-- 1: textile_design, 2: product_design, 3: glass_ceramics_design,
-- 4: furniture_interior_design, 5: film_video_communication,
-- 6: graphic_design, 7: animation, 8: exhibition_design
