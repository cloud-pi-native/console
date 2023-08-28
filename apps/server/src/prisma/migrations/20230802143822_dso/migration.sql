CREATE TYPE "ProjectStatus" AS ENUM ('initializing', 'created', 'failed', 'archived');

ALTER TABLE  public."Project" ALTER COLUMN status TYPE "ProjectStatus" USING 
	case 
		when status = 'created' then 'created'::"ProjectStatus"
		when status = 'failed' then 'failed'::"ProjectStatus"
		when status = 'archived' then 'archived'::"ProjectStatus"
		else 'initializing'::"ProjectStatus"
	end;
ALTER TABLE  public."Project" ALTER COLUMN status SET DEFAULT 'initializing';
