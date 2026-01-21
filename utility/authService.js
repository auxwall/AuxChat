import axios from 'axios';
import { getStorage } from '../components/Storage';

export const login = async ({ userName, password }) => {
  const endPoint = await getStorage('endPoint');
  if (!endPoint) throw new Error("API URL not set");

  try {
    const response = await axios.post(`${endPoint}/api/login`, {
      userName,
      password
    });
    
    if (response?.data?.data) {
      return {
        status: true,
        data: response.data.data
      };
    } else {
      throw new Error(response.data?.message || "Login failed");
    }
  } catch (error) {
    console.log("Login API Error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message || "Connection error");
  }
};
