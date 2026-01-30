import React, { useCallback, useEffect, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DeviceEventEmitter, TouchableOpacity, Text, Platform, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { feathersManager } from '@auxwall/messenger';
import * as Notifications from 'expo-notifications';
import * as ScreenCapture from 'expo-screen-capture';
import { registerForPushNotificationsAsync } from './utility/registerPushNotification';

const navigationRef = createNavigationContainerRef();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Import Screens
import Login from './screens/Login';
import ChatListScreen from './screens/ChatList';
import ChatDetailScreen from './screens/ChatDetail';
import NewChatScreen from './screens/NewChat';
import CreateGroupScreen from './screens/CreateGroup';

// Utilities
import { getStorage } from './components/Storage';
import color from './utility/color';
import { Ionicons } from '@expo/vector-icons';

const Stack = createNativeStackNavigator();
const MessagesStack = createNativeStackNavigator();

const MessagesStackScreen = ({ navigation }) => (
  <MessagesStack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: color.primary,
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <MessagesStack.Screen
      name="ChatList"
      component={ChatListScreen}
      options={{ 
        title: 'Messages',
      }}
    />
    <MessagesStack.Screen
      name="ChatDetail"
      component={ChatDetailScreen}
      options={{ headerShown: false }}
    />
    <MessagesStack.Screen
      name="NewChat"
      component={NewChatScreen}
      options={({ navigation }) => ({
        title: "New Message",
        headerBackTitleVisible: false,
        headerBackVisible: false,
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{display:'flex', flexDirection:'row', alignItems:'center', paddingRight: 12 }} >
            <Ionicons name="chevron-back" size={24} color="#fff" />
            <Text style={{ color: '#fff' }}>Back</Text>
          </TouchableOpacity>
        ),
      })}
    />
    <MessagesStack.Screen
      name="CreateGroup"
      component={CreateGroupScreen}
      options={{ headerShown: false }}
    />
  </MessagesStack.Navigator>
);

export default function App() {
  // Global screenshot and screen recording restriction
  ScreenCapture.usePreventScreenCapture();

  useEffect(() => {
    const subscription = ScreenCapture.addScreenshotListener(() => {
      Alert.alert(
        "Permission Denied",
        "For security reasons, screenshots are not allowed in this app.",
        [{ text: "OK" }]
      );
    });
    return () => subscription.remove();
  }, []);

  const [user, setUser] = useState(false);
  const [endPoint, setEndPoint] = useState(false);

  useEffect(() => {
    // Check for saved API endpoint
    getStorage('endPoint').then((res) => {
      if (res) setEndPoint(res);
    }).catch(err => console.log(err));

    // Check for saved login
    Promise.all([getStorage('accessToken'), getStorage('userName')]).then((res) => {
      if (res[0]) {
        setUser(res[1]);
      }
    }).catch(err => console.log('Login check error', err));

    // Logout listener
    const subscription = DeviceEventEmitter.addListener('event.logout', () => {
      feathersManager.logout().catch(err => console.log('Network logout error', err));
      setUser(false);
    });

    const notificationSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const { screen, params } = response.notification.request.content.data;
      
      if (screen === 'ChatScreen' || screen === 'ChatDetail') {
        const conversationId = params?.conversationId || params?.id;
        if (conversationId && navigationRef.isReady()) {
          navigationRef.navigate('Messages', {
            screen: 'ChatDetail',
            params: { id: conversationId, title: params?.title }
          });
        }
      }
    });

    return () => {
      subscription.remove();
      notificationSubscription.remove();
    };
  }, []);

  // Sync push token and setup Android channels
  useEffect(() => {
    async function setupNotifications() {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      if (user && endPoint) {
        try {
          const userId = await getStorage('userId');
          const accessToken = await getStorage('accessToken');
          if (userId && accessToken) {
            await registerForPushNotificationsAsync(userId, accessToken);
          }
        } catch (err) {
          console.log('Background push sync failed', err);
        }
      }
    }
    setupNotifications();
  }, [user, endPoint]);

  const setEndPointCallback = useCallback((value) => {
    setEndPoint(value);
  }, []);

  const setLoginCallBack = useCallback((value) => {
    setUser(value);
  }, []);

  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor={color.primary} />
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {endPoint && user ? (
            <Stack.Screen name="Messages" component={MessagesStackScreen} />
          ) : (
            <Stack.Screen name="Auth">
              {(props) => <Login {...props} setConfig={setEndPointCallback} setLogin={setLoginCallBack} />}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
