import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { login } from '../utility/authService';
import { getStorage, setStorage } from '../components/Storage';
import axios from 'axios';
import color from '../utility/color';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';


export default function Login({ setConfig, setLogin }) {
  const [inputAnimation, setInputAnimation] = useState('');
  const [error, setError] = useState('');
  const [data, setData] = useState({});
  const [configInput, setConfigInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showApiInput, setShowApiInput] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);

  useEffect(() => {
    checkApiUrl();
    getStorage('endPoint').then(res => { if(res) setConfigInput(res); });
  }, []);

  const checkApiUrl = async () => {
    try {
      const savedApiUrl = await getStorage('endPoint');
      if (!savedApiUrl) {
        setShowApiInput(true);
      } else {
        autoLogin();
      }
    } catch (error) {
      console.error("Error checking API URL:", error);
      setShowApiInput(true);
    }
  };

  const autoLogin = async () => {
    setLoading(true);
    try {
      const savedUser = await getStorage('savedUser');
      if (savedUser) {
        const { userName, password } = JSON.parse(savedUser);
        if (userName && password) {
          await handleLogin(userName, password, true);
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Auto-login failed:", error);
      setLoading(false);
    }
  };



  const handleApiUrlSave = async () => {
    try {
      let input = configInput?.trim();
      let finalEndPoint = "";

      if (input) {
        // ✅ Case 1: 6-digit company code
        if (/^\d{6}$/.test(input)) {
          setBtnLoading(true);
          try {
            const companyResponse = await axios.get(`https://admin.auxwall.com/api/companies/${input}`);
            const companyData = companyResponse.data;

            if (!companyData?.apiUrl) {
              throw new Error("API URL not found for this company code.");
            }

            finalEndPoint = companyData.apiUrl.toLowerCase();
          } catch (error) {
            throw new Error("Could not fetch API URL. Please verify company code.");
          } finally {
            setBtnLoading(false);
          }

        } else {
             // ✅ Case 2: Treat as URL
             let url = input.toLowerCase();

             // Auto-add https if missing
             if (!/^https?:\/\//i.test(url)) {
                 url = `https://${url}`;
             }

             // Basic URL validation
             try {
                 new URL(url);
             } catch {
                 throw new Error("Invalid URL format");
             }

             finalEndPoint = url;
        }
      }

      if (!finalEndPoint || finalEndPoint === "") throw new Error("API URI or Company Code is required");

      setConfigInput(finalEndPoint);

      await setStorage({ key: 'endPoint', value: finalEndPoint });
      if (setConfig) setConfig(finalEndPoint);
      setShowApiInput(false);
      setError('');
      autoLogin();
    } catch (error) {
      setError(error.message || error?.toString());
    } finally {
      // Ensure specific loadings are off if we fall through here (though btnLoading handled above in try/finally block for company code)
      // We don't need global loading=false here because we didn't set global loading=true at start of this fn
    }
  };

  const formHandle = async () => {
    setError('');
    setInputAnimation('');
    if (!data?.userName || !data?.password) {
      setError('Please enter valid credentials.');
      setInputAnimation('shake');
      return;
    }
    await handleLogin(data.userName, data.password, false);
  };

  const handleLogin = async (userName, password, isAutoLogin) => {
    setLoading(true);
    try {
      const response = await login({ userName, password });
      if (response?.status) {
        setError('');
        setInputAnimation('');

        await setStorage({ key: 'accessToken', value: String(response?.data?.accessToke) });
        await setStorage({ key: 'userId', value: String(response?.data?.id) });
        await setStorage({ key: 'userName', value: String(response?.data?.fullName) });
        
        const companyId = response?.data?.Company_Detials?.[0]?.id || '1';
        await setStorage({ key: 'companyId', value: String(companyId) });

        await setStorage({
          key: "appUser",
          value: JSON.stringify({
            id: response?.data?.id,
            fullName: response?.data?.fullName,
            companyId: companyId,
            imageUrl: response?.data?.imageUrl,
            email: response?.data.email,
            mobile: response?.data?.mobile,
            userType: 'staff'
          })
        });

        if (!isAutoLogin) {
          await setStorage({ key: 'savedUser', value: JSON.stringify({ userName, password }) });
        }

        if (setLogin) setLogin(response?.data?.fullName);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={color.primary} />
      </View>
    );
  }

  if (showApiInput) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <StatusBar style="dark" />
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={styles.inner}>
            <Animatable.Text animation="fadeIn" duration={1000} style={styles.title}>Set API Endpoint</Animatable.Text>

            <Text style={styles.instructions}>Please enter your company Code or API URL to continue</Text>

            <View style={[styles.otpContainer, { marginTop: 20 }]}>
              <TextInput
                style={[styles.otpInput, error ? styles.errorInput : null]}
                value={configInput}
                onChangeText={setConfigInput}
                placeholder="Enter Company Code or API URL"
                placeholderTextColor="grey"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {error ? <Text style={styles.errorText}>*{error}</Text> : null}

            <TouchableOpacity
              onPress={handleApiUrlSave}
              style={[styles.button, (loading || btnLoading) && { backgroundColor: '#ccc' }]}
              disabled={loading || btnLoading}
            >
              {(loading || btnLoading) ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.buttonText}>Save API URL</Text>}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setShowApiInput(false)}
            >
              <Text style={styles.backButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={styles.inner}>
            <Image source={require('../assets/icon.png')} style={styles.logo} />
            <Animatable.Text animation="fadeIn" duration={1000} style={styles.title}>
              Login to AuxChat
            </Animatable.Text>

            <Animatable.View 
              style={[styles.inputWrapper, error && { borderColor: '#F01919' }]} 
              animation={inputAnimation} 
              iterationCount={1} 
              onAnimationEnd={() => setInputAnimation('')}
            >
              <TextInput
                style={styles.input}
                onChangeText={(value) => setData((prev) => ({ ...prev, userName: value }))}
                placeholder="User Name or Mobile No."
                placeholderTextColor="grey"
                keyboardType="default"
              />

              <TextInput
                style={styles.input}
                onChangeText={(value) => setData((prev) => ({ ...prev, password: value }))}
                placeholder="Enter your password"
                placeholderTextColor="grey"
                secureTextEntry={true}
              />
            </Animatable.View>

            {error ? <Text style={styles.errorText}>*{error}</Text> : null}

            <TouchableOpacity
              onPress={formHandle}
              style={[styles.button, btnLoading && { backgroundColor: '#ccc' }]}
              disabled={btnLoading || loading}
            >
              {btnLoading ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.buttonText}>Login</Text>}
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setShowApiInput(true)}
              style={styles.apiUrlButton}
            >
              <Text style={styles.apiUrlButtonText}>Configuration</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: color.primary,
    marginTop: 20,
  },
  instructions: {
    color: color.text,
    textAlign: 'center',
    marginTop: 10,
    width: '100%',
  },
  inputWrapper: {
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 15,
    marginTop: 15,
    width: '100%',
    color: '#000'
  },
  button: {
    width: '100%',
    borderRadius: 25,
    marginTop: 30,
    paddingVertical: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: color.primary
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
    width: '100%',
  },
  otpContainer: {
    width: '100%',
  },
  otpInput: {
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    color: color.text,
  },
  errorInput: {
    borderColor: '#F01919',
  },
  apiUrlButton: {
    marginTop: 20,
  },
  apiUrlButtonText: {
    color: color.primary,
    textDecorationLine: 'underline',
  },
  backButton: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  backButtonText: {
    color: color.primary,
    fontSize: 16,
  },
  logo: {
    width: 100,
    height: 100,
  },
});
