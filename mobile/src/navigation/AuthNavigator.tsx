import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/types';

// LoginScreen is the first screen — import eagerly so it renders immediately.
// Register and ForgotPassword are lazy (user navigates to them).
import LoginScreen from '@/features/auth/screens/LoginScreen';
const RegisterScreen      = React.lazy(() => import('@/features/auth/screens/RegisterScreen'));
const ForgotPasswordScreen = React.lazy(() => import('@/features/auth/screens/ForgotPasswordScreen'));

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Login"          component={LoginScreen} />
      <Stack.Screen name="Register"       component={RegisterScreen as React.ComponentType} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen as React.ComponentType} />
    </Stack.Navigator>
  );
}
