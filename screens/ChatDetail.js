import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { ChatScreen, staffConfig } from '@auxwall/messenger';
import { getFeathersClient, authenticateFeathers, getApiUrl } from '../utility/feathersClient';
import { getStorage } from '../components/Storage';
import { useRoute, useNavigation } from '@react-navigation/native';
import color from '../utility/color';
import { StatusBar } from 'expo-status-bar';

const ChatDetailScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { id, title, image, targetId, targetType, targetName } = route.params;

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

    const chatConfig = {
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
