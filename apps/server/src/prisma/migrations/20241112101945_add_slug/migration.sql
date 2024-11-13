-- AlterTable
ALTER TABLE "Project" ADD COLUMN "slug" TEXT;

UPDATE public."Project" p
SET slug = (
  SELECT concat(org.name, '-', subp.name) FROM public."Project" subp
  LEFT JOIN public."Organization" org on org."id" = subp."organizationId"
  WHERE subp.id = p.id
);

ALTER TABLE public."Project"  ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
