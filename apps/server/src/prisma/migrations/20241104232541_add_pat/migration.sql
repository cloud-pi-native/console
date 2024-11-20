-- CreateTable
CREATE TABLE "PersonalAccessToken" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expirationDate" TIMESTAMP(3) NOT NULL,
    "lastUse" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "TokenStatus" NOT NULL DEFAULT 'active',
    "hash" TEXT NOT NULL,

    CONSTRAINT "PersonalAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonalAccessToken_id_key" ON "PersonalAccessToken"("id");

-- AddForeignKey
ALTER TABLE "PersonalAccessToken" ADD CONSTRAINT "PersonalAccessToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


DO $$
DECLARE
    admin_token record;
    user_uuid UUID;
BEGIN
    FOR admin_token IN SELECT "name"
        FROM public."AdminToken"
    LOOP
        user_uuid := gen_random_uuid();
        INSERT INTO public."User" (id, "firstName", "lastName", email, "createdAt", "updatedAt", "type")
            VALUES(user_uuid, 'Bot Admin', admin_token.name, concat(admin_token.name, '@bot.id'),  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'bot')
            ON CONFLICT (id) DO NOTHING;
        UPDATE public."AdminToken" SET "userId" = user_uuid WHERE id = admin_token.id;
    END LOOP;
END $$;

ALTER TABLE public."AdminToken"  ALTER COLUMN "userId" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "AdminToken" DROP CONSTRAINT "AdminToken_userId_fkey";

-- AddForeignKey
ALTER TABLE "AdminToken" ADD CONSTRAINT "AdminToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;