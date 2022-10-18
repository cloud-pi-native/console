-- Creation of projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id    SERIAL  NOT NULL PRIMARY KEY, 
  data  JSONB   NOT NULL
);

CREATE UNIQUE INDEX project_id ON public.projects ( (data ->> 'id') );