import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ChatList, staffConfig, formatConversationTitle } from '@auxwall/messenger';
import { getFeathersClient, authenticateFeathers } from '../utility/feathersClient';
import { getStorage, removeStorage } from '../components/Storage';
import { useNavigation } from '@react-navigation/native';
import color from '../utility/color';
import { Ionicons } from '@expo/vector-icons';
import { DeviceEventEmitter } from 'react-native';

export default function ChatListScreen() {
  const [client, setClient] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members');
  const navigation = useNavigation();

  useEffect(() => {
    async function init() {
      try {
        const c = await getFeathersClient();
        
        const userStr = await getStorage("appUser");
        const user = userStr ? JSON.parse(userStr) : null;
        
        setUserData(user);
        setClient(c);
        
        await authenticateFeathers();
      } catch (e) {
        console.error("Chat list init error:", e.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: 'AuxChat',
      headerStyle: {
        backgroundColor: color.primary,
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
      headerRight: () => (
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const chatConfig = {
    ...staffConfig,
    theme: {
      ...staffConfig.theme,
      primaryColor: color.primary,
      backgroundColor: '#fff',
      textColor: color.primary,
      cardBackground: '#fff',
      borderColor: '#f0f0f0',
      navigatorBackgroundColor: color.primary,
      lightTextColor: color.gray,
    }
  };

  const handleSelect = (conversation) => {
    const title = formatConversationTitle(conversation, userData?.id);
    const image = conversation.imageURL || conversation.image || '';
    
    navigation.navigate("ChatDetail", { 
      id: conversation.id,
      title: title,
      image: image
    });
  };

  const handleLogout = async () => {
    try {
      await removeStorage('accessToken');
      await removeStorage('appUser');
      await removeStorage('savedUser');
      DeviceEventEmitter.emit('event.logout');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading || !client) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={color.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ChatList 
        feathersClient={client} 
        currentUser={userData} 
        onSelectConversation={handleSelect} 
        config={chatConfig} 
        onTabChange={setActiveTab} 
      />
      
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => activeTab === 'groups' ? navigation.navigate("CreateGroup") : navigation.navigate("NewChat")}
        activeOpacity={0.8}
      >
        <View style={[styles.bubble, { backgroundColor: color.primary }]}>
          <Ionicons name={activeTab === 'groups' ? "people" : "add"} size={30} color="#fff" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  fab: {
    position: 'absolute',
    bottom: 60,
    right: 40,
    zIndex: 999,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  bubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    padding: 7,
  },
});
