import axios from 'axios';

export async function createZarinpalPayment(params: {
  amount: number;
  description: string;
  callbackUrl: string;
}) {

  console.log(
    process.env.ZARINPAL_MERCHANT_ID
  );

  try {

    const response = await axios.post(
      'https://payment.zarinpal.com/pg/v4/payment/request.json',
      {
        merchant_id:
          process.env.ZARINPAL_MERCHANT_ID,

        amount: params.amount,
        description: params.description,
        callback_url: params.callbackUrl,
        currency: 'IRT',
      }
    );

    return response.data;

  } catch (error: any) {

    console.log(
      error.response?.data
    );

    throw error;

  }
}