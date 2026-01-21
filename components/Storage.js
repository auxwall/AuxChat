import AsyncStorage from '@react-native-async-storage/async-storage';

export const setStorage = async ({ key, value }) => {
  try {
    await AsyncStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    return true;
  } catch (err) {
    throw err;
  }
};

export const getStorage = async (key) => {
  try {
    return await AsyncStorage.getItem(key);
  } catch (err) {
    throw err;
  }
};

export const removeStorage = async (key) => {
  try {
    return await AsyncStorage.removeItem(key);
  } catch (err) {
    throw err;
  }
};
