-- Creation of projects table
CREATE TABLE IF NOT EXISTS "Projects" (
  id            SERIAL  NOT NULL PRIMARY KEY, 
  data          JSONB   NOT NULL,
  "createdAt"   DATE,
  "updatedAt"   DATE
);

CREATE UNIQUE INDEX project_id ON "Projects" ( (data ->> 'id') );