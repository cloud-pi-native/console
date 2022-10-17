-- Creation of projects table
CREATE TABLE IF NOT EXISTS projects (
  id       INT PRIMARY KEY, 
  project  JSONB NOT NULL
);