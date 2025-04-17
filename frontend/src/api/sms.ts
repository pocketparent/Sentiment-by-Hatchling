import axiosInstance from '../api/axios/axiosInstance';

const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/sms`
  : '/api/sms';

/**
 * Send verification code to phone number
 * @param phoneNumber Phone number to verify (format: +1XXXXXXXXXX)
 * @param userId User ID to associate with the phone number
 * @returns Response data with success status and message
 */
export async function sendVerificationCode(phoneNumber: string, userId: string) {
  try {
    console.log('📤 Sending verification code to', phoneNumber);
    
    const response = await axiosInstance.post(`${API_BASE}/verify`, {
      phone_number: phoneNumber,
      user_id: userId
    });
    
    console.log('✅ Verification code sent successfully');
    return response.data;
  } catch (error: any) {
    console.error('❌ Error sending verification code:', error);
    throw {
      message: error.response?.data?.message || 'Failed to send verification code',
      status: error.response?.status || 500
    };
  }
}

/**
 * Confirm verification code
 * @param phoneNumber Phone number being verified (format: +1XXXXXXXXXX)
 * @param code Verification code to confirm
 * @param userId User ID to associate with the phone number
 * @returns Response data with success status and message
 */
export async function confirmVerificationCode(phoneNumber: string, code: string, userId: string) {
  try {
    console.log('🔍 Confirming verification code for', phoneNumber);
    
    const response = await axiosInstance.post(`${API_BASE}/confirm`, {
      phone_number: phoneNumber,
      code,
      user_id: userId
    });
    
    console.log('✅ Verification code confirmed successfully');
    return response.data;
  } catch (error: any) {
    console.error('❌ Error confirming verification code:', error);
    throw {
      message: error.response?.data?.message || 'Failed to confirm verification code',
      status: error.response?.status || 500
    };
  }
}

/**
 * Test SMS functionality by sending a test message
 * @param phoneNumber Phone number to simulate as sender
 * @param message Text content of the SMS
 * @returns Response data with test result
 */
export async function testSMS(phoneNumber: string, message: string) {
  try {
    console.log('🧪 Testing SMS functionality with', phoneNumber);
    
    const response = await axiosInstance.post(`${API_BASE}/test`, {
      phone_number: phoneNumber,
      message
    });
    
    console.log('✅ SMS test completed successfully');
    return response.data;
  } catch (error: any) {
    console.error('❌ Error testing SMS:', error);
    throw {
      message: error.response?.data?.message || 'Failed to test SMS',
      status: error.response?.status || 500
    };
  }
}
