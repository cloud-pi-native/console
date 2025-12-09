import { describe, expect, it } from 'vitest';

import { userPayloadMapper } from './keycloak-utils';

describe('keycloak', () => {
    it('should map keycloak user object to DSO user object without groups', () => {
        const payload = {
            sub: 'thisIsAnId',
            email: 'test@test.com',
            given_name: 'Jean',
            family_name: 'DUPOND',
        };
        const desired = {
            id: 'thisIsAnId',
            email: 'test@test.com',
            firstName: 'Jean',
            lastName: 'DUPOND',
            groups: [],
        };

        const transformed = userPayloadMapper(payload);

        expect(transformed).toMatchObject(desired);
    });

    it('should map keycloak user object to DSO user object with groups', () => {
        const payload = {
            sub: 'thisIsAnId',
            email: 'test@test.com',
            given_name: 'Jean',
            family_name: 'DUPOND',
            groups: ['group1'],
        };
        const desired = {
            id: 'thisIsAnId',
            email: 'test@test.com',
            firstName: 'Jean',
            lastName: 'DUPOND',
            groups: ['group1'],
        };

        const transformed = userPayloadMapper(payload);

        expect(transformed).toMatchObject(desired);
    });
});
