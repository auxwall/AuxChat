import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const STAFF_PREFIX = 700000;

export const registerForPushNotificationsAsync = async (staffId, accessToken) => {
  if (!Device.isDevice) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for chat app');
    return;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const expoPushToken = tokenData.data;

  await saveTokenIfChanged(expoPushToken, staffId, accessToken);
};

export const saveTokenIfChanged = async (newToken, staffId, accessToken) => {
  try {
    const virtualId = STAFF_PREFIX + parseInt(staffId);
    const oldToken = await AsyncStorage.getItem('expoPushToken_for_' + virtualId);
    const endPoint = await AsyncStorage.getItem('endPoint');
    const companyId = await AsyncStorage.getItem('companyId');
    console.log('oldToken', oldToken);
    console.log('newToken', newToken);
    console.log('endPoint', endPoint);
    console.log('companyId', companyId);
    if (oldToken !== newToken && endPoint && companyId) {
      // Save new token in backend
      await axios.post(`${endPoint}/api/save_token/${companyId}`, 
        {
          userId: virtualId, 
          token: newToken,
        },
        {
          headers: { 'Authorization': `bearer ${accessToken}` }
        }
      );
      await AsyncStorage.setItem('expoPushToken_for_' + virtualId, newToken);
    }
  } catch (err) {
    console.log('Error saving chat app token', err);
  }
};

export const removePushTokenAsync = async () => {
  try {
    const userId = await AsyncStorage.getItem('userId');
    const endPoint = await AsyncStorage.getItem('endPoint');
    const companyId = await AsyncStorage.getItem('companyId');

    if (userId && companyId) {
      const virtualId = STAFF_PREFIX + parseInt(userId);
      const pushTokenKey = 'expoPushToken_for_' + virtualId;
      const pushToken = await AsyncStorage.getItem(pushTokenKey);
      if (pushToken) {
        await axios.post(`${endPoint}/api/remove_token/${companyId}`, 
          {
            userId: virtualId, 
            token: pushToken,
          }
        );
      }
      await AsyncStorage.removeItem(pushTokenKey);
    }
  } catch (err) {
    console.log('Error removing chat app push token', err);
  }
};
