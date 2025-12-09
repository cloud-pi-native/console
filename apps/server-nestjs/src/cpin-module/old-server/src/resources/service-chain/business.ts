import {
    getServiceChainDetails as getServiceChainDetailsQuery,
    getServiceChainFlows as getServiceChainFlowsQuery,
    listServiceChains as listServiceChainsQuery,
    retryServiceChain as retryServiceChainQuery,
    validateServiceChain as validateServiceChainQuery,
} from '@old-server/resources/queries-index';

export async function listServiceChains() {
    return listServiceChainsQuery();
}

export async function getServiceChainDetails(serviceChainId: string) {
    return getServiceChainDetailsQuery(serviceChainId);
}

export async function retryServiceChain(serviceChainId: string) {
    return retryServiceChainQuery(serviceChainId);
}

export async function validateServiceChain(validationId: string) {
    return validateServiceChainQuery(validationId);
}

export async function getServiceChainFlows(serviceChainId: string) {
    return getServiceChainFlowsQuery(serviceChainId);
}
