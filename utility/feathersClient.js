import { feathersManager } from '@auxwall/messenger';
import { getStorage } from '../components/Storage';

export const getFeathersClient = async () => {
    const client = feathersManager.getClient();
    if (client) return client;

    const apiUrl = await getStorage("endPoint");
    if (!apiUrl) throw new Error("API URL not found in storage");

    return await feathersManager.init({
        apiUrl: apiUrl,
        storage: {
            getItem: getStorage,
            setItem: () => {},
            removeItem: () => {}
        },
        storageKey: 'accessToken'
    });
};

export const getSocket = async () => {
    const socket = feathersManager.getSocket();
    if (socket) return socket;
    await getFeathersClient();
    return feathersManager.getSocket();
};

export const getApiUrl = async () => {
    const url = feathersManager.getApiUrl();
    if (url) return url;
    await getFeathersClient();
    return feathersManager.getApiUrl();
};

export const authenticateFeathers = async (token) => {
    try {
        await getFeathersClient();
        
        if (!token) {
            token = await getStorage('accessToken');
        }

        if (!token) return null;

        const userStr = await getStorage("appUser");
        const user = userStr ? JSON.parse(userStr) : {};
        const companyId = await getStorage("companyId") || '1';

        return await feathersManager.authenticate({
            token,
            companyId
        });
    } catch (error) {
        console.error("Feathers Auth Critical Error:", error);
        throw error;
    }
};

export default { getFeathersClient, getSocket, authenticateFeathers, getApiUrl };
