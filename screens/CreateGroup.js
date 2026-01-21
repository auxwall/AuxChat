import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { CreateGroup, staffConfig, usePeople } from '@auxwall/messenger';
import { getFeathersClient, authenticateFeathers, getApiUrl } from '../utility/feathersClient';
import { getStorage } from '../components/Storage';
import { useNavigation } from '@react-navigation/native';
import color from '../utility/color';

import { StatusBar } from 'expo-status-bar';

const CreateGroupScreen = () => {
    const navigation = useNavigation();
    const [client, setClient] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
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
                console.error("Create group screen init error:", e.message);
            } finally {
                setLoadingConfig(false);
            }
        }
        init();
    }, []);

    const { members, staff, loading: peopleLoading } = usePeople({
        apiBaseUrl: config.apiBaseUrl,
        accessToken: config.accessToken,
        search: searchTerm,
        companyId: userData?.companyId
    });

    const chatConfig = {
        ...staffConfig,
        theme: {
            ...staffConfig.theme,
            primaryColor: color.primary,
            backgroundColor: '#ffffff',
            textColor: color.primary,
            cardBackground: '#ffffff',
            navigatorBackgroundColor: color.primary,
        }
    };

    if (loadingConfig || !client) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={color.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <CreateGroup
                feathersClient={client}
                currentUser={userData}
                members={members}
                staffs={staff}
                config={chatConfig}
                loading={peopleLoading}
                onSearchChange={setSearchTerm}
                onBack={() => navigation.goBack()}
                onGroupCreated={(conversation) => {
                    navigation.replace("ChatDetail", {
                        id: conversation.id,
                        title: conversation.name,
                        image: conversation.imageURL || '#'
                    });
                }}
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

export default CreateGroupScreen;
