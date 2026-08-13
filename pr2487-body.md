## Issues liées

Issues numéro:
- Closes #2486

## Quel est le comportement actuel ?

Le module `zone` (CRUD des zones topographiques) est servi par l'ancienne application Fastify `apps/server`.

## Quel est le nouveau comportement ?

Migration du module `zone` vers `apps/server-nestjs` :
- `ZoneController` : routes `GET /`, `GET /:zoneId`, `POST /`, `PUT /:zoneId`, `DELETE /:zoneId`, `PATCH /:zoneId` (réponses `204 No Content` sur suppression/mise à jour).
- `ZoneService` : logique métier + émission des hooks `zone.upsert` / `zone.delete` via `AppEventsService` (ces listeners orphelins sur `main` reçoivent enfin un émetteur).
- `ZoneQueriesUtils` / `ZoneTestingUtils` : sélections Prisma typées et fabriques `faker`.
- Enregistrement du module dans `main.module.ts` + routage nginx-strangler (`apps/nginx-strangler/conf.d/routing.conf`).

Parité vérifiée contre `apps/server/src/resources/zone/business.ts` : hooks `upsert`/`upsert`/`delete` reproduits, validation Zod alignée.

## Cette PR introduit-elle un breaking change ?

Non.

## Autres informations

Nettoyage des imports inutilisés (`zoneSelect`, `vi`) et suppression de `zone.utils.ts` devenu mort.
