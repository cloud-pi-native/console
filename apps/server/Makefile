PNPM = corepack pnpm

-include .env
ifeq ($(DOCKER),true)
-include .env.docker
endif
ifeq ($(INTEGRATION),true)
-include .env.integ
endif

db-generate:
	$(PNPM) --filter @cpn-console/database run generate

db-migrate:
	$(PNPM) --filter @cpn-console/database run migrate

db-deploy:
	$(PNPM) --filter @cpn-console/database run deploy

db-diff:
	$(PNPM) --filter @cpn-console/database run diff

db-reset:
	$(PNPM) --filter @cpn-console/database run reset
