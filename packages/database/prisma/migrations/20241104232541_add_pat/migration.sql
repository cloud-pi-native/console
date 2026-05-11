-- CreateTable (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PersonalAccessToken') THEN
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
    END IF;
END $$;

-- CreateIndex (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'PersonalAccessToken_id_key') THEN
        CREATE UNIQUE INDEX "PersonalAccessToken_id_key" ON "PersonalAccessToken"("id");
    END IF;
END $$;

-- AddForeignKey (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PersonalAccessToken_userId_fkey') THEN
        ALTER TABLE "PersonalAccessToken" ADD CONSTRAINT "PersonalAccessToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Process AdminToken (idempotent)
DO $$
DECLARE
    admin_token record;
    user_uuid UUID;
BEGIN
    FOR admin_token IN SELECT "name", "id"
        FROM public."AdminToken"
    LOOP
        -- Generate new UUID if user does not exist
        user_uuid := COALESCE(
            (SELECT id FROM public."User" WHERE email = concat(admin_token.name, '@bot.id')),
            gen_random_uuid()
        );

        -- Insert user if not already exists
        INSERT INTO public."User" (id, "firstName", "lastName", email, "createdAt", "updatedAt", "type")
            VALUES(user_uuid, 'Bot Admin', admin_token.name, concat(admin_token.name, '@bot.id'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'bot')
            ON CONFLICT (id) DO NOTHING;

        -- Update AdminToken with the new user ID
        UPDATE public."AdminToken" SET "userId" = user_uuid WHERE id = admin_token.id;
    END LOOP;
END $$;

-- Alter AdminToken userId column to NOT NULL (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'AdminToken' AND column_name = 'userId' AND is_nullable = 'NO') THEN
        ALTER TABLE public."AdminToken" ALTER COLUMN "userId" SET NOT NULL;
    END IF;
END $$;

-- DropForeignKey if exists (idempotent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'AdminToken_userId_fkey') THEN
        ALTER TABLE "AdminToken" DROP CONSTRAINT "AdminToken_userId_fkey";
    END IF;
END $$;

-- AddForeignKey (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'AdminToken_userId_fkey') THEN
        ALTER TABLE "AdminToken" ADD CONSTRAINT "AdminToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
