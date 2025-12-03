import {
    type ServiceChain,
    ServiceChainDetailsSchema,
    ServiceChainFlowsSchema,
    ServiceChainListSchema,
} from '@cpn-console/shared';
import axios from 'axios';
import https from 'node:https';

const openCDSEnvVar = 'OPENCDS_URL';
const openCDSTargetURL = process.env[openCDSEnvVar];
const openCDSDisabledErrorMessage = `OpenCDS is disabled, please set ${openCDSEnvVar} in your relevant .env file. See .env-example`;

function getClient() {
    if (!openCDSTargetURL) {
        throw new Error(openCDSDisabledErrorMessage);
    }
    return axios.create({
        baseURL: openCDSTargetURL,
        httpsAgent: new https.Agent({
            rejectUnauthorized:
                // We want it to be `false` only if it has explicitly
                // been stated as "false" in the env vars
                process.env.OPENCDS_API_TLS_REJECT_UNAUTHORIZED !== 'false',
        }),
        headers: {
            'X-API-Key': process.env.OPENCDS_API_TOKEN,
        },
    });
}

export async function listServiceChains() {
    return ServiceChainListSchema.parse(
        (await getClient().get(`/requests`)).data,
    );
}

export async function getServiceChainDetails(
    serviceChainId: ServiceChain['id'],
) {
    return ServiceChainDetailsSchema.parse(
        (await getClient().get(`/requests/${serviceChainId}`)).data,
    );
}

export async function retryServiceChain(serviceChainId: ServiceChain['id']) {
    return await getClient().post(`/requests/${serviceChainId}/retry`);
}

export async function validateServiceChain(validationId: string) {
    return await getClient().post(`/validate/${validationId}`);
}

export async function getServiceChainFlows(serviceChainId: ServiceChain['id']) {
    return ServiceChainFlowsSchema.parse(
        (await getClient().get(`/requests/${serviceChainId}/flows`)).data,
    );
}
