import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { ChatScreen, staffConfig, useFileUpload } from '@auxwall/messenger';
import { getFeathersClient, authenticateFeathers, getApiUrl } from '../utility/feathersClient';
import { getStorage } from '../components/Storage';
import { useRoute, useNavigation } from '@react-navigation/native';
import color from '../utility/color';
import { StatusBar } from 'expo-status-bar';

const ChatDetailScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { id, title, image, targetId, targetType, targetName, sharedFile } = route.params;

    const [client, setClient] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState({ apiBaseUrl: '', accessToken: '' });

    useEffect(() => {
        async function init() {
            try {
                const c = await getFeathersClient();
                const [userStr, accessToken, apiBaseUrl] = await Promise.all([
                    getStorage("appUser"),
                    getStorage("accessToken"),
                    getApiUrl()
                ]);

                const user = userStr ? JSON.parse(userStr) : null;
                setConfig({ apiBaseUrl, accessToken });
                setUserData(user);
                setClient(c);

                await authenticateFeathers();
            } catch (e) {
                console.log("Chat detail init error:", e.message);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, [id]);

    const targetUserObj = (id === 'pending' || !id) && targetId ? {
        id: targetId,
        userType: targetType,
        name: (targetName || title)
    } : undefined;

    const chatConfigObj = {
        ...staffConfig,
        upload: {
            ...staffConfig.upload,
            allowedDocumentTypes: '*/*',
        },
        theme: {
            ...staffConfig.theme,
            primaryColor: color.primary,
            backgroundColor: '#e5ddd5',
            textColor: color.primary,
            cardBackground: '#ffffff',
            navigatorBackgroundColor: color.primary,
            messageBackgroundColor: color.white,
            myMessageTextColor: '#fff',
            tickColor: '#fff',
        }
    };

    const { uploadFileToBackend } = useFileUpload({ config: chatConfigObj, apiBaseUrl: config.apiBaseUrl, accessToken: config.accessToken });
    const [hasUploaded, setHasUploaded] = useState(false);

    useEffect(() => {
        if (sharedFile && client && userData && config.accessToken && !hasUploaded) {
            handleUploadSharedFile();
        }
    }, [sharedFile, client, userData, config.accessToken, hasUploaded]);

    const handleUploadSharedFile = async () => {
        setHasUploaded(true);
        try {
            let activeId = id === 'pending' ? null : id;
            
            if (!activeId && targetUserObj) {
                const convService = client.service('api/conversations');
                const query = { type: 'individual', companyId: userData.companyId };
                if (targetUserObj.userType === 'member') {
                    query.clientId = targetUserObj.id;
                    query.staffId = userData.id;
                } else {
                    query.staffId = targetUserObj.id;
                }
                const res = await convService.find({ query });
                let existingConv = (res.data || res).find(c => 
                    c.participants &&
                    c.participants.some(p => String(p.userId) === String(targetUserObj.id)) &&
                    c.participants.some(p => String(p.userId) === String(userData.id))
                );
                
                if (!existingConv) {
                    const createData = { type: 'individual', name: targetUserObj.name, createdByType: 'staff' };
                    if (targetUserObj.userType === 'member') {
                        createData.clientId = targetUserObj.id;
                        createData.staffId = userData.id;
                    } else {
                        createData.staffId = targetUserObj.id;
                    }
                    existingConv = await convService.create(createData, { query: { companyId: userData.companyId } });
                }
                activeId = existingConv.id;
            }

            if (activeId) {
                const type = sharedFile.mimeType.startsWith('image/') ? 'image' : (sharedFile.mimeType.startsWith('audio/') ? 'audio' : 'document');
                await uploadFileToBackend(sharedFile.uri, sharedFile.name, sharedFile.mimeType, {
                    conversationId: activeId,
                    type: type,
                    senderId: userData.id,
                    companyId: userData.companyId
                });
            }
        } catch(e) {
            console.log("File Upload Error", e);
        }
    };

    const chatConfig = chatConfigObj;

    if (loading || !client) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={color.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <ChatScreen
                feathersClient={client}
                conversationId={id === 'pending' ? undefined : id}
                targetUser={targetUserObj}
                currentUser={userData}
                title={title}
                headerImage={image}
                config={chatConfig}
                apiBaseUrl={config.apiBaseUrl}
                accessToken={config.accessToken}
                onBack={() => navigation.goBack()}
                trainer={userData}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
});

export default ChatDetailScreen;
